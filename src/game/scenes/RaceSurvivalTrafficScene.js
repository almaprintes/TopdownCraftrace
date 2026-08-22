import { RaceScene as CurrentRaceScene } from './RaceKartingCanariasSurfaceFixScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function pt(raw){
  if(Array.isArray(raw))return {x:Number(raw[0]),y:Number(raw[1])};
  return {x:Number(raw?.x),y:Number(raw?.y)};
}

function wrappedGap(ahead,behind){
  let gap=Number(ahead)-Number(behind);
  while(gap<-.5)gap+=1;
  while(gap>.5)gap-=1;
  return gap;
}

export class RaceScene extends CurrentRaceScene {
  _buildSurvivalAiLine(){
    const raw=super._survivalCenterline?.()||[];
    const source=raw.map(pt).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(source.length<4){this._survivalAiLine=null;return;}

    const cumulative=[0];
    let total=0;
    for(let i=0;i<source.length;i++){
      const a=source[i],b=source[(i+1)%source.length];
      total+=Math.hypot(b.x-a.x,b.y-a.y);
      cumulative.push(total);
    }
    if(total<100){this._survivalAiLine=null;return;}

    const trackW=Math.max(80,Number(this.track?.meta?.trackWidth||this.track?.trackWidth||140));
    const spacing=clamp(trackW*.085,8,13);
    const count=Math.max(48,Math.round(total/spacing));
    const uniform=[];
    let seg=0;
    for(let k=0;k<count;k++){
      const d=k*total/count;
      while(seg<source.length-1&&cumulative[seg+1]<d)seg++;
      const a=source[seg],b=source[(seg+1)%source.length];
      const span=Math.max(.001,cumulative[seg+1]-cumulative[seg]);
      const t=clamp((d-cumulative[seg])/span,0,1);
      uniform.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    }

    // Filtro corto y conservador: elimina dientes de pocos píxeles, pero mezcla
    // con la muestra original para no recortar horquillas ni abandonar la pista.
    const smooth=uniform.map((p,i)=>{
      const p2=uniform[(i-2+count)%count],p1=uniform[(i-1+count)%count];
      const n1=uniform[(i+1)%count],n2=uniform[(i+2)%count];
      const ax=(p2.x+2*p1.x+4*p.x+2*n1.x+n2.x)/10;
      const ay=(p2.y+2*p1.y+4*p.y+2*n1.y+n2.y)/10;
      return{x:p.x*.38+ax*.62,y:p.y*.38+ay*.62};
    });
    this._survivalAiLine=smooth;
  }

  _survivalPathPoint(progress,lane=0){
    const line=this._survivalAiLine;
    if(!Array.isArray(line)||line.length<4)return super._survivalPathPoint(progress,lane);

    const n=line.length;
    const logical=Number(progress)+Number(this._survivalPathOffset||0);
    const f=(((logical%1)+1)%1)*n;
    const i=Math.floor(f)%n,t=f-Math.floor(f);
    const p0=line[(i-1+n)%n],p1=line[i],p2=line[(i+1)%n],p3=line[(i+2)%n];
    const t2=t*t,t3=t2*t;
    const x=.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
    const y=.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
    const dx=.5*((-p0.x+p2.x)+2*(2*p0.x-5*p1.x+4*p2.x-p3.x)*t+3*(-p0.x+3*p1.x-3*p2.x+p3.x)*t2);
    const dy=.5*((-p0.y+p2.y)+2*(2*p0.y-5*p1.y+4*p2.y-p3.y)*t+3*(-p0.y+3*p1.y-3*p2.y+p3.y)*t2);
    const len=Math.max(.001,Math.hypot(dx,dy));
    return{x:x-dy/len*lane,y:y+dx/len*lane,r:Math.atan2(dy,dx)};
  }

