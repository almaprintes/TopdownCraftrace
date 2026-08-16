import { RaceScene as CurrentRaceScene } from './RaceSurvivalCollisionScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>a+Math.random()*(b-a);

export class RaceScene extends CurrentRaceScene{
  _initSurvival(){
    super._initSurvival();
    if(!this._survivalMode||!this._survivalBots?.length)return;

    // Los bloqueos venían del collider CPU↔CPU: dos coches enfrentados por la
    // corrección de trazada podían quedarse empujándose mutuamente para siempre.
    // Conservamos colisión real jugador↔CPU, pero entre CPU usamos prevención
    // anticipada + separación de seguridad, para que nunca se atraviesen ni se atasquen.
    try{this._survivalBotCollider?.destroy?.();}catch{}
    this._survivalBotCollider=null;

    for(const b of this._survivalBots){
      b.avoidLane=0;
      b.avoidSpeed=1;
      b._gridLaunchBias=rand(.96,1.04);
      try{
        b.body?.setVelocity?.(0,0);
        b.body?.setBounce?.(0);
        b.body?.setDrag?.(0,0);
      }catch{}
    }
  }

  _trafficAvoidance(bot,targetR){
    const bx=Number(bot?.body?.x),by=Number(bot?.body?.y);
    if(!Number.isFinite(bx)||!Number.isFinite(by))return{lane:0,speed:1,blocked:false};

    const tx=Math.cos(targetR),ty=Math.sin(targetR),nx=-ty,ny=tx;
    const look=Math.max(105,bot.carLength*4.8);
    const laneZone=Math.max(26,bot.carWidth*1.7);
    let lanePush=0;
    let speed=1;
    let blocked=false;

    const inspect=(x,y,weight=1)=>{
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      const rx=x-bx,ry=y-by;
      const ahead=rx*tx+ry*ty;
      const side=rx*nx+ry*ny;
      const absSide=Math.abs(side);
      const dist=Math.hypot(rx,ry);

      if(ahead>0&&ahead<look&&absSide<laneZone){
        const danger=1-clamp(ahead/look,0,1);
        const preferred=(Math.abs(side)<3?bot.avoidSide:(side<=0?1:-1));
        lanePush+=preferred*danger*bot.trackW*.46*weight;
        speed=Math.min(speed,clamp(.20+ahead/look*.95,.22,1));
        if(ahead<bot.carLength*1.9)blocked=true;
      }

      // Burbuja lateral: abrir espacio mucho antes del contacto.
      const bubble=Math.max(36,bot.carWidth*2.15);
      if(dist<bubble&&Math.abs(ahead)<bot.carLength*1.8){
        const danger=1-clamp(dist/bubble,0,1);
        const preferred=side<=0?1:-1;
        lanePush+=preferred*danger*bot.trackW*.40*weight;
        speed=Math.min(speed,.66);
      }
    };

    inspect(Number(this.carBody?.x),Number(this.carBody?.y),1.35);
    for(const other of this._survivalBots){
      if(other===bot||!other.active||!other.body?.active)continue;
      inspect(Number(other.body.x),Number(other.body.y),1);
    }

    return{
      lane:clamp(lanePush,-bot.trackW*.42,bot.trackW*.42),
      speed:clamp(speed,.18,1),
      blocked
    };
  }

