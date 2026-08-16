import { RaceScene as CurrentRaceScene } from './RaceSurvivalModeScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>a+Math.random()*(b-a);

function visualCarSprite(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>o?.visible!==false&&o?.texture?.key&&o.texture.key!=='__BODY__'&&scene.textures?.exists?.(o.texture.key))||null;
}
function pathLength(cl){
  if(!Array.isArray(cl)||cl.length<2)return 0;
  let total=0;
  for(let i=0;i<cl.length;i++){
    const a=cl[i],b=cl[(i+1)%cl.length];
    const ax=Number(a?.x??a?.[0]),ay=Number(a?.y??a?.[1]),bx=Number(b?.x??b?.[0]),by=Number(b?.y??b?.[1]);
    if([ax,ay,bx,by].every(Number.isFinite))total+=Math.hypot(bx-ax,by-ay);
  }
  return total;
}
function segIntersect(ax,ay,bx,by,cx,cy,dx,dy){
  const rX=bx-ax,rY=by-ay,sX=dx-cx,sY=dy-cy,den=rX*sY-rY*sX;
  if(Math.abs(den)<1e-8)return false;
  const qpx=cx-ax,qpy=cy-ay,t=(qpx*sY-qpy*sX)/den,u=(qpx*rY-qpy*rX)/den;
  return t>=0&&t<=1&&u>=0&&u<=1;
}

export class RaceScene extends CurrentRaceScene{
  _initSurvival(){
    if(!this._survivalMode||this._survivalBots.length)return;
    const visual=visualCarSprite(this),cl=this._survivalCenterline();
    if(!visual||cl.length<2||!this.carBody)return;

    const tex=visual.texture.key;
    this._survivalPathOffset=this._survivalFindFinishOffset();
    const surfaceId=this._survivalSurfaceId();
    const playerSpec=CAR_SPECS?.[this.carId]||CAR_SPECS?.[this.selectedCarId]||{};
    const surface=resolveVehicleSurface(playerSpec,surfaceId);
    const lenPx=Math.max(100,pathLength(cl));
    const playerMax=Math.max(120,Number(this.maxFwd||this.carParams?.maxFwd||420));
    const bestMs=this._survivalPlayerBestLapMs();
    let baseLapSec;
    if(Number.isFinite(bestMs))baseLapSec=clamp(bestMs/1000,12,180);
    else{
      const surfacePace=clamp((surface.speedCapacity||1)*(surface.movingDriveCapacity||1),.42,1.02);
      baseLapSec=clamp(lenPx/Math.max(55,playerMax*surfacePace*.36),28,120);
    }

    const carWidth=Math.max(14,Number(visual.displayWidth||visual.width||28));
    const carLength=Math.max(24,Number(visual.displayHeight||visual.height||48));
    const trackW=Math.max(carWidth*5.2,Number(this.track?.meta?.trackWidth||this.track?.trackWidth||this.trackWidth||carWidth*7));
    const safeHalf=Math.max(carWidth*1.05,trackW*.5-carWidth*.88);
    const laneEdge=clamp(trackW*.36,carWidth*1.05,safeHalf);
    const frontGap=clamp(carLength*1.18,34,78);
    const rowGap=clamp(carLength*1.62,46,96);
    const stagger=clamp(carLength*.62,18,40);
    const lapMultipliers=[1.22,1.18,1.14,1.10,1.07];

    // Parrilla tipo F1: dos columnas abiertas, alternadas y con separación longitudinal clara.
    const slots=[
      {lane:-laneEdge,back:frontGap},
      {lane:+laneEdge,back:frontGap+stagger},
      {lane:-laneEdge,back:frontGap+rowGap},
      {lane:+laneEdge,back:frontGap+rowGap+stagger},
      {lane:-laneEdge,back:frontGap+rowGap*2},
      {lane:+laneEdge,back:frontGap+rowGap*2+stagger}
    ];

    const playerSlot=slots[0];
    const playerProgress=-playerSlot.back/lenPx;
    const pp=this._survivalPathPoint(playerProgress,playerSlot.lane);
    if(pp){
      try{
        this.carBody.setPosition(pp.x,pp.y);
        this.carBody.rotation=pp.r;
        this.carBody.setVelocity?.(0,0);
        if(this.carRig?.scene){
          this.carRig.setPosition(pp.x,pp.y);
          this.carRig.rotation=pp.r+Number(this._carVisualRotOffset||0);
        }
      }catch{}
    }

    this._survivalPhysicsGroup=this.physics.add.group({allowGravity:false,immovable:false});

    for(let i=0;i<5;i++){
      const slot=slots[i+1];
      const startProgress=-slot.back/lenPx;
      const p=this._survivalPathPoint(startProgress,slot.lane);
      if(!p)continue;

      const body=this.physics.add.sprite(p.x,p.y,'__BODY__');
      body.setVisible(false);
      body.setCircle(Math.max(8,Math.round(Math.min(carWidth,carLength)*.24)));
      body.setCollideWorldBounds(true);
      body.setBounce(.04);
      body.setDrag(0,0);
      body.rotation=p.r;
      body.setVelocity(0,0);
      body.setPushable?.(true);
      this._survivalPhysicsGroup.add(body);

      const sprite=this.add.image(p.x,p.y,tex)
        .setOrigin(visual.originX??.5,visual.originY??.5)
        .setDepth(Math.max(29,Number(this.carRig?.depth||30)-1));
      sprite.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));
      sprite.clearTint?.();
      sprite.setAlpha(1).setBlendMode('NORMAL');
      sprite.rotation=p.r+Number(this._carVisualRotOffset||0);
      try{this.uiCam?.ignore?.(sprite);}catch{}