  _initSurvival(){
    this._buildSurvivalAiLine();
    super._initSurvival();

    const centerline=this._survivalCenterline?.()||[];
    let trackLength=0;
    for(let i=0;i<centerline.length;i++){
      const a=pt(centerline[i]),b=pt(centerline[(i+1)%centerline.length]);
      if([a.x,a.y,b.x,b.y].every(Number.isFinite))trackLength+=Math.hypot(b.x-a.x,b.y-a.y);
    }
    trackLength=Math.max(500,trackLength);

    for(const b of this._survivalBots||[]){
      const trackW=Math.max(80,Number(b.trackW||this.track?.meta?.trackWidth||140));
      const envelope=Math.max(18,trackW*.32);
      const initial=Number(b.baseLane||0);

      // Cada rival conserva una personalidad y una línea preferida propias.
      b._trafficTrackLength=trackLength;
      b._trafficEnvelope=envelope;
      b._trafficPreferred=clamp(initial+(Math.random()-.5)*envelope*.34,-envelope,envelope);
      b._trafficWanderTarget=b._trafficPreferred;
      b._trafficNextChoice=2+Math.random()*4;
      b._trafficLane=initial;
      b._trafficLaneVelocity=0;
      b._trafficSpeedScale=1;
      b._trafficPassUntil=0;
      b._trafficPassTarget=initial;
      b._trafficSide=(Math.sign(initial)||((Math.random()<.5)?-1:1));
      b._trafficTemper=.82+Math.random()*.28;

      // Los saltos aleatorios antiguos movían el coche lateralmente de golpe.
      // La variedad pasa a depender de decisiones continuas de línea y tráfico.
      b.nextMistakeCheck=Infinity;
      b.mistakeUntil=0;
      b.mistakeLane=0;
      b.mistakeLaneTarget=0;
    }
  }

  _trafficPlayerState(){
    if(!this.carBody?.scene)return null;
    const x=Number(this.carBody.x),y=Number(this.carBody.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    const raw=this._survivalCenterline?.()||[];
    if(raw.length<2)return null;

    let bestD2=Infinity,bestLane=0;
    for(let i=0;i<raw.length;i++){
      const a=pt(raw[i]),b=pt(raw[(i+1)%raw.length]);
      if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(b.x)||!Number.isFinite(b.y))continue;
      const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;if(l2<1e-6)continue;
      const t=clamp(((x-a.x)*vx+(y-a.y)*vy)/l2,0,1);
      const qx=a.x+vx*t,qy=a.y+vy*t,dx=x-qx,dy=y-qy,d2=dx*dx+dy*dy;
      if(d2<bestD2){
        bestD2=d2;
        const len=Math.sqrt(l2),nx=-vy/len,ny=vx/len;
        bestLane=dx*nx+dy*ny;
      }
    }
    return {
      id:'TÚ',
      progress:Number(this._survivalPlayerRaceDistance?.()||0),
      lane:bestLane,
      speedScale:1,
      player:true
    };
  }

  _trafficCandidateScore(candidate,me,entries,envelope){
    let score=Math.abs(candidate-Number(me._trafficPreferred||0))*.08;
    if(Math.abs(candidate)>envelope*.88)score+=12;
    for(const e of entries){
      if(e.bot===me)continue;
      const longitudinal=Math.abs(wrappedGap(e.progress,me.absProgress))*Number(me._trafficTrackLength||1000);
      const lateral=Math.abs(Number(e.lane||0)-candidate);
      if(longitudinal<105&&lateral<24)score+=(105-longitudinal)*.22+(24-lateral)*.75;
    }
    return score;
  }