  _updateSurvivalBots(deltaMs){
    if(!this._survivalMode||!this._survivalBots?.length||this._survivalFinished)return;

    if(!this._raceStarted){
      for(const b of this._survivalBots){
        try{b.body?.setVelocity?.(0,0);}catch{}
        if(b.sprite?.scene&&b.body){b.sprite.setPosition(b.body.x,b.body.y);}
      }
      if(this._survivalHud?._state?.scene)this._survivalHud._state.setText('PARRILLA · esperando semáforo');
      return;
    }

    if(!this._survivalRaceWasStarted){
      this._survivalRaceWasStarted=true;
      this._survivalRound=0;
      this._survivalStartPerf=performance.now();
      const px=Number(this.carBody?.x),py=Number(this.carBody?.y);
      this._survivalPlayer={armed:false,completedLaps:0,distanceSinceFinish:0,prevX:px,prevY:py};
    }

    const dt=Math.min(.05,Math.max(0,Number(deltaMs)||0)/1000);
    const elapsed=Math.max(0,(performance.now()-this._survivalStartPerf)/1000);
    const gate=this._survivalFinishGate();
    let validCross=false;

    // Jugador: misma lógica de meta real que ya estaba validada.
    const ps=this._survivalPlayer;
    const px=Number(this.carBody?.x),py=Number(this.carBody?.y);
    const pfrac=this._survivalNearestPathProgress(px,py),prevFrac=Number(ps._lastFrac);
    if(Number.isFinite(prevFrac)){
      let d=pfrac-prevFrac;if(d<-.5)d+=1;if(d>.5)d-=1;
      if(d>0)ps.distanceSinceFinish+=d;
    }
    ps._lastFrac=pfrac;
    if(gate&&Number.isFinite(ps.prevX)&&Number.isFinite(ps.prevY)&&this._segmentHitsFinish?.(ps.prevX,ps.prevY,px,py)){
      validCross=this._registerFinishCross(ps)||validCross;
    }else if(gate&&Number.isFinite(ps.prevX)&&Number.isFinite(ps.prevY)){
      // Fallback local por si la clase base no expone helper.
      const den=(px-ps.prevX)*(gate.by-gate.ay)-(py-ps.prevY)*(gate.bx-gate.ax);
      if(Math.abs(den)>1e-8){
        const qx=gate.ax-ps.prevX,qy=gate.ay-ps.prevY;
        const t=(qx*(gate.by-gate.ay)-qy*(gate.bx-gate.ax))/den;
        const u=(qx*(py-ps.prevY)-qy*(px-ps.prevX))/den;
        if(t>=0&&t<=1&&u>=0&&u<=1)validCross=this._registerFinishCross(ps)||validCross;
      }
    }
    ps.prevX=px;ps.prevY=py;

    // Primero calculamos decisiones, luego movemos. Así ningún CPU puede quedarse
    // bloqueado porque otro haya sido actualizado medio frame antes.
    const plans=[];
    for(const b of this._survivalBots){
      if(!b.active||!b.body?.active)continue;

      if(elapsed>=b.nextPaceChange){b.paceTarget=rand(.94,1.06);b.nextPaceChange=elapsed+rand(1.8,5);}
      b.paceFactor+=(b.paceTarget-b.paceFactor)*clamp(dt*.8,0,1);

      const lapNow=Math.max(0,Math.floor(Number(b.absProgress)||0));
      if(lapNow!==b.lastLapSeen){
        b.lastLapSeen=lapNow;
        b.lapFactor=rand(.94,1.06);
        b.linePhase+=rand(-.7,.7);
        b.lineAmp=clamp(b.lineAmp*rand(.82,1.18),2,Math.max(3,b.trackW*.13));
      }

      if(elapsed>=b.nextMistakeCheck&&elapsed>=b.mistakeUntil){
        const dirt=this._survivalSurfaceId()==='DIRT';
        if(Math.random()<(dirt?.16:.09)){
          b.mistakeUntil=elapsed+rand(.55,1.45);
          b.mistakeSlow=rand(.58,.82);
          b.mistakeLane=(Math.random()<.5?-1:1)*b.trackW*rand(.12,.34);
        }
        b.nextMistakeCheck=elapsed+rand(2.5,5.8);
      }

      const mistake=elapsed<b.mistakeUntil;
      if(!mistake&&Math.abs(b.mistakeLane)>.05)b.mistakeLane*=Math.pow(.10,dt);

      const guide=this._survivalPathPoint(b.absProgress,b.baseLane);
      if(!guide)continue;
      const traffic=this._trafficAvoidance(b,guide.r);
      b.avoidLane+=(traffic.lane-b.avoidLane)*clamp(dt*8,0,1);
      b.avoidSpeed+=(traffic.speed-b.avoidSpeed)*clamp(dt*8,0,1);

      const local=Math.max(0,elapsed-b.launchDelay);
      const launch01=clamp(local/1.55,0,1);
      const pace=b.paceFactor*b.lapFactor*b._gridLaunchBias*(mistake?b.mistakeSlow:1);
      const desired=b.targetRate*pace*(.34+.66*(1-Math.pow(1-launch01,2)))*b.avoidSpeed;

      // Nunca cero: si hay tráfico, reduce y cambia de carril, pero sigue rodando.
      const minRate=b.targetRate*(traffic.blocked?.12:.22);
      const targetRate=Math.max(minRate,desired);
      b.lapRate+=(targetRate-b.lapRate)*clamp(dt*3.2,0,1);
      b.lapRate=Math.max(b.targetRate*.10,b.lapRate);

      let nextProgress=b.absProgress+b.lapRate*dt;
      const natural=b.baseLane+Math.sin((nextProgress*18+b.linePhase)*b.lineFreq)*b.lineAmp;
      const maxLane=Math.max(b.carWidth,b.trackW*.5-b.carWidth*.82);
      const lane=clamp(natural+b.mistakeLane+b.avoidLane,-maxLane,maxLane);
      let target=this._survivalPathPoint(nextProgress,lane);
      if(!target)continue;

      // Barrera preventiva final: si el punto propuesto entra en la burbuja de otro CPU,
      // el seguidor no atraviesa; pierde unos centímetros y prueba el hueco lateral.
      const safe=Math.max(b.carWidth*1.22,18);
      for(const other of this._survivalBots){
        if(other===b||!other.active||!other.body?.active)continue;
        const ox=Number(other.body.x),oy=Number(other.body.y);
        if(Math.hypot(target.x-ox,target.y-oy)<safe){
          nextProgress=Math.max(b.absProgress,nextProgress-b.targetRate*dt*.72);
          const side=(target.x-ox)*(-Math.sin(target.r))+(target.y-oy)*Math.cos(target.r);
          const escape=clamp(lane+(side<=0?1:-1)*b.trackW*.18,-maxLane,maxLane);
          target=this._survivalPathPoint(nextProgress,escape)||target;
          break;
        }
      }

      plans.push({b,nextProgress,target});
    }

    for(const {b,nextProgress,target} of plans){
      const oldX=Number(b.body.x),oldY=Number(b.body.y);
      b.absProgress=nextProgress;

      // Movimiento kinemático garantizado. El collider jugador↔CPU sigue activo,
      // pero los CPU no dependen del solver para poder avanzar.
      b.body.setPosition(target.x,target.y);
      b.body.setVelocity(0,0);
      b.body.rotation=target.r;
      b.distanceSinceFinish+=Math.max(0,b.lapRate*dt);

      if(gate&&Number.isFinite(b.prevX)&&Number.isFinite(b.prevY)){
        const ax=b.prevX,ay=b.prevY,bx=target.x,by=target.y;
        const den=(bx-ax)*(gate.by-gate.ay)-(by-ay)*(gate.bx-gate.ax);
        if(Math.abs(den)>1e-8){
          const qx=gate.ax-ax,qy=gate.ay-ay;
          const t=(qx*(gate.by-gate.ay)-qy*(gate.bx-gate.ax))/den;
          const u=(qx*(by-ay)-qy*(bx-ax))/den;
          if(t>=0&&t<=1&&u>=0&&u<=1)validCross=this._registerFinishCross(b)||validCross;
        }
      }
      b.prevX=target.x;b.prevY=target.y;
      b._lastFrac=this._survivalNearestPathProgress(target.x,target.y);
      b.sprite.setPosition(target.x,target.y);
      b.sprite.rotation=target.r+Number(this._carVisualRotOffset||0);

      // Mantener body/sprite sincronizados incluso tras un contacto del jugador.
      if(!Number.isFinite(oldX)||!Number.isFinite(oldY))b.body.setPosition(target.x,target.y);
    }

    if(validCross)this._tryCloseSurvivalRound();
    if(this._survivalFinished)return;

    const ranked=this._survivalEntries();
    if(this._survivalHud?._state?.scene){
      const idx=ranked.findIndex(e=>e.player),pos=idx<0?ranked.length+1:idx+1,targetLap=this._survivalRound+1;
      const racers=this._survivalRacers();
      const crossed=racers.filter(r=>Number(r.state.completedLaps||0)>=targetLap).length;
      const need=Math.max(1,racers.length-1);
      this._survivalHud._title?.setText?.(`⚡ SUPERVIVENCIA · ${ranked.length} COCHES`);
      this._survivalHud._state.setText(`POSICIÓN ${pos}/${ranked.length} · meta ${crossed}/${need} · último fuera al penúltimo paso`);
    }
  }
}
