import { RaceScene as CurrentRaceScene } from './RaceKartingCanariasSurfaceFixScene.js';
import { readSurvivalAiRuntime, createSurvivalAiTelemetry } from '../ai/survivalAiRuntime.js';
import { buildTrackRacingLineModel } from '../ai/trackRacingLinePlanner.js';
import { buildTrackSpeedProfile } from '../ai/trackSpeedProfilePlanner.js';
import { updateSurvivalPhysicalBot } from '../ai/survivalPhysicalBotController.js';

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
    const plannerCenterline=this._survivalCenterline?.()||[];
    const plannerTrackWidth=Number(this.track?.meta?.trackWidth||this.track?.trackWidth||140);
    this._survivalPlannerTrackModel=buildTrackRacingLineModel({
      raceCenterline:plannerCenterline,
      trackWidth:plannerTrackWidth,
      // Conserva exterior-vértice-exterior sin consumir visualmente todo el ancho.
      offsetScale:.72
    });
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
    this._initSurvivalPlannerBot();
    this._createSurvivalSpectatorControls();
  }

  _createSurvivalSpectatorControls(){
    if(!this._survivalAiRuntime?.debug||this._survivalSpectatorUi?.scene)return;
    const racers=[{label:'TÚ',player:true},...(this._survivalBots||[]).map((bot,i)=>({
      label:'CPU'+(i+1),bot,physical:bot===this._survivalPlannerBot
    }))];
    const width=44,gap=3,total=racers.length*width+(racers.length-1)*gap;
    const ui=this.add.container(this.scale.width/2-total/2,62).setDepth(9200).setScrollFactor(0);
    ui._items=[];
    racers.forEach((entry,i)=>{
      const x=i*(width+gap);
      const bg=this.add.rectangle(x,0,width,22,entry.physical?0x6b4210:0x0a1822,.92)
        .setOrigin(0,0).setStrokeStyle(1,entry.physical?0xffbd4a:0x3f718c,.8)
        .setInteractive({useHandCursor:true});
      const label=this.add.text(x+width/2,6,entry.label,{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',
        fontStyle:'bold',color:entry.physical?'#ffd27a':'#d9ecf5'
      }).setOrigin(.5,0);
      bg.on('pointerdown',()=>this._selectSurvivalSpectator(i));
      ui.add([bg,label]);ui._items.push({bg,label,entry});
    });
    this._survivalSpectatorUi=ui;
    this._survivalSpectatorRing=this.add.ellipse(0,0,44,58)
      .setStrokeStyle(3,0xffbd4a,.95).setDepth(72);
    this._survivalSpectatorLabel=this.add.text(0,0,'',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',
      fontStyle:'bold',color:'#ffd27a',backgroundColor:'#09131dcc',
      padding:{x:5,y:2}
    }).setOrigin(.5,1).setDepth(73);
    try{
      this.uiCam?.ignore?.(this._survivalSpectatorRing);
      this.uiCam?.ignore?.(this._survivalSpectatorLabel);
    }catch{}
    this._selectSurvivalSpectator(this._survivalPlannerBot?1:0);
  }

  _selectSurvivalSpectator(index){
    const items=this._survivalSpectatorUi?._items||[];
    const selected=items[clamp(Math.round(Number(index)||0),0,Math.max(0,items.length-1))];
    if(!selected)return;
    this._survivalSpectatorIndex=items.indexOf(selected);
    for(let i=0;i<items.length;i++){
      const active=i===this._survivalSpectatorIndex,physical=items[i].entry.physical;
      items[i].bg.setFillStyle(active?0x174d66:(physical?0x6b4210:0x0a1822),active?1:.92);
      items[i].bg.setStrokeStyle(active?2:1,active?0x66d9ff:(physical?0xffbd4a:0x3f718c),.95);
    }
    const target=selected.entry.player?this.carBody:selected.entry.bot?.sprite;
    if(target?.scene)this.cameras?.main?.startFollow?.(target,true,.16,.16);
    this._survivalAiTelemetry?.pushEvent?.({
      timeMs:Math.round(Number(this.time?.now||0)),
      type:'spectator_select',target:selected.entry.player?'player':selected.entry.bot?.id
    });
    this._updateSurvivalSpectatorMarker();
  }

  _updateSurvivalSpectatorMarker(){
    const item=this._survivalSpectatorUi?._items?.[Number(this._survivalSpectatorIndex||0)];
    const target=item?.entry?.player?this.carBody:item?.entry?.bot?.sprite;
    const available=Boolean(target?.scene&&(item.entry.player||item.entry.bot?.active));
    this._survivalSpectatorRing?.setVisible?.(available);
    this._survivalSpectatorLabel?.setVisible?.(available);
    if(!available){
      if(item&&!item.entry.player)this._selectSurvivalSpectator(0);
      return;
    }
    const x=Number(target.x),y=Number(target.y);
    this._survivalSpectatorRing?.setPosition?.(x,y);
    this._survivalSpectatorLabel?.setPosition?.(x,y-34);
    const racer=item.entry.player?this._survivalPlayer:item.entry.bot;
    const suffix=item.entry.physical?' · BOT FÍSICO':'';
    const laps=Number(racer?.completedLaps||0);
    const crosses=Number(racer?.gateCrossCount||0);
    const armed=racer?.armed?'ARMADO':'SIN ARMAR';
    this._survivalSpectatorLabel?.setText?.(
      item.entry.label+suffix+' · V'+laps+' · META '+crosses+' · '+armed
    );
  }

  _initSurvivalPlannerBot(){
    if(this._survivalAiRuntime?.effective!=='planner_v1'||!this._survivalPlannerSpeedProfile?.valid)return;
    const b=(this._survivalBots||[]).find(bot=>bot?.active);
    const samples=this._survivalPlannerSpeedProfile.samples;
    if(!b||!Array.isArray(samples)||samples.length<4||!this.physics?.add?.sprite)return;

    const logical=Number(b.absProgress||0)+Number(this._survivalPathOffset||0);
    const index=Math.floor((((logical%1)+1)%1)*samples.length)%samples.length;
    const p=samples[index],next=samples[(index+1)%samples.length];
    const body=this.physics.add.sprite(Number(p.x),Number(p.y),'__BODY__');
    body.setVisible(false);
    body.setCircle(Math.max(7,Math.round(Math.min(Number(b.sprite?.displayWidth||28),Number(b.sprite?.displayHeight||48))*.22)));
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(0,0);
    body.rotation=Math.atan2(Number(next.y)-Number(p.y),Number(next.x)-Number(p.x));
    body.setVelocity(0,0);

    b.plannerBody=body;
    b._plannerSampleIndex=index;
    b._plannerFrac=((Number(b.absProgress||0)%1)+1)%1;
    b._plannerControl=null;
    b.prevX=Number(body.x);b.prevY=Number(body.y);
    b.sprite.setPosition(body.x,body.y);
    b.sprite.rotation=body.rotation+Number(this._carVisualRotOffset||0);
    this._survivalPlannerBot=b;
    this._survivalAiTelemetry?.pushEvent?.({
      timeMs:Math.round(Number(this.time?.now||0)),
      type:'physical_bot_enabled',botId:b.id,sampleIndex:index
    });
  }

  _shouldUseSurvivalPlannerBot(b){
    return this._survivalAiRuntime?.effective==='planner_v1'&&b===this._survivalPlannerBot&&Boolean(b?.plannerBody?.body);
  }

  _updateSurvivalPlannerBot(b,deltaMs,gate){
    const body=b?.plannerBody;
    if(!body?.body)return false;
    const dt=clamp(Number(deltaMs||16.67)/1000,.001,.05);
    const beforeX=Number(b.prevX),beforeY=Number(b.prevY);
    const playerMaxFwd=Math.max(80,Number(this.maxFwd||this.carParams?.maxFwd||420));
    const profileMeanRatio=clamp(
      Number(this._survivalPlannerSpeedProfile?.metrics?.meanTargetSpeed||0)/
      Math.max(1,Number(this._survivalPlannerSpeedProfile?.parameters?.maxSpeed||520)),
      .35,1
    );
    const targetAverage=Math.max(35,Number(b.targetRate||0)*Number(b._trafficTrackLength||1000));
    // Calibrar el cuerpo físico contra el mismo ritmo de parrilla que los legacy.
    // 0.82 representa la eficiencia medida del controlador frente al perfil ideal.
    // CPU1 ya tenía un ritmo correcto en la prueba real. El factor conserva
    // la nueva estabilidad lateral, pero devuelve velocidad al bot físico sin
    // volver a la envolvente fija anterior.
    const physicalPaceBoost=1.45;
    const physicalMaxFwd=clamp(
      targetAverage/Math.max(.25,profileMeanRatio*.82)*physicalPaceBoost,
      playerMaxFwd*.42,playerMaxFwd*.95
    );
    const control=updateSurvivalPhysicalBot(b,this._survivalPlannerSpeedProfile,{
      dt,
      spacing:Number(this._survivalPlannerTrackModel?.spacing||10),
      maxFwd:physicalMaxFwd,
      cornerRisk:.35,
      accel:Number(this.accel||this.carParams?.accel||520),
      brakeForce:Number(this.brakeForce||this.carParams?.brakeForce||720),
      linearDrag:Number(this.linearDrag||this.carParams?.linearDrag||.004),
      turnRate:Number(this.turnRate||this.carParams?.turnRate||2.4),
      steering:this.carParams?.steering||{}
    });
    if(!control.valid)return false;

    const onTrack=this._isOnTrack?Boolean(this._isOnTrack(Number(body.x),Number(body.y))):true;
    b._plannerOffTrackSec=onTrack?0:Number(b._plannerOffTrackSec||0)+dt;
    b._plannerStallSec=control.speed<6
      ?Number(b._plannerStallSec||0)+dt
      :0;

    // Watchdog exclusivo del experimento: registra el fallo antes de recuperar
    // el cuerpo. Así una salida no bloquea la carrera ni queda invisible en QA.
    if(b._plannerOffTrackSec>1.25||b._plannerStallSec>3){
      const samples=this._survivalPlannerSpeedProfile.samples;
      const i=control.nearestIndex%samples.length,p=samples[i],next=samples[(i+1)%samples.length];
      body.setPosition(Number(p.x),Number(p.y));
      body.rotation=Math.atan2(Number(next.y)-Number(p.y),Number(next.x)-Number(p.x));
      body.setVelocity(0,0);
      b._plannerOffTrackSec=0;b._plannerStallSec=0;
      b._plannerRecoveryCount=Number(b._plannerRecoveryCount||0)+1;
      b.prevX=Number(body.x);b.prevY=Number(body.y);
      b.sprite.setPosition(body.x,body.y);
      b.sprite.rotation=body.rotation+Number(this._carVisualRotOffset||0);
      this._survivalAiTelemetry?.pushEvent?.({
        timeMs:Math.round(Number(this.time?.now||0)),
        type:'physical_bot_recovery',botId:b.id,
        reason:onTrack?'stalled':'off_track',
        sampleIndex:i,recoveryCount:b._plannerRecoveryCount
      });
      return false;
    }

    const n=this._survivalPlannerSpeedProfile.samples.length;
    const frac=((control.nearestIndex/n-Number(this._survivalPathOffset||0))%1+1)%1;
    const previous=Number(b._plannerFrac);
    let advance=Number.isFinite(previous)?frac-previous:0;
    if(advance<-.5)advance+=1;
    if(advance>.5)advance-=1;
    advance=clamp(advance,-.01,.035);
    b._plannerFrac=frac;
    b.absProgress=Number(b.absProgress||0)+advance;
    b.distanceSinceFinish+=Math.max(0,advance);
    b.lapRate=Math.max(0,advance/dt);
    b._plannerControl=control;

    const x=Number(body.x),y=Number(body.y);
    b.sprite.setPosition(x,y);
    b.sprite.rotation=Number(body.rotation||0)+Number(this._carVisualRotOffset||0);
    b.prevX=x;b.prevY=y;

    let crossed=false;
    if(gate&&Number.isFinite(beforeX)&&Number.isFinite(beforeY)){
      const ax=gate.ax,ay=gate.ay,bx=gate.bx,by=gate.by;
      const rx=x-beforeX,ry=y-beforeY,sx=bx-ax,sy=by-ay,den=rx*sy-ry*sx;
      if(Math.abs(den)>1e-8){
        const qx=ax-beforeX,qy=ay-beforeY;
        const t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;
        if(t>=0&&t<=1&&u>=0&&u<=1)crossed=this._registerFinishCross(b);
      }
    }
    return crossed;
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
        passCommitted:Number(this.time?.now||0)/1000<Number(b._trafficPassUntil||0),
        physicalController:Boolean(this._shouldUseSurvivalPlannerBot(b)),
        steer:Number(b._plannerControl?.steer||0),
        throttle:Number(b._plannerControl?.throttle||0),
        brake:Number(b._plannerControl?.brake||0),
        targetSpeed:Number(b._plannerControl?.targetSpeed||0),
        cornerRisk:Number(b._plannerControl?.cornerRisk||0),
        riskConfidence:Number(b._plannerControl?.riskConfidence||0),
        riskScale:Number(b._plannerControl?.riskScale||1),
        chicaneAhead:Boolean(b._plannerControl?.chicaneAhead),
        shortChicane:Boolean(b._plannerControl?.shortChicane),
        maneuverKind:b._plannerControl?.maneuverKind||null,
        distanceToLine:Number(b._plannerControl?.distanceToLine||0),
        offTrackSeconds:Number(b._plannerOffTrackSec||0),
        recoveryCount:Number(b._plannerRecoveryCount||0),
        completedLaps:Number(b.completedLaps||0),
        gateCrossCount:Number(b.gateCrossCount||0),
        armed:Boolean(b.armed)
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
    const bots=(this._survivalBots||[]).filter(b=>b?.active&&!this._shouldUseSurvivalPlannerBot(b));
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
    this._updateSurvivalSpectatorMarker();
    return result;
  }

  _destroySurvival(){
    try{this._survivalSpectatorUi?.destroy?.(true);}catch{}
    try{this._survivalSpectatorRing?.destroy?.();}catch{}
    try{this._survivalSpectatorLabel?.destroy?.();}catch{}
    this._survivalSpectatorUi=null;
    this._survivalSpectatorRing=null;
    this._survivalSpectatorLabel=null;
    try{this._survivalPlannerBot?.plannerBody?.destroy?.();}catch{}
    if(this._survivalPlannerBot)this._survivalPlannerBot.plannerBody=null;
    this._survivalPlannerBot=null;
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
