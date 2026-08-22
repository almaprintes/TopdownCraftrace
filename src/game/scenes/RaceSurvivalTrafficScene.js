import { RaceScene as CurrentRaceScene } from './RaceKartingCanariasSurfaceFixScene.js';
import { readSurvivalAiRuntime, createSurvivalAiTelemetry } from '../ai/survivalAiRuntime.js';
import { buildTrackRacingLineModel } from '../ai/trackRacingLinePlanner.js';
import { buildTrackSpeedProfile } from '../ai/trackSpeedProfilePlanner.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrapAngle=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

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
    // Detectar vértices reales sobre la geometría ya depurada.
    const curvature=smooth.map((p,i)=>{
      const prev=smooth[(i-1+count)%count],next=smooth[(i+1)%count];
      const incoming=Math.atan2(p.y-prev.y,p.x-prev.x);
      const outgoing=Math.atan2(next.y-p.y,next.x-p.x);
      return wrapAngle(outgoing-incoming);
    });

    const candidates=[];
    for(let i=0;i<count;i++){
      const mag=Math.abs(curvature[i]);
      if(mag<.025)continue;
      let peak=true;
      for(let d=1;d<=3;d++){
        if(Math.abs(curvature[(i-d+count)%count])>mag||Math.abs(curvature[(i+d)%count])>mag){peak=false;break;}
      }
      if(peak)candidates.push({i,mag,sign:Math.sign(curvature[i])||1});
    }

    // Un vértice por curva: las pequeñas ondulaciones cercanas no crean curvas nuevas.
    const minPeakDistance=Math.max(6,Math.round(55/spacing));
    const selected=[];
    for(const candidate of candidates.sort((a,b)=>b.mag-a.mag)){
      const isolated=selected.every(other=>{
        const d=Math.abs(candidate.i-other.i);
        return Math.min(d,count-d)>=minPeakDistance;
      });
      if(isolated)selected.push(candidate);
    }

    const envelope=Math.max(18,trackW*.27);
    const anchors=[];
    const addAnchor=(index,value,weight)=>{
      anchors.push({index:(index%count+count)%count,value:clamp(value,-envelope,envelope),weight});
    };

    for(const corner of selected){
      const sign=corner.sign;
      let start=corner.i,end=corner.i;
      let quiet=0;
      for(let d=1;d<Math.min(count*.18,30);d++){
        const idx=(corner.i-d+count)%count,k=curvature[idx];
        if(Math.sign(k)===sign&&Math.abs(k)>.009){start=idx;quiet=0;}
        else if(++quiet>=2)break;
      }
      quiet=0;
      for(let d=1;d<Math.min(count*.18,30);d++){
        const idx=(corner.i+d)%count,k=curvature[idx];
        if(Math.sign(k)===sign&&Math.abs(k)>.009){end=idx;quiet=0;}
        else if(++quiet>=2)break;
      }

      const approach=Math.max(4,Math.round(65/spacing));
      const release=Math.max(4,Math.round(72/spacing));
      // Exterior de entrada -> interior en el vértice -> exterior de salida.
      addAnchor(start-approach,-sign*envelope*.60,1.2);
      addAnchor(corner.i,sign*envelope*.72,2.2);
      addAnchor(end+release,-sign*envelope*.58,1.15);
    }

    if(!anchors.length){this._survivalAiLine=smooth;return;}

    // Fusionar intenciones coincidentes, algo habitual en chicanes y enlazadas.
    const merged=new Map();
    for(const a of anchors){
      const m=merged.get(a.index)||{index:a.index,sum:0,weight:0};
      m.sum+=a.value*a.weight;m.weight+=a.weight;merged.set(a.index,m);
    }
    const ordered=[...merged.values()]
      .map(a=>({index:a.index,value:a.sum/Math.max(.001,a.weight)}))
      .sort((a,b)=>a.index-b.index);

    const offsets=new Array(count).fill(0);
    for(let k=0;k<ordered.length;k++){
      const a=ordered[k],b=ordered[(k+1)%ordered.length];
      let span=(b.index-a.index+count)%count;if(span===0)span=count;
      for(let d=0;d<=span;d++){
        const t=d/span;
        const eased=t*t*(3-2*t);
        offsets[(a.index+d)%count]=a.value+(b.value-a.value)*eased;
      }
    }

    // Continuidad de volante: filtrar el offset, no la pista.
    for(let pass=0;pass<2;pass++){
      const copy=offsets.slice();
      for(let i=0;i<count;i++){
        offsets[i]=(copy[(i-2+count)%count]+2*copy[(i-1+count)%count]+4*copy[i]+2*copy[(i+1)%count]+copy[(i+2)%count])/10;
      }
    }

    // Una horquilla no puede ordenar decenas de píxeles de desplazamiento en
    // pocas muestras. Limitar la pendiente lateral evita el latigazo de salida.
    const maxOffsetStep=Math.max(1.25,spacing*.18);
    for(let pass=0;pass<4;pass++){
      for(let i=1;i<count;i++)offsets[i]=clamp(offsets[i],offsets[i-1]-maxOffsetStep,offsets[i-1]+maxOffsetStep);
      for(let i=count-2;i>=0;i--)offsets[i]=clamp(offsets[i],offsets[i+1]-maxOffsetStep,offsets[i+1]+maxOffsetStep);
      const seam=(offsets[0]+offsets[count-1])*.5;
      offsets[0]=clamp(offsets[0],seam-maxOffsetStep*.5,seam+maxOffsetStep*.5);
      offsets[count-1]=clamp(offsets[count-1],seam-maxOffsetStep*.5,seam+maxOffsetStep*.5);
    }

    this._survivalAiLine=smooth.map((p,i)=>{
      const prev=smooth[(i-1+count)%count],next=smooth[(i+1)%count];
      const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.max(.001,Math.hypot(dx,dy));
      return{x:p.x-dy/len*offsets[i],y:p.y+dx/len*offsets[i]};
    });
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
    if(!this._survivalAiRuntime){
      this._survivalAiRuntime=readSurvivalAiRuntime();
      this._survivalAiTelemetry=createSurvivalAiTelemetry({
        mode:this._survivalAiRuntime.effective,
        requestedMode:this._survivalAiRuntime.requested,
        trackKey:this.trackKey||this.track?.meta?.key||null
      });
      if(this._survivalAiRuntime.requested!==this._survivalAiRuntime.effective){
        this._survivalAiTelemetry.pushEvent({
          time:0,type:'planner_fallback',requested:this._survivalAiRuntime.requested,
          effective:this._survivalAiRuntime.effective
        });
      }
    }
    // Fase 1: calcular el modelo nuevo para observación y validación. Todavía
    // no se entrega el control de los coches a esta trayectoria.
    this._survivalPlannerTrackModel=buildTrackRacingLineModel(this.track?.meta||this.track||{});
    this._survivalPlannerSpeedProfile=buildTrackSpeedProfile(this._survivalPlannerTrackModel);
    this._survivalAiTelemetry?.pushEvent?.({
      timeMs:Math.round(Number(this.time?.now||0)),
      type:'track_model',
      valid:Boolean(this._survivalPlannerTrackModel?.valid),
      reason:this._survivalPlannerTrackModel?.reason||null,
      metrics:this._survivalPlannerTrackModel?.metrics||{},
      speedProfileValid:Boolean(this._survivalPlannerSpeedProfile?.valid),
      speedProfileReason:this._survivalPlannerSpeedProfile?.reason||null,
      speedMetrics:this._survivalPlannerSpeedProfile?.metrics||{}
    });

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
      // La referencia cero ya es una trazada de competición calculada. La
      // personalidad solo añade variaciones pequeñas; no crea carriles paralelos.
      b._trafficPreferred=(Math.random()-.5)*envelope*.12;
      b._trafficWanderTarget=b._trafficPreferred;
      b.lineAmp=1.5+Math.random()*3.5;
      b.lineFreq=.45+Math.random()*.35;
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

  _recordSurvivalAiTelemetry(){
    const telemetry=this._survivalAiTelemetry;
    if(!telemetry||!this._survivalMode)return;
    const now=Number(this.time?.now||0);
    if(now<Number(this._survivalAiNextSample||0))return;
    this._survivalAiNextSample=now+120;

    for(const b of this._survivalBots||[]){
      if(!b?.active||!b.sprite?.scene)continue;
      telemetry.pushSample({
        timeMs:Math.round(now),
        botId:b.id,
        x:Number(b.sprite.x.toFixed?.(2)??b.sprite.x),
        y:Number(b.sprite.y.toFixed?.(2)??b.sprite.y),
        heading:Number((b.sprite.rotation||0).toFixed?.(4)??b.sprite.rotation),
        progress:Number((b.absProgress||0).toFixed?.(6)??b.absProgress),
        lapRate:Number((b.lapRate||0).toFixed?.(6)??b.lapRate),
        targetRate:Number((b.targetRate||0).toFixed?.(6)??b.targetRate),
        lane:Number((b._trafficLane||0).toFixed?.(3)??b._trafficLane),
        lateralSpeed:Number((b._trafficLaneVelocity||0).toFixed?.(3)??b._trafficLaneVelocity),
        speedScale:Number((b._trafficSpeedScale||1).toFixed?.(4)??b._trafficSpeedScale),
        cornerSeverity:Number(this._trafficCornerSeverity(b.absProgress).toFixed(4)),
        passCommitted:Number(this.time?.now||0)/1000<Number(b._trafficPassUntil||0)
      });
    }
  }

  _updateSurvivalAiDebugOverlay(){
    const enabled=Boolean(this._survivalAiRuntime?.debug&&this._survivalMode);
    if(!enabled){
      try{this._survivalAiDebugGfx?.destroy?.();}catch{}
      this._survivalAiDebugGfx=null;
      return;
    }

    let g=this._survivalAiDebugGfx;
    if(!g?.scene){
      g=this.add.graphics().setDepth(58);
      try{this.uiCam?.ignore?.(g);}catch{}
      this._survivalAiDebugGfx=g;
    }
    g.clear();

    const modelLine=this._survivalPlannerTrackModel?.racingLine;
    if(Array.isArray(modelLine)&&modelLine.length>2){
      g.lineStyle(3,0xffd45f,.72);
      g.beginPath();
      modelLine.forEach((p,i)=>{if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);});
      g.lineTo(modelLine[0].x,modelLine[0].y);
      g.strokePath();
    }

    const line=this._survivalAiLine;
    if(Array.isArray(line)&&line.length>2){
      g.lineStyle(2,0x62ffd1,.30);
      g.beginPath();
      line.forEach((p,i)=>{if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);});
      g.lineTo(line[0].x,line[0].y);
      g.strokePath();
    }

    const colors=[0xffb347,0x66d9ff,0xff78c8,0xb6ff6a,0xc69cff];
    for(let bi=0;bi<(this._survivalBots||[]).length;bi++){
      const b=this._survivalBots[bi];if(!b?.active)continue;
      const horizon=clamp(Math.max(.035,Number(b.lapRate||0)*2.2),.035,.12);
      g.lineStyle(2,colors[bi%colors.length],.82);
      g.beginPath();
      for(let i=0;i<=18;i++){
        const p=this._survivalPathPoint(Number(b.absProgress||0)+horizon*i/18,Number(b._trafficLane||0));
        if(!p)continue;
        if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
      }
      g.strokePath();
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

  _trafficCornerSeverity(progress){
    const before=this._survivalPathPoint(Number(progress)-.010,0);
    const after=this._survivalPathPoint(Number(progress)+.010,0);
    if(!before||!after)return 0;
    return Math.abs(wrapAngle(Number(after.r||0)-Number(before.r||0)));
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
        const change=envelope*(.035+Math.random()*.085)*(Math.random()<.5?-1:1);
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
      const cornerSeverity=this._trafficCornerSeverity(b.absProgress);
      const sharpCorner=cornerSeverity>.34;

      // En horquillas se termina la maniobra antes del vértice. Intentar abrir
      // además un adelantamiento lateral generaba el desplazamiento exagerado.
      if(sharpCorner){
        b._trafficPassUntil=0;
        b._trafficPassTarget=Number(b._trafficPreferred||0);
      }

      if(nearest){
        const committed=now<Number(b._trafficPassUntil||0);
        if(!sharpCorner&&!committed&&nearest.gapPx<150){
          const separation=clamp(24+Number(b._trafficTemper||1)*8,24,34);
          const left=clamp(Number(nearest.lane||0)-separation,-envelope,envelope);
          const right=clamp(Number(nearest.lane||0)+separation,-envelope,envelope);
          const leftScore=this._trafficCandidateScore(left,b,entries,envelope);
          const rightScore=this._trafficCandidateScore(right,b,entries,envelope);
          b._trafficPassTarget=leftScore<=rightScore?left:right;
          b._trafficSide=Math.sign(b._trafficPassTarget-Number(nearest.lane||0))||b._trafficSide||1;
          b._trafficPassUntil=now+1.8+Math.random()*1.4;
          this._survivalAiTelemetry?.pushEvent?.({
            timeMs:Math.round(Number(this.time?.now||0)),
            type:'pass_commit',botId:b.id,targetLane:Number(b._trafficPassTarget.toFixed(2)),
            gapPx:Number(nearest.gapPx.toFixed(1))
          });
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
      const lateralAccel=clamp(laneError*4.6-Number(b._trafficLaneVelocity||0)*4.8,-58,58);
      b._trafficLaneVelocity=clamp(Number(b._trafficLaneVelocity||0)+lateralAccel*dt,-22,22);
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
    let result;
    try{result=super._updateSurvivalBots(deltaMs);}
    finally{this._restoreSurvivalTraffic(saved);}
    this._recordSurvivalAiTelemetry();
    this._updateSurvivalAiDebugOverlay();
    return result;
  }

  _destroySurvival(){
    try{this._survivalAiDebugGfx?.destroy?.();}catch{}
    this._survivalAiDebugGfx=null;
    try{
      if(window.__TDR_SURVIVAL_AI__===this._survivalAiTelemetry?.state){
        window.__TDR_SURVIVAL_AI__.closedAt=new Date().toISOString();
      }
    }catch{}
    return super._destroySurvival();
  }
}
