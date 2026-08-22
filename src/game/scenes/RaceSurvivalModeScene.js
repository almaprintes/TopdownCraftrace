import { RaceScene as CurrentRaceScene } from './RaceAntiCutPenaltyScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const MODE_KEY='tdr2:gameMode';
const rand=(a,b)=>a+Math.random()*(b-a);

function readMode(data){
  if(['timeattack','ghost','survival'].includes(data?.gameMode))return data.gameMode;
  try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}
}
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
function fmtLap(ms){
  ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'--:--.--';
  const m=Math.floor(ms/60000),s=(ms-m*60000)/1000;
  return`${m}:${s.toFixed(2).padStart(5,'0')}`;
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    this._survivalMode=readMode(data)==='survival';
    this._survivalBots=[];
    this._survivalRound=0;
    this._survivalFinished=false;
    this._survivalPlayerOut=false;
    this._survivalRaceWasStarted=false;
    this._survivalStartPerf=0;
    this._survivalPathOffset=0;
    this._survivalPlayer={armed:false,completedLaps:0,distanceSinceFinish:0,prevX:null,prevY:null};
    this._survivalFinishAt=0;
    this._survivalResultShown=false;
    this._survivalResultDom=null;
    this._survivalWon=false;
    const result=super.create(data);
    if(this._survivalMode){
      this.time.delayedCall(350,()=>this._initSurvival());
      this.time.delayedCall(900,()=>{if(!this._survivalBots.length)this._initSurvival();});
      this.events.once('shutdown',()=>this._destroySurvival());
    }
    return result;
  }

  _survivalCenterline(){
    const cl=this.track?.meta?.raceCenterline||this.track?.meta?.centerline||this.track?.raceCenterline||this.track?.centerline;
    return Array.isArray(cl)?cl:[];
  }
  _survivalFinishGate(){
    const gate=this.finishLine||this.track?.meta?.finishLine||this.track?.meta?.finish;
    if(!gate?.a||!gate?.b)return null;
    const ax=Number(gate.a.x),ay=Number(gate.a.y),bx=Number(gate.b.x),by=Number(gate.b.y);
    if(![ax,ay,bx,by].every(Number.isFinite))return null;
    return{ax,ay,bx,by,mx:(ax+bx)*.5,my:(ay+by)*.5};
  }
  _survivalFindFinishOffset(){
    const cl=this._survivalCenterline(),gate=this._survivalFinishGate();if(cl.length<2||!gate)return 0;
    let bestI=0,bestD=Infinity;
    for(let i=0;i<cl.length;i++){
      const p=cl[i],x=Number(p?.x??p?.[0]),y=Number(p?.y??p?.[1]);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      const d=(x-gate.mx)*(x-gate.mx)+(y-gate.my)*(y-gate.my);if(d<bestD){bestD=d;bestI=i;}
    }
    return bestI/cl.length;
  }
  _survivalNearestPathProgress(x,y){
    const cl=this._survivalCenterline(),n=cl.length;if(n<2)return 0;
    let bestI=0,bestD=Infinity;
    for(let i=0;i<n;i++){
      const p=cl[i],px=Number(p?.x??p?.[0]),py=Number(p?.y??p?.[1]);if(!Number.isFinite(px)||!Number.isFinite(py))continue;
      const d=(px-x)*(px-x)+(py-y)*(py-y);if(d<bestD){bestD=d;bestI=i;}
    }
    let rel=bestI/n-Number(this._survivalPathOffset||0);return((rel%1)+1)%1;
  }
  _survivalPathPoint(progress,lane=0){
    const cl=this._survivalCenterline(),n=cl.length;if(n<2)return null;
    const logical=Number(progress)+Number(this._survivalPathOffset||0),p=((logical%1)+1)%1,f=p*n,i=Math.floor(f)%n,j=(i+1)%n,t=f-Math.floor(f),a=cl[i],b=cl[j];
    const ax=Number(a?.x??a?.[0]),ay=Number(a?.y??a?.[1]),bx=Number(b?.x??b?.[0]),by=Number(b?.y??b?.[1]);if(![ax,ay,bx,by].every(Number.isFinite))return null;
    const dx=bx-ax,dy=by-ay,len=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
    return{x:ax+dx*t+nx*lane,y:ay+dy*t+ny*lane,r:Math.atan2(dy,dx)};
  }
  _survivalSurfaceId(){
    const id=String(this.track?.meta?.surface||this.track?.surface||this.track?.meta?.category||'').toLowerCase(),key=String(this.trackKey||'').toLowerCase();
    return(id.includes('dirt')||id.includes('tierra')||key.includes('raven')||key.includes('offroad'))?'DIRT':'ASPHALT';
  }
  _survivalPlayerBestLapMs(){
    const key=this.trackKey||(()=>{try{return localStorage.getItem('tdr2:trackKey')||'track01';}catch{return'track01';}})();
    try{
      const h=JSON.parse(localStorage.getItem(`tdr2:ttHist:${key}`)||'null')?.history;if(!Array.isArray(h))return null;
      const currentCar=String(this.carId||this.selectedCarId||'');
      let best=null;
      for(const r of h){
        // Los registros antiguos no incluyen coche: no sirven para equilibrar
        // una parrilla actual sin inventar su procedencia.
        if(!currentCar||String(r?.carId||'')!==currentCar)continue;
        const ms=Number(r?.lapMs);
        if(Number.isFinite(ms)&&ms>5000&&(best==null||ms<best))best=ms;
      }
      return best;
    }catch{return null;}
  }
  _survivalSessionBestLapMs(){
    let best=null;
    for(const r of(Array.isArray(this.ttHistory)?this.ttHistory:[])){
      const ms=Number(r?.lapMs);if(Number.isFinite(ms)&&ms>1000&&(best==null||ms<best))best=ms;
    }
    return best;
  }

  _initSurvival(){
    if(!this._survivalMode||this._survivalBots.length)return;
    const visual=visualCarSprite(this),cl=this._survivalCenterline();if(!visual||cl.length<2)return;
    const tex=visual.texture.key;this._survivalPathOffset=this._survivalFindFinishOffset();
    const surfaceId=this._survivalSurfaceId(),playerSpec=CAR_SPECS?.[this.carId]||CAR_SPECS?.[this.selectedCarId]||{},surface=resolveVehicleSurface(playerSpec,surfaceId),lenPx=Math.max(100,pathLength(cl)),playerMax=Math.max(120,Number(this.maxFwd||this.carParams?.maxFwd||420));
    const bestMs=this._survivalPlayerBestLapMs();let baseLapSec;
    if(Number.isFinite(bestMs))baseLapSec=clamp(bestMs/1000,12,180);
    else{const surfacePace=clamp((surface.speedCapacity||1)*(surface.movingDriveCapacity||1),.42,1.02);baseLapSec=clamp(lenPx/Math.max(55,playerMax*surfacePace*.42),28,120);}
    const lapMultipliers=[1.08,1.11,1.15,1.19,1.24],carWidth=Math.max(12,Number(visual.displayWidth||visual.width||28)),carLength=Math.max(20,Number(visual.displayHeight||visual.height||48)),laneGap=clamp(carWidth*.72,8,18),rowGap=clamp(carLength*1.45,26,60);
    const trackW=Math.max(carWidth*4,Number(this.track?.meta?.trackWidth||this.track?.trackWidth||this.trackWidth||carWidth*7));
    for(let i=0;i<5;i++){
      const sprite=this.add.image(0,0,tex).setOrigin(visual.originX??.5,visual.originY??.5).setDepth(Math.max(29,Number(this.carRig?.depth||30)-1));
      sprite.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));sprite.clearTint?.();sprite.setAlpha(1).setBlendMode('NORMAL');try{this.uiCam?.ignore?.(sprite);}catch{}
      const row=Math.floor(i/2)+1,lane=(i%2===0?-1:1)*laneGap,startProgress=-(row*rowGap)/lenPx,targetRate=1/(baseLapSec*lapMultipliers[i]),p=this._survivalPathPoint(startProgress,lane);
      const bot={
        id:`CPU ${i+1}`,sprite,absProgress:startProgress,lapRate:0,targetRate,lane,baseLane:lane,active:true,launchDelay:i*.08,
        armed:false,completedLaps:0,distanceSinceFinish:0,prevX:p?.x??0,prevY:p?.y??0,
        paceFactor:rand(.97,1.02),paceTarget:rand(.97,1.025),nextPaceChange:rand(2.5,5.5),
        lapFactor:rand(.97,1.025),linePhase:rand(0,Math.PI*2),lineFreq:rand(.65,1.35),lineAmp:rand(carWidth*.18,carWidth*.52),
        trackW,mistakeUntil:0,mistakeLane:0,mistakeSlow:1,nextMistakeCheck:rand(.8,2.2),lastLapSeen:0
      };
      this._survivalBots.push(bot);if(p){sprite.setPosition(p.x,p.y);sprite.rotation=p.r+Number(this._carVisualRotOffset||0);}
    }
    this._createSurvivalHud();
  }

  _createSurvivalHud(){
    if(this._survivalHud?.scene)return;
    const c=this.add.container(this.scale.width/2,14).setDepth(5200).setScrollFactor(0),bg=this.add.rectangle(0,0,330,42,0x06131b,.84).setOrigin(.5,0).setStrokeStyle(1,0xffc94a,.65),title=this.add.text(0,7,'⚡ SUPERVIVENCIA · 6 COCHES',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffd76e'}).setOrigin(.5,0),state=this.add.text(0,24,'PARRILLA · esperando semáforo',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',color:'#d8e4ec'}).setOrigin(.5,0);
    c.add([bg,title,state]);c._state=state;c._title=title;c._bg=bg;this._survivalHud=c;
  }
  _survivalPlayerRaceDistance(){
    const s=this._survivalPlayer,x=Number(this.carBody?.x),y=Number(this.carBody?.y),frac=this._survivalNearestPathProgress(x,y);
    if(!s.armed)return frac>.5?frac-1:frac;
    return Number(s.completedLaps||0)+frac;
  }
  _survivalEntries(){
    const arr=[{id:'TÚ',player:true,active:!this._survivalPlayerOut,raceDistance:this._survivalPlayerRaceDistance()}];
    for(const b of this._survivalBots)if(b.active)arr.push({...b,raceDistance:Number(b.absProgress)||0});
    return arr.filter(e=>e.active).sort((a,b)=>b.raceDistance-a.raceDistance);
  }
  _survivalRacers(){
    const all=[{id:'TÚ',player:true,active:!this._survivalPlayerOut,state:this._survivalPlayer}];
    for(const b of this._survivalBots)if(b.active)all.push({id:b.id,player:false,active:true,state:b});
    return all.filter(r=>r.active);
  }
  _eliminateSpecific(racer){
    if(!racer||this._survivalFinished)return;
    if(racer.player){
      this._survivalPlayerOut=true;
      this._showSurvivalNotice('ELIMINADO','Has sido el último en llegar a meta','#ff667a',true);
      this._finishSurvival(false);
      return;
    }
    const bot=this._survivalBots.find(b=>b.id===racer.id);if(bot){bot.active=false;bot.sprite?.setVisible(false);}
    this._showSurvivalNotice(`${racer.id} ELIMINADO`,'Último coche pendiente de cruzar meta','#ffd76e');
    const remaining=this._survivalEntries();
    if(remaining.length===1)this._finishSurvival(Boolean(remaining[0].player));
  }
  _showSurvivalNotice(title,sub,color='#ffd76e',persistent=false){
    try{this._survivalNotice?.destroy?.(true);}catch{}
    const c=this.add.container(this.scale.width/2,82).setDepth(9000).setScrollFactor(0),bg=this.add.rectangle(0,0,310,62,0x071018,.92).setOrigin(.5,0).setStrokeStyle(2,Number(`0x${color.replace('#','')}`),.8),a=this.add.text(0,10,title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'17px',fontStyle:'bold',color}).setOrigin(.5,0),b=this.add.text(0,36,sub,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',color:'#d7e2e9'}).setOrigin(.5,0);
    c.add([bg,a,b]);this._survivalNotice=c;if(!persistent)this.time.delayedCall(1700,()=>{if(c?.scene)c.destroy(true);if(this._survivalNotice===c)this._survivalNotice=null;});
  }
  _registerFinishCross(racer){
    const now=performance.now();
    racer.gateCrossCount=Number(racer.gateCrossCount||0)+1;
    racer.lastGateCrossAt=now;
    if(!racer.armed){
      racer.armed=true;
      racer.distanceSinceFinish=0;
      racer._survivalLapStartedAt=now;
      racer._survivalLapTimesMs=[];
      return false;
    }
    if(racer.distanceSinceFinish<.72)return false;
    const started=Number(racer._survivalLapStartedAt);
    const lapMs=now-started;
    racer.completedLaps=(Number(racer.completedLaps)||0)+1;
    racer.distanceSinceFinish=0;
    if(Number.isFinite(started)&&Number.isFinite(lapMs)&&lapMs>1000){
      if(!Array.isArray(racer._survivalLapTimesMs))racer._survivalLapTimesMs=[];
      racer._survivalLapTimesMs.push(lapMs);
      if(!Array.isArray(racer._survivalLapLearning))racer._survivalLapLearning=[];
      racer._survivalLapLearning.push({
        blend:Number(racer._plannerTeachingBlend||0),
        teacherLap:Number(racer._plannerTeacherLap||0)
      });
      // Una sola fuente de verdad: un tiempo por cada completedLaps aceptada.
      if(racer._survivalLapTimesMs.length>Number(racer.completedLaps)){
        racer._survivalLapTimesMs=racer._survivalLapTimesMs.slice(-Number(racer.completedLaps));
        racer._survivalLapLearning=racer._survivalLapLearning.slice(-Number(racer.completedLaps));
      }
    }
    racer._survivalLapStartedAt=now;
    return true;
  }

  _tryCloseSurvivalRound(){
    const racers=this._survivalRacers();if(racers.length<=1||this._survivalFinished)return;
    const targetLap=this._survivalRound+1;
    const crossed=racers.filter(r=>Number(r.state.completedLaps||0)>=targetLap);
    if(crossed.length<racers.length-1)return;
    const pending=racers.filter(r=>Number(r.state.completedLaps||0)<targetLap);
    if(pending.length!==1)return;
    this._survivalRound=targetLap;
    this._eliminateSpecific(pending[0]);
  }

  _finishSurvival(win){
    if(this._survivalFinished)return;
    this._survivalFinished=true;
    this._survivalWon=Boolean(win);
    this._survivalFinishAt=performance.now();
    if(this._survivalHud?._title?.scene){
      this._survivalHud._title.setText(win?'🏆 SUPERVIVENCIA · CAMPEÓN':'⚡ SUPERVIVENCIA · ELIMINADO');
      this._survivalHud._title.setColor(win?'#62ffb2':'#ff7788');
    }
    if(this._survivalHud?._state?.scene){
      this._survivalHud._state.setText(win?`${this._survivalRound}/5 RONDAS SUPERADAS · ÚLTIMO COCHE EN PISTA`:`RONDA ${Math.max(1,this._survivalRound+1)} · FIN DE CARRERA`);
    }
    if(win)this._showSurvivalNotice('¡SUPERVIVENCIA GANADA!','Has sobrevivido a las 5 eliminaciones','#62ffb2',true);
    this.time.delayedCall(1500,()=>this._showSurvivalResults());
  }

  _showSurvivalResults(){
    if(this._survivalResultShown||typeof document==='undefined')return;
    this._survivalResultShown=true;
    try{this.physics?.world?.pause?.();}catch{}
    try{if(this._pauseButton)this._pauseButton.style.display='none';}catch{}
    try{this._survivalNotice?.destroy?.(true);}catch{}
    const best=fmtLap(this._survivalSessionBestLapMs());
    const cpuSource=this._survivalPlannerBot?._survivalLapTimesMs;
    const cpuTimes=(Array.isArray(cpuSource)?cpuSource:[])
      .map(Number).filter(ms=>Number.isFinite(ms)&&ms>1000);
    const cpuBest=cpuTimes.length?Math.min(...cpuTimes):null;
    const cpuAvg=cpuTimes.length?cpuTimes.reduce((sum,ms)=>sum+ms,0)/cpuTimes.length:null;
    const cpuLearning=Array.isArray(this._survivalPlannerBot?._survivalLapLearning)
      ?this._survivalPlannerBot._survivalLapLearning:[];
    const cpuLapList=cpuTimes.length
      ?cpuTimes.map((ms,i)=>{
        const learned=Math.round(clamp(Number(cpuLearning[i]?.blend||0),0,1)*100);
        return `<span><small>V${i+1} · APREND. ${learned}%</small><b>${fmtLap(ms)}</b></span>`;
      }).join('')
      :'<i>CPU1 no completó ninguna vuelta cronometrada.</i>';
    const cpuResultPanel=this._survivalPlannerBot?`
      <section class="tdrsurv-cpu">
        <div class="tdrsurv-cpu-head"><strong>CPU1 · TIEMPOS REALES</strong><span>MEJOR ${fmtLap(cpuBest)} · MEDIA ${fmtLap(cpuAvg)}</span></div>
        <div class="tdrsurv-cpu-laps">${cpuLapList}</div>
      </section>`:'';
    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';
    const won=this._survivalWon;
    root.innerHTML=`
      <style>
        .tdrsurv-veil{position:fixed;inset:0;z-index:14000;background:rgba(2,6,12,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
        .tdrsurv-card{width:min(88vw,500px);background:linear-gradient(180deg,rgba(13,27,38,.98),rgba(6,14,22,.98));border:2px solid ${won?'#4fffb0':'#ff6479'};clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px);padding:22px 24px;color:#fff;box-shadow:0 24px 90px rgba(0,0,0,.55)}
        .tdrsurv-kicker{font-size:10px;font-weight:900;letter-spacing:.18em;color:${won?'#63ffc0':'#ff8293'};margin-bottom:5px}.tdrsurv-title{font-size:28px;font-weight:950;letter-spacing:.02em;margin-bottom:16px}.tdrsurv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:0 0 18px}.tdrsurv-stat{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.10);padding:11px 9px;text-align:center}.tdrsurv-stat small{display:block;font-size:8px;letter-spacing:.11em;color:#8495a9;font-weight:900;margin-bottom:5px}.tdrsurv-stat b{font-size:16px}.tdrsurv-cpu{margin:0 0 14px;padding:11px;border:1px solid #d89b31;background:rgba(216,155,49,.07)}.tdrsurv-cpu-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.tdrsurv-cpu-head strong{font-size:9px;letter-spacing:.12em;color:#ffc45f}.tdrsurv-cpu-head span{font-size:9px;color:#dce4ec;font-variant-numeric:tabular-nums}.tdrsurv-cpu-laps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.tdrsurv-cpu-laps>span{background:#111b26;border:1px solid #303c49;padding:6px 4px;text-align:center}.tdrsurv-cpu-laps small{display:block;color:#8997a8;font-size:7px;font-weight:900;margin-bottom:3px}.tdrsurv-cpu-laps b{font-size:10px;font-variant-numeric:tabular-nums}.tdrsurv-cpu-laps i{grid-column:1/-1;color:#8997a8;font-size:9px;font-style:normal}.tdrsurv-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.tdrsurv-btn{height:48px;border:1px solid rgba(255,255,255,.18);background:#122335;color:#fff;font:900 11px system-ui,-apple-system,sans-serif;letter-spacing:.055em}.tdrsurv-btn.primary{background:${won?'#145a45':'#56212b'};border-color:${won?'#4fffb0':'#ff6479'}}.tdrsurv-btn.info{background:#123452;border-color:#3f8bc7}
      </style>
      <div class="tdrsurv-veil"><div class="tdrsurv-card">
        <div class="tdrsurv-kicker">SUPERVIVENCIA</div>
        <div class="tdrsurv-title">${won?'🏆 CAMPEÓN':'ELIMINADO'}</div>
        <div class="tdrsurv-stats">
          <div class="tdrsurv-stat"><small>RONDAS</small><b>${this._survivalRound}/5</b></div>
          <div class="tdrsurv-stat"><small>MEJOR VUELTA</small><b>${best}</b></div>
          <div class="tdrsurv-stat"><small>POSICIÓN</small><b>${won?'1º':'—'}</b></div>
        </div>
        ${cpuResultPanel}
        <div class="tdrsurv-actions"><button class="tdrsurv-btn info" data-a="info">INFO SESIÓN</button><button class="tdrsurv-btn primary" data-a="again">REPETIR</button><button class="tdrsurv-btn" data-a="menu">MENÚ</button></div>
      </div></div>`;
    root.querySelector('[data-a="info"]')?.addEventListener('click',()=>this._showSurvivalSessionInfo(root));
    root.querySelector('[data-a="again"]')?.addEventListener('click',()=>{
      try{root.remove();}catch{}this._survivalResultDom=null;
      try{this.physics?.world?.resume?.();}catch{}
      this.scene.restart({gameMode:'survival'});
    });
    root.querySelector('[data-a="menu"]')?.addEventListener('click',()=>{
      try{root.remove();}catch{}this._survivalResultDom=null;
      try{this.physics?.world?.resume?.();}catch{}
      this.scene.start('menu');
    });
    document.body.appendChild(root);this._survivalResultDom=root;
  }

  _showSurvivalSessionInfo(resultRoot){
    if(typeof document==='undefined')return;
    const laps=(Array.isArray(this.ttHistory)?this.ttHistory:[]).map((r,i)=>({n:i+1,ms:Number(r?.lapMs)})).filter(r=>Number.isFinite(r.ms)&&r.ms>1000);
    const times=laps.map(r=>r.ms),best=times.length?Math.min(...times):null,worst=times.length?Math.max(...times):null,avg=times.length?times.reduce((a,b)=>a+b,0)/times.length:null;
    const trackName=String(this.track?.meta?.name||this.track?.name||this.trackId||this.trackKey||'Circuito');
    const car=CAR_SPECS?.[this.carId]||CAR_SPECS?.[this.selectedCarId]||{};
    const rows=laps.length?laps.map(r=>`<div class="tdrsi-lap"><b>V${r.n}</b><span>${fmtLap(r.ms)}</span><i>${r.ms===best?'MEJOR':''}</i></div>`).join(''):'<div class="tdrsi-empty">No hay vueltas cronometradas en esta sesión.</div>';
    const cpuSource=this._survivalPlannerBot?._survivalLapTimesMs;
    const cpuTimes=(Array.isArray(cpuSource)?cpuSource:[])
      .map(Number).filter(ms=>Number.isFinite(ms)&&ms>1000);
    const cpuBest=cpuTimes.length?Math.min(...cpuTimes):null;
    const cpuAvg=cpuTimes.length?cpuTimes.reduce((sum,ms)=>sum+ms,0)/cpuTimes.length:null;
    const cpuDelta=Number.isFinite(cpuBest)&&Number.isFinite(best)?cpuBest-best:null;
    const cpuDeltaText=Number.isFinite(cpuDelta)
      ?`${cpuDelta>=0?'+':'−'}${(Math.abs(cpuDelta)/1000).toFixed(3)} s`:'—';
    const cpuRows=cpuTimes.length?cpuTimes.map((ms,i)=>
      `<div class="tdrsi-cpu-lap"><b>V${i+1}</b><span>${fmtLap(ms)}</span><i>${ms===cpuBest?'MEJOR':''}</i></div>`
    ).join(''):'<div class="tdrsi-empty">CPU1 no completó ninguna vuelta antes de ser eliminado.</div>';
    const cpuPanel=this._survivalPlannerBot?`<section class="tdrsi-cpu">
      <div class="tdrsi-cpu-title">CPU1 · CRONOMETRAJE PROVISIONAL</div>
      <div class="tdrsi-cpu-grid">
        <div><small>MEJOR</small><b>${fmtLap(cpuBest)}</b></div>
        <div><small>MEDIA</small><b>${fmtLap(cpuAvg)}</b></div>
        <div><small>DIF. CONTIGO</small><b>${cpuDeltaText}</b></div>
      </div>
      <div>${cpuRows}</div>
      <div class="tdrsi-cpu-note">Solo diagnóstico · no guarda récords ni altera resultados.</div>
    </section>`:'';
    const overlay=document.createElement('div');overlay.dataset.tdrRaceUi='1';
    overlay.innerHTML=`<style>
      .tdrsi-veil{position:fixed;inset:0;z-index:14500;background:rgba(2,6,12,.90);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff}
      .tdrsi-card{width:min(92vw,540px);max-height:88vh;overflow:auto;background:linear-gradient(180deg,#0d1b28,#071019);border:1px solid #3678ad;clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px);padding:20px;box-shadow:0 25px 90px rgba(0,0,0,.62)}
      .tdrsi-kicker{font-size:9px;font-weight:900;letter-spacing:.16em;color:#69c8ff}.tdrsi-card h2{margin:4px 0 2px;font-size:23px}.tdrsi-sub{color:#9aabc0;font-size:11px;margin-bottom:15px}.tdrsi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tdrsi-stat{background:#101c29;border:1px solid #23364b;padding:10px;text-align:center}.tdrsi-stat small{display:block;color:#8193a8;font-size:7px;font-weight:900;letter-spacing:.1em;margin-bottom:4px}.tdrsi-stat b{font-size:14px}.tdrsi-card h3{font-size:10px;letter-spacing:.13em;color:#8fa1b6;margin:17px 0 6px}.tdrsi-lap{display:grid;grid-template-columns:42px 1fr 48px;gap:8px;padding:8px 2px;border-bottom:1px solid #182738;font-size:12px}.tdrsi-lap span{text-align:right}.tdrsi-lap i{text-align:right;color:#62ffb2;font-size:8px;font-style:normal;font-weight:900}.tdrsi-empty{color:#8495a9;font-size:11px;padding:10px 0}.tdrsi-cpu{margin-top:17px;padding:12px;border:1px solid #d89b31;background:rgba(216,155,49,.055)}.tdrsi-cpu-title{font-size:9px;font-weight:950;letter-spacing:.14em;color:#ffc45f;margin-bottom:9px}.tdrsi-cpu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:7px}.tdrsi-cpu-grid div{background:#151d27;border:1px solid #39424e;padding:8px;text-align:center}.tdrsi-cpu-grid small{display:block;color:#8e9bac;font-size:7px;font-weight:900;letter-spacing:.08em;margin-bottom:4px}.tdrsi-cpu-grid b{font-size:13px}.tdrsi-cpu-lap{display:grid;grid-template-columns:42px 1fr 48px;gap:8px;padding:7px 2px;border-bottom:1px solid #26303b;font-size:11px}.tdrsi-cpu-lap span{text-align:right}.tdrsi-cpu-lap i{text-align:right;color:#ffc45f;font-size:8px;font-style:normal;font-weight:900}.tdrsi-cpu-note{margin-top:8px;color:#79889a;font-size:7px}.tdrsi-back{width:100%;height:46px;margin-top:16px;border:1px solid #3f8bc7;background:#123452;color:#fff;font:900 11px system-ui,-apple-system,sans-serif;letter-spacing:.08em}
    </style><div class="tdrsi-veil"><div class="tdrsi-card"><div class="tdrsi-kicker">INFO DE SESIÓN · SUPERVIVENCIA</div><h2>${trackName}</h2><div class="tdrsi-sub">${String(car?.name||this.carId||'Coche')} · resultado ${this._survivalWon?'1º / CAMPEÓN':'ELIMINADO'}</div><div class="tdrsi-grid"><div class="tdrsi-stat"><small>RONDAS</small><b>${this._survivalRound}/5</b></div><div class="tdrsi-stat"><small>MEJOR</small><b>${fmtLap(best)}</b></div><div class="tdrsi-stat"><small>MEDIA</small><b>${fmtLap(avg)}</b></div><div class="tdrsi-stat"><small>VUELTAS</small><b>${laps.length}</b></div><div class="tdrsi-stat"><small>PEOR</small><b>${fmtLap(worst)}</b></div><div class="tdrsi-stat"><small>COCHES INICIALES</small><b>6</b></div></div><h3>VUELTAS DE LA SESIÓN</h3><div>${rows}</div>${cpuPanel}<button class="tdrsi-back" data-a="back">VOLVER AL RESULTADO</button></div></div>`;
    if(resultRoot)resultRoot.style.display='none';
    overlay.querySelector('[data-a="back"]')?.addEventListener('click',()=>{try{overlay.remove();}catch{}if(resultRoot)resultRoot.style.display='';});
    document.body.appendChild(overlay);
  }

  _updateSurvivalBots(deltaMs){
    if(!this._survivalMode||!this._survivalBots.length||this._survivalFinished)return;
    if(!this._raceStarted){if(this._survivalHud?._state?.scene)this._survivalHud._state.setText('PARRILLA · esperando semáforo');return;}
    if(!this._survivalRaceWasStarted){
      this._survivalRaceWasStarted=true;this._survivalRound=0;this._survivalStartPerf=performance.now();
      const px=Number(this.carBody?.x),py=Number(this.carBody?.y);this._survivalPlayer={armed:false,completedLaps:0,distanceSinceFinish:0,prevX:px,prevY:py};
    }

    const gate=this._survivalFinishGate(),dt=Math.max(0,Number(deltaMs)||0)/1000,elapsed=Math.max(0,(performance.now()-this._survivalStartPerf)/1000);
    let validCross=false;
    const ps=this._survivalPlayer,px=Number(this.carBody?.x),py=Number(this.carBody?.y),pfrac=this._survivalNearestPathProgress(px,py),prevFrac=Number(ps._lastFrac);
    if(Number.isFinite(prevFrac)){let d=pfrac-prevFrac;if(d<-.5)d+=1;if(d>.5)d-=1;if(d>0)ps.distanceSinceFinish+=d;}
    ps._lastFrac=pfrac;
    if(gate&&Number.isFinite(ps.prevX)&&Number.isFinite(ps.prevY)&&segIntersect(ps.prevX,ps.prevY,px,py,gate.ax,gate.ay,gate.bx,gate.by))validCross=this._registerFinishCross(ps)||validCross;
    ps.prevX=px;ps.prevY=py;

    for(const b of this._survivalBots){
      if(!b.active)continue;
      // Punto de extensión de Fase 3: un controlador físico puede actualizar
      // su bot y devolver si cruzó meta. El resto conserva exactamente legacy.
      if(this._shouldUseSurvivalPlannerBot?.(b)){
        validCross=Boolean(this._updateSurvivalPlannerBot?.(b,deltaMs,gate))||validCross;
        continue;
      }
      if(elapsed>=b.nextPaceChange){b.paceTarget=rand(.97,1.025);b.nextPaceChange=elapsed+rand(2.5,5.5);}
      b.paceFactor+=(b.paceTarget-b.paceFactor)*clamp(dt*.75,0,1);
      const lapNow=Math.max(0,Math.floor(Number(b.absProgress)||0));
      if(lapNow!==b.lastLapSeen){b.lastLapSeen=lapNow;b.lapFactor=rand(.97,1.025);b.linePhase+=rand(-.8,.8);b.lineAmp=clamp(b.lineAmp*rand(.78,1.22),2,Math.max(3,b.trackW*.18));}
      if(elapsed>=b.nextMistakeCheck&&elapsed>=b.mistakeUntil){
        const dirt=this._survivalSurfaceId()==='DIRT',chance=dirt?.18:.11;
        if(Math.random()<chance){
          const duration=rand(.65,1.75);b.mistakeUntil=elapsed+duration;b.mistakeSlow=rand(.48,.78);
          const sign=Math.random()<.5?-1:1,severity=Math.random()<.28?rand(.48,.72):rand(.20,.42);b.mistakeLane=sign*b.trackW*severity;
        }
        b.nextMistakeCheck=elapsed+rand(2.2,5.5);
      }
      const makingMistake=elapsed<b.mistakeUntil;if(!makingMistake&&Math.abs(b.mistakeLane)>.05)b.mistakeLane*=Math.pow(.12,dt);
      const local=Math.max(0,elapsed-b.launchDelay),launch01=clamp(local/3,0,1),pace=b.paceFactor*b.lapFactor*(makingMistake?b.mistakeSlow:1),desired=b.targetRate*pace*(.18+.82*(1-Math.pow(1-launch01,2)));
      b.lapRate+=(desired-b.lapRate)*clamp(dt*(makingMistake?3.4:2),0,1);
      const before=Number(b.absProgress)||0;b.absProgress+=b.lapRate*dt;b.distanceSinceFinish+=Math.max(0,b.absProgress-before);
      const naturalLane=b.baseLane+Math.sin((b.absProgress*18+b.linePhase)*b.lineFreq)*b.lineAmp,lane=naturalLane+b.mistakeLane,p=this._survivalPathPoint(b.absProgress,lane);if(!p)continue;
      if(gate&&Number.isFinite(b.prevX)&&Number.isFinite(b.prevY)&&segIntersect(b.prevX,b.prevY,p.x,p.y,gate.ax,gate.ay,gate.bx,gate.by))validCross=this._registerFinishCross(b)||validCross;
      const moveX=p.x-Number(b.prevX),moveY=p.y-Number(b.prevY);
      const moveDistance=Math.hypot(moveX,moveY);
      const travelRotation=moveDistance>.01?Math.atan2(moveY,moveX):p.r;
      b.prevX=p.x;b.prevY=p.y;b.sprite.setPosition(p.x,p.y);
      b.sprite.rotation=travelRotation+Number(this._carVisualRotOffset||0);
    }

    // Evaluar siempre: si un cruce válido actualizó el estado en otra capa o
    // en el fotograma anterior, la ronda no puede quedar esperando otra vuelta.
    this._tryCloseSurvivalRound();
    if(this._survivalFinished)return;

    const ranked=this._survivalEntries();
    if(this._survivalHud?._state?.scene){
      const idx=ranked.findIndex(e=>e.player),pos=idx<0?ranked.length+1:idx+1,targetLap=this._survivalRound+1,racers=this._survivalRacers(),crossed=racers.filter(r=>Number(r.state.completedLaps||0)>=targetLap).length,need=Math.max(1,racers.length-1);
      this._survivalHud._title?.setText?.(`⚡ SUPERVIVENCIA · ${ranked.length} COCHES`);
      this._survivalHud._state.setText(`POSICIÓN ${pos}/${ranked.length} · meta ${crossed}/${need} · último fuera al penúltimo paso`);
    }
  }

  _updateSurvivalFinishCoast(delta){
    if(!this._survivalFinished||this._survivalResultShown)return;
    const dt=Math.max(0,Number(delta)||0)/1000;
    const body=this.carBody?.body||this.carBody;
    if(body?.velocity){const f=Math.exp(-1.35*dt);body.velocity.x*=f;body.velocity.y*=f;}
    try{if(Number.isFinite(body?.angularVelocity))body.angularVelocity*=Math.exp(-2.1*dt);}catch{}
  }

  _destroySurvival(){
    for(const b of this._survivalBots){try{b.sprite?.destroy?.();}catch{}}
    this._survivalBots=[];
    try{this._survivalHud?.destroy?.(true);}catch{}
    try{this._survivalNotice?.destroy?.(true);}catch{}
    try{this._survivalResultDom?.remove?.();}catch{}
    this._survivalHud=null;this._survivalNotice=null;this._survivalResultDom=null;
  }
  update(time,delta){
    const result=super.update(time,delta);
    if(this._survivalMode){this._updateSurvivalBots(delta);this._updateSurvivalFinishCoast(delta);}
    return result;
  }
}