      const targetRate=1/(baseLapSec*lapMultipliers[i]);
      this._survivalBots.push({
        id:`CPU ${i+1}`,body,sprite,absProgress:startProgress,lapRate:0,targetRate,
        lane:slot.lane,baseLane:slot.lane,active:true,launchDelay:i*.10,
        armed:false,completedLaps:0,distanceSinceFinish:0,prevX:p.x,prevY:p.y,_lastFrac:this._survivalNearestPathProgress(p.x,p.y),
        paceFactor:rand(.965,1.035),paceTarget:rand(.955,1.045),nextPaceChange:rand(1.8,4.5),
        lapFactor:rand(.95,1.05),linePhase:rand(0,Math.PI*2),lineFreq:rand(.65,1.35),lineAmp:rand(carWidth*.12,carWidth*.32),
        trackW,mistakeUntil:0,mistakeLane:0,mistakeSlow:1,nextMistakeCheck:rand(.8,2.2),lastLapSeen:0,
        lenPx,carWidth,carLength,avoidLane:0,avoidSpeed:1,avoidSide:(i%2===0?-1:1)
      });
    }

    // Colisión física como red de seguridad. La IA intenta evitar el contacto ANTES de llegar aquí.
    try{
      this._survivalPlayerCollider=this.physics.add.collider(this.carBody,this._survivalPhysicsGroup);
      this._survivalBotCollider=this.physics.add.collider(this._survivalPhysicsGroup,this._survivalPhysicsGroup);
    }catch{}

    this._createSurvivalHud();
  }

  _survivalBotRaceDistance(b){
    if(!b?.body)return Number(b?.absProgress)||0;
    const frac=this._survivalNearestPathProgress(Number(b.body.x),Number(b.body.y));
    if(!b.armed)return frac>.5?frac-1:frac;
    return Number(b.completedLaps||0)+frac;
  }

  _survivalEntries(){
    const arr=[{id:'TÚ',player:true,active:!this._survivalPlayerOut,raceDistance:this._survivalPlayerRaceDistance()}];
    for(const b of this._survivalBots)if(b.active)arr.push({...b,raceDistance:this._survivalBotRaceDistance(b)});
    return arr.filter(e=>e.active).sort((a,b)=>b.raceDistance-a.raceDistance);
  }

  _survivalTrafficFor(bot,targetR){
    const bx=Number(bot?.body?.x),by=Number(bot?.body?.y);
    if(!Number.isFinite(bx)||!Number.isFinite(by))return{lane:0,speed:1};
    const tx=Math.cos(targetR),ty=Math.sin(targetR),nx=-ty,ny=tx;
    const lookAhead=Math.max(bot.carLength*4.2,90);
    const sideZone=Math.max(bot.carWidth*1.25,24);
    let lanePush=0,speedFactor=1,nearestAhead=Infinity;

    const inspect=(x,y,weight=1)=>{
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      const rx=x-bx,ry=y-by;
      const ahead=rx*tx+ry*ty;
      const side=rx*nx+ry*ny;
      const absSide=Math.abs(side);
      const dist=Math.hypot(rx,ry);

      // Coche por delante: abrirse con decisión y levantar antes de tocarlo.
      if(ahead>0&&ahead<lookAhead&&absSide<sideZone*1.35){
        nearestAhead=Math.min(nearestAhead,ahead);
        const danger=1-clamp(ahead/lookAhead,0,1);
        const away=absSide<2?bot.avoidSide:(side<=0?1:-1);
        lanePush+=away*danger*bot.trackW*.34*weight;
        speedFactor=Math.min(speedFactor,clamp(.28+ahead/lookAhead*.82,.30,1));
      }

      // Contacto lateral o trayectoria convergente: apartarse, no empujar.
      const bubble=Math.max(bot.carWidth*1.7,30);
      if(dist<bubble&&Math.abs(ahead)<bot.carLength*1.5){
        const danger=1-clamp(dist/bubble,0,1);
        const away=side<=0?1:-1;
        lanePush+=away*danger*bot.trackW*.42*weight;
        speedFactor=Math.min(speedFactor,.72);
      }
    };

    inspect(Number(this.carBody?.x),Number(this.carBody?.y),1.25);
    for(const other of this._survivalBots){
      if(other===bot||!other.active||!other.body?.active)continue;
      inspect(Number(other.body.x),Number(other.body.y),1);
    }

    // Si hay atasco frontal, priorizar totalmente esquivar antes que acelerar.
    if(nearestAhead<bot.carLength*1.4)speedFactor=Math.min(speedFactor,.42);
    return{lane:clamp(lanePush,-bot.trackW*.38,bot.trackW*.38),speed:clamp(speedFactor,.28,1)};
  }

  _eliminateSpecific(racer){
    if(!racer||this._survivalFinished)return;
    if(racer.player){
      this._survivalPlayerOut=true;
      this._showSurvivalNotice('ELIMINADO','Has sido el último en llegar a meta','#ff667a',true);
      this._finishSurvival(false);
      return;
    }
    const bot=this._survivalBots.find(b=>b.id===racer.id);
    if(bot){
      bot.active=false;
      try{bot.body?.setVelocity?.(0,0);bot.body?.disableBody?.(true,true);}catch{}
      bot.sprite?.setVisible(false);
    }
    this._showSurvivalNotice(`${racer.id} ELIMINADO`,'Último coche pendiente de cruzar meta','#ffd76e');
    const remaining=this._survivalEntries();
    if(remaining.length===1)this._finishSurvival(Boolean(remaining[0].player));
  }

  _updateSurvivalBots(deltaMs){
    if(!this._survivalMode||!this._survivalBots.length||this._survivalFinished)return;
    if(!this._raceStarted){
      for(const b of this._survivalBots){try{b.body?.setVelocity?.(0,0);}catch{}}
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

    const gate=this._survivalFinishGate();
    const dt=Math.max(0,Number(deltaMs)||0)/1000;
    const elapsed=Math.max(0,(performance.now()-this._survivalStartPerf)/1000);
    let validCross=false;

    const ps=this._survivalPlayer,px=Number(this.carBody?.x),py=Number(this.carBody?.y),pfrac=this._survivalNearestPathProgress(px,py),prevFrac=Number(ps._lastFrac);
    if(Number.isFinite(prevFrac)){let d=pfrac-prevFrac;if(d<-.5)d+=1;if(d>.5)d-=1;if(d>0)ps.distanceSinceFinish+=d;}
    ps._lastFrac=pfrac;
    if(gate&&Number.isFinite(ps.prevX)&&Number.isFinite(ps.prevY)&&segIntersect(ps.prevX,ps.prevY,px,py,gate.ax,gate.ay,gate.bx,gate.by))validCross=this._registerFinishCross(ps)||validCross;
    ps.prevX=px;ps.prevY=py;

    for(const b of this._survivalBots){
      if(!b.active||!b.body?.active)continue;
      if(elapsed>=b.nextPaceChange){b.paceTarget=rand(.94,1.06);b.nextPaceChange=elapsed+rand(1.8,5);}
      b.paceFactor+=(b.paceTarget-b.paceFactor)*clamp(dt*.75,0,1);
      const lapNow=Math.max(0,Math.floor(Number(b.absProgress)||0));
      if(lapNow!==b.lastLapSeen){
        b.lastLapSeen=lapNow;b.lapFactor=rand(.94,1.06);b.linePhase+=rand(-.8,.8);
        b.lineAmp=clamp(b.lineAmp*rand(.78,1.22),2,Math.max(3,b.trackW*.13));
      }
      if(elapsed>=b.nextMistakeCheck&&elapsed>=b.mistakeUntil){
        const dirt=this._survivalSurfaceId()==='DIRT',chance=dirt?.18:.11;
        if(Math.random()<chance){
          b.mistakeUntil=elapsed+rand(.65,1.75);
          b.mistakeSlow=rand(.48,.78);
          const sign=Math.random()<.5?-1:1,severity=Math.random()<.28?rand(.36,.52):rand(.16,.30);
          b.mistakeLane=sign*b.trackW*severity;
        }
        b.nextMistakeCheck=elapsed+rand(2.2,5.5);
      }
      const makingMistake=elapsed<b.mistakeUntil;
      if(!makingMistake&&Math.abs(b.mistakeLane)>.05)b.mistakeLane*=Math.pow(.12,dt);
      const local=Math.max(0,elapsed-b.launchDelay),launch01=clamp(local/2.2,0,1);
      const pace=b.paceFactor*b.lapFactor*(makingMistake?b.mistakeSlow:1);
      const desiredRate=b.targetRate*pace*(.24+.76*(1-Math.pow(1-launch01,2)));
      b.lapRate+=(desiredRate-b.lapRate)*clamp(dt*(makingMistake?3.4:2.6),0,1);

      b.absProgress+=b.lapRate*dt;
      const guide=this._survivalPathPoint(b.absProgress,b.baseLane);
      if(!guide)continue;
      const traffic=this._survivalTrafficFor(b,guide.r);
      b.avoidLane+=(traffic.lane-b.avoidLane)*clamp(dt*7.5,0,1);
      b.avoidSpeed+=(traffic.speed-b.avoidSpeed)*clamp(dt*9,0,1);

      const naturalLane=b.baseLane+Math.sin((b.absProgress*18+b.linePhase)*b.lineFreq)*b.lineAmp;
      const maxLane=Math.max(b.carWidth, b.trackW*.5-b.carWidth*.72);
      const lane=clamp(naturalLane+b.mistakeLane+b.avoidLane,-maxLane,maxLane);
      const target=this._survivalPathPoint(b.absProgress,lane);
      if(!target)continue;

      const bx=Number(b.body.x),by=Number(b.body.y);
      const dx=target.x-bx,dy=target.y-by,dist=Math.max(.001,Math.hypot(dx,dy));
      const cruise=Math.max(28,b.lapRate*b.lenPx)*b.avoidSpeed;
      const tx=Math.cos(target.r),ty=Math.sin(target.r);
      const correction=clamp(dist*2.7,0,Math.max(20,cruise*.72));
      let vx=tx*cruise+(dx/dist)*correction;
      let vy=ty*cruise+(dy/dist)*correction;

      // Garantizar que un contacto no los deje muertos: conservar siempre intención de avance.
      const minForward=Math.max(18,cruise*.46);
      const forward=vx*tx+vy*ty;
      if(forward<minForward){vx+=tx*(minForward-forward);vy+=ty*(minForward-forward);}

      b.body.setVelocity(vx,vy);
      b.body.rotation=Math.atan2(vy,vx);

      const actualFrac=this._survivalNearestPathProgress(bx,by),prevActual=Number(b._lastFrac);
      if(Number.isFinite(prevActual)){
        let d=actualFrac-prevActual;if(d<-.5)d+=1;if(d>.5)d-=1;
        if(d>0)b.distanceSinceFinish+=d;
      }
      b._lastFrac=actualFrac;

      if(gate&&Number.isFinite(b.prevX)&&Number.isFinite(b.prevY)&&segIntersect(b.prevX,b.prevY,bx,by,gate.ax,gate.ay,gate.bx,gate.by))validCross=this._registerFinishCross(b)||validCross;
      b.prevX=bx;b.prevY=by;
      b.sprite.setPosition(bx,by);
      b.sprite.rotation=b.body.rotation+Number(this._carVisualRotOffset||0);
    }

    if(validCross)this._tryCloseSurvivalRound();
    if(this._survivalFinished)return;

    const ranked=this._survivalEntries();
    if(this._survivalHud?._state?.scene){
      const idx=ranked.findIndex(e=>e.player),pos=idx<0?ranked.length+1:idx+1,targetLap=this._survivalRound+1;
      const racers=this._survivalRacers(),crossed=racers.filter(r=>Number(r.state.completedLaps||0)>=targetLap).length,need=Math.max(1,racers.length-1);
      this._survivalHud._title?.setText?.(`⚡ SUPERVIVENCIA · ${ranked.length} COCHES`);
      this._survivalHud._state.setText(`POSICIÓN ${pos}/${ranked.length} · meta ${crossed}/${need} · último fuera al penúltimo paso`);
    }
  }

  _destroySurvival(){
    try{this._survivalPlayerCollider?.destroy?.();}catch{}
    try{this._survivalBotCollider?.destroy?.();}catch{}
    for(const b of this._survivalBots){
      try{b.body?.destroy?.();}catch{}
      try{b.sprite?.destroy?.();}catch{}
    }
    try{this._survivalPhysicsGroup?.clear?.(true,true);}catch{}
    this._survivalBots=[];
    try{this._survivalHud?.destroy?.(true);}catch{}
    try{this._survivalNotice?.destroy?.(true);}catch{}
    try{this._survivalResultDom?.remove?.();}catch{}
    this._survivalHud=null;this._survivalNotice=null;this._survivalResultDom=null;
    this._survivalPhysicsGroup=null;this._survivalPlayerCollider=null;this._survivalBotCollider=null;
  }
}