  _applySurvivalTrafficAvoidance(deltaMs){
    const bots=(this._survivalBots||[]).filter(b=>b?.active);
    if(!this._survivalMode||!this._raceStarted||!bots.length)return [];

    const dt=clamp(Number(deltaMs||16.67)/1000,.001,.05);
    const now=Number(this.time?.now||performance.now())/1000;
    const player=this._trafficPlayerState();
    const entries=bots.map(b=>({
      id:b.id,
      progress:Number(b.absProgress||0),
      lane:Number(b._trafficLane??b.baseLane??0),
      speedScale:Number(b._trafficSpeedScale||1),
      bot:b
    }));
    if(player)entries.push(player);

    const saved=[];
    for(const b of bots){
      const trackLength=Number(b._trafficTrackLength||1000);
      const envelope=Number(b._trafficEnvelope||42);
      const meLane=Number(b._trafficLane||0);

      // Sin tráfico, cada piloto revisa lentamente su línea preferida. No existen
      // tres carriles discretos: cualquier offset dentro del ancho útil es válido.
      if(now>=Number(b._trafficNextChoice||0)){
        const change=envelope*(.10+Math.random()*.22)*(Math.random()<.5?-1:1);
        b._trafficWanderTarget=clamp(Number(b._trafficPreferred||0)+change,-envelope,envelope);
        b._trafficNextChoice=now+4+Math.random()*6;
      }

      let nearest=null;
      for(const e of entries){
        if(e.bot===b)continue;
        const gap01=wrappedGap(e.progress,b.absProgress);
        if(gap01<=0)continue;
        const gapPx=gap01*trackLength;
        if(gapPx>190)continue;
        const lateral=Math.abs(Number(e.lane||0)-meLane);
        if(lateral>34)continue;
        if(!nearest||gapPx<nearest.gapPx)nearest={...e,gapPx,lateral};
      }

      let laneTarget=Number(b._trafficWanderTarget||b._trafficPreferred||0);
      let desiredSpeed=1;

      if(nearest){
        const committed=now<Number(b._trafficPassUntil||0);
        if(!committed&&nearest.gapPx<150){
          const separation=clamp(24+Number(b._trafficTemper||1)*8,24,34);
          const left=clamp(Number(nearest.lane||0)-separation,-envelope,envelope);
          const right=clamp(Number(nearest.lane||0)+separation,-envelope,envelope);
          const leftScore=this._trafficCandidateScore(left,b,entries,envelope);
          const rightScore=this._trafficCandidateScore(right,b,entries,envelope);
          b._trafficPassTarget=leftScore<=rightScore?left:right;
          b._trafficSide=Math.sign(b._trafficPassTarget-Number(nearest.lane||0))||b._trafficSide||1;
          b._trafficPassUntil=now+1.8+Math.random()*1.4;
        }

        laneTarget=clamp(Number(b._trafficPassTarget||laneTarget),-envelope,envelope);

        // Modelo de seguimiento anticipativo: se levanta el acelerador en función
        // del espacio disponible, sin aplicar porcentajes instantáneos.
        const comfort=54+Number(b._trafficTemper||1)*18;
        const room=clamp((nearest.gapPx-20)/Math.max(1,comfort),0,1);
        const leaderScale=Number(nearest.speedScale||1);
        desiredSpeed=clamp(leaderScale*(.58+.42*room),.56,1);
        if(Math.abs(laneTarget-Number(nearest.lane||0))>24&&nearest.gapPx>38){
          desiredSpeed=Math.max(desiredSpeed,.93);
        }
      }else if(now>=Number(b._trafficPassUntil||0)){
        b._trafficPassTarget=laneTarget;
      }else{
        laneTarget=Number(b._trafficPassTarget||laneTarget);
      }

      // Dirección lateral con velocidad y aceleración limitadas. El coche describe
      // una transición curva en vez de interpolar rígidamente hacia otro carril.
      const laneError=laneTarget-meLane;
      const lateralAccel=clamp(laneError*5.2-Number(b._trafficLaneVelocity||0)*4.4,-90,90);
      b._trafficLaneVelocity=clamp(Number(b._trafficLaneVelocity||0)+lateralAccel*dt,-34,34);
      b._trafficLane=clamp(meLane+b._trafficLaneVelocity*dt,-envelope,envelope);

      // Aceleración y deceleración limitadas: nada de freno/acelerador binario.
      const speedResponse=desiredSpeed<Number(b._trafficSpeedScale||1)?.72:.38;
      const maxStep=speedResponse*dt;
      const speedDelta=clamp(desiredSpeed-Number(b._trafficSpeedScale||1),-maxStep,maxStep);
      b._trafficSpeedScale=clamp(Number(b._trafficSpeedScale||1)+speedDelta,.56,1.03);

      saved.push({b,targetRate:b.targetRate,baseLane:b.baseLane});
      b.baseLane=b._trafficLane;
      b.targetRate=Number(b.targetRate||0)*b._trafficSpeedScale;
    }
    return saved;
  }

  _restoreSurvivalTraffic(saved){
    for(const s of saved||[]){
      s.b.targetRate=s.targetRate;
      s.b.baseLane=Number(s.b._trafficLane||s.baseLane||0);
    }
  }

  _updateSurvivalBots(deltaMs){
    const saved=this._applySurvivalTrafficAvoidance(deltaMs);
    try{return super._updateSurvivalBots(deltaMs);}finally{this._restoreSurvivalTraffic(saved);}
  }
}
