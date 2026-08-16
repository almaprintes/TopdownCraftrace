import { RaceScene as CurrentRaceScene } from './RaceAntiCutPenaltyScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const MODE_KEY='tdr2:gameMode';

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
  const rX=bx-ax,rY=by-ay,sX=dx-cx,sY=dy-cy;
  const den=rX*sY-rY*sX;
  if(Math.abs(den)<1e-8)return false;
  const qpx=cx-ax,qpy=cy-ay;
  const t=(qpx*sY-qpy*sX)/den;
  const u=(qpx*rY-qpy*rX)/den;
  return t>=0&&t<=1&&u>=0&&u<=1;
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    this._survivalMode=readMode(data)==='survival';
    this._survivalBots=[];
    this._survivalEliminationLap=0;
    this._survivalFinished=false;
    this._survivalPlayerOut=false;
    this._survivalRaceWasStarted=false;
    this._survivalStartPerf=0;
    this._survivalPathOffset=0;
    this._survivalHistoryBaseLen=0;
    this._survivalPlayerCompletedLaps=0;
    this._survivalPlayerProgressBase=0;
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
    const cl=this._survivalCenterline(),gate=this._survivalFinishGate();
    if(cl.length<2||!gate)return 0;
    let bestI=0,bestD=Infinity;
    for(let i=0;i<cl.length;i++){
      const p=cl[i],x=Number(p?.x??p?.[0]),y=Number(p?.y??p?.[1]);
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      const d=(x-gate.mx)*(x-gate.mx)+(y-gate.my)*(y-gate.my);
      if(d<bestD){bestD=d;bestI=i;}
    }
    return bestI/cl.length;
  }

  _survivalPathPoint(progress,lane=0){
    const cl=this._survivalCenterline(),n=cl.length;if(n<2)return null;
    const logical=Number(progress)+Number(this._survivalPathOffset||0);
    const p=((logical%1)+1)%1,f=p*n,i=Math.floor(f)%n,j=(i+1)%n,t=f-Math.floor(f);
    const a=cl[i],b=cl[j];
    const ax=Number(a?.x??a?.[0]),ay=Number(a?.y??a?.[1]),bx=Number(b?.x??b?.[0]),by=Number(b?.y??b?.[1]);
    if(![ax,ay,bx,by].every(Number.isFinite))return null;
    const dx=bx-ax,dy=by-ay,len=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
    return{x:ax+dx*t+nx*lane,y:ay+dy*t+ny*lane,r:Math.atan2(dy,dx)};
  }

  _survivalSurfaceId(){
    const id=String(this.track?.meta?.surface||this.track?.surface||this.track?.meta?.category||'').toLowerCase();
    const key=String(this.trackKey||'').toLowerCase();
    if(id.includes('dirt')||id.includes('tierra')||key.includes('raven')||key.includes('offroad'))return'DIRT';
    return'ASPHALT';
  }

  _survivalPlayerBestLapMs(){
    const key=this.trackKey||(()=>{try{return localStorage.getItem('tdr2:trackKey')||'track01';}catch{return'track01';}})();
    try{
      const h=JSON.parse(localStorage.getItem(`tdr2:ttHist:${key}`)||'null')?.history;
      if(!Array.isArray(h))return null;
      let best=null;
      for(const r of h){const ms=Number(r?.lapMs);if(Number.isFinite(ms)&&ms>5000&&(best==null||ms<best))best=ms;}
      return best;
    }catch{return null;}
  }

  _initSurvival(){
    if(!this._survivalMode||this._survivalBots.length)return;
    const visual=visualCarSprite(this),cl=this._survivalCenterline();if(!visual||cl.length<2)return;
    const tex=visual.texture.key;
    this._survivalPathOffset=this._survivalFindFinishOffset();

    const surfaceId=this._survivalSurfaceId(),playerSpec=CAR_SPECS?.[this.carId]||CAR_SPECS?.[this.selectedCarId]||{};
    const surface=resolveVehicleSurface(playerSpec,surfaceId),lenPx=Math.max(100,pathLength(cl));
    const playerMax=Math.max(120,Number(this.maxFwd||this.carParams?.maxFwd||420));

    const bestMs=this._survivalPlayerBestLapMs();
    let baseLapSec;
    if(Number.isFinite(bestMs))baseLapSec=clamp(bestMs/1000,12,180);
    else{
      const surfacePace=clamp((surface.speedCapacity||1)*(surface.movingDriveCapacity||1),.42,1.02);
      const conservativeAverage=playerMax*surfacePace*.36;
      baseLapSec=clamp(lenPx/Math.max(55,conservativeAverage),28,120);
    }
    const lapMultipliers=[1.22,1.18,1.14,1.10,1.07];

    const carWidth=Math.max(12,Number(visual.displayWidth||visual.width||28));
    const carLength=Math.max(20,Number(visual.displayHeight||visual.height||48));
    const laneGap=clamp(carWidth*.72,8,18);
    const rowGap=clamp(carLength*1.45,26,60);

    for(let i=0;i<5;i++){
      const sprite=this.add.image(0,0,tex).setOrigin(visual.originX??.5,visual.originY??.5).setDepth(Math.max(29,Number(this.carRig?.depth||30)-1));
      sprite.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));
      sprite.clearTint?.();sprite.setAlpha(1).setBlendMode('NORMAL');
      try{this.uiCam?.ignore?.(sprite);}catch{}

      const row=Math.floor(i/2)+1;
      const lane=(i%2===0?-1:1)*laneGap;
      const startProgress=-(row*rowGap)/lenPx;
      const targetRate=1/(baseLapSec*lapMultipliers[i]);
      const p=this._survivalPathPoint(startProgress,lane);
      const bot={
        id:`CPU ${i+1}`,sprite,absProgress:startProgress,lapRate:0,targetRate,lane,active:true,launchDelay:i*.08,
        finishPasses:0,completedLaps:0,distanceSinceFinish:0,prevX:p?.x??0,prevY:p?.y??0
      };
      this._survivalBots.push(bot);
      if(p){sprite.setPosition(p.x,p.y);sprite.rotation=p.r+Number(this._carVisualRotOffset||0);}
    }
    this._createSurvivalHud();
  }

  _createSurvivalHud(){
    if(this._survivalHud?.scene)return;
    const c=this.add.container(this.scale.width/2,14).setDepth(5200).setScrollFactor(0);
    const bg=this.add.rectangle(0,0,300,42,0x06131b,.84).setOrigin(.5,0).setStrokeStyle(1,0xffc94a,.65);
    const title=this.add.text(0,7,'⚡ SUPERVIVENCIA · 6 COCHES',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffd76e'}).setOrigin(.5,0);
    const state=this.add.text(0,24,'PARRILLA · esperando semáforo',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',color:'#d8e4ec'}).setOrigin(.5,0);
    c.add([bg,title,state]);c._state=state;this._survivalHud=c;
  }

  _survivalCurrentHistoryLen(){return Array.isArray(this.ttHistory)?this.ttHistory.length:0;}

  _survivalPlayerRelativeProgress(){
    const raw=clamp(Number(this._computeLapProgress01?.(Number(this.carBody?.x),Number(this.carBody?.y))||0),0,1);
    let rel=raw-Number(this._survivalPlayerProgressBase||0);if(rel<0)rel+=1;
    return clamp(rel,0,.999999);
  }

  _survivalPlayerAbsProgress(){return Math.max(0,Number(this._survivalPlayerCompletedLaps||0))+this._survivalPlayerRelativeProgress();}

  _survivalEntries(){
    const arr=[{id:'TÚ',player:true,active:!this._survivalPlayerOut,absProgress:this._survivalPlayerAbsProgress()}];
    for(const b of this._survivalBots)if(b.active)arr.push({...b,absProgress:Number(b.completedLaps||0)+(((Number(b.absProgress)||0)%1+1)%1)});
    return arr.filter(e=>e.active).sort((a,b)=>b.absProgress-a.absProgress);
  }

  _eliminateSurvivalLast(){
    const ranked=this._survivalEntries();if(ranked.length<=1)return;
    const last=ranked[ranked.length-1];
    if(last.player){this._survivalPlayerOut=true;this._showSurvivalNotice('ELIMINADO','Has terminado último al cruzar meta','#ff667a');}
    else{const bot=this._survivalBots.find(b=>b.id===last.id);if(bot){bot.active=false;bot.sprite?.setVisible(false);}this._showSurvivalNotice(`${last.id} ELIMINADO`,'Último clasificado al cruzar meta','#ffd76e');}
    const remaining=this._survivalEntries();
    if(remaining.length===1){this._survivalFinished=true;const win=remaining[0].player;this._showSurvivalNotice(win?'¡SUPERVIVENCIA GANADA!':`${remaining[0].id} GANA`,win?'Eres el último coche en pista':'Carrera terminada',win?'#62ffb2':'#ff8b78',true);}
  }

  _showSurvivalNotice(title,sub,color='#ffd76e',persistent=false){
    try{this._survivalNotice?.destroy?.(true);}catch{}
    const c=this.add.container(this.scale.width/2,82).setDepth(9000).setScrollFactor(0),bg=this.add.rectangle(0,0,310,62,0x071018,.92).setOrigin(.5,0).setStrokeStyle(2,Number(`0x${color.replace('#','')}`),.8),a=this.add.text(0,10,title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'17px',fontStyle:'bold',color}).setOrigin(.5,0),b=this.add.text(0,36,sub,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',color:'#d7e2e9'}).setOrigin(.5,0);
    c.add([bg,a,b]);this._survivalNotice=c;if(!persistent)this.time.delayedCall(1700,()=>{if(c?.scene)c.destroy(true);if(this._survivalNotice===c)this._survivalNotice=null;});
  }

  _updateSurvivalBots(deltaMs){
    if(!this._survivalMode||!this._survivalBots.length)return;
    if(!this._raceStarted){if(this._survivalHud?._state?.scene)this._survivalHud._state.setText('PARRILLA · esperando semáforo');return;}

    if(!this._survivalRaceWasStarted){
      this._survivalRaceWasStarted=true;
      this._survivalEliminationLap=0;
      this._survivalStartPerf=performance.now();
      this._survivalHistoryBaseLen=this._survivalCurrentHistoryLen();
      this._survivalPlayerCompletedLaps=0;
      this._survivalPlayerProgressBase=clamp(Number(this._computeLapProgress01?.(Number(this.carBody?.x),Number(this.carBody?.y))||0),0,1);
    }

    const gate=this._survivalFinishGate();
    const dt=Math.max(0,Number(deltaMs)||0)/1000;
    const elapsed=Math.max(0,(performance.now()-this._survivalStartPerf)/1000);
    for(const b of this._survivalBots){
      if(!b.active)continue;
      const local=Math.max(0,elapsed-b.launchDelay),launch01=clamp(local/3.0,0,1);
      const desired=b.targetRate*(.18+.82*(1-Math.pow(1-launch01,2)));
      b.lapRate+=(desired-b.lapRate)*clamp(dt*2.4,0,1);
      const before=Number(b.absProgress)||0;
      b.absProgress+=b.lapRate*dt;
      b.distanceSinceFinish+=Math.max(0,b.absProgress-before);
      const p=this._survivalPathPoint(b.absProgress,b.lane);if(!p)continue;

      if(gate&&Number.isFinite(b.prevX)&&Number.isFinite(b.prevY)&&segIntersect(b.prevX,b.prevY,p.x,p.y,gate.ax,gate.ay,gate.bx,gate.by)){
        if(b.finishPasses===0){
          // First crossing after lights-out only establishes the start line passage.
          b.finishPasses=1;b.distanceSinceFinish=0;
        }else if(b.distanceSinceFinish>.55){
          // A lap exists only after physically crossing the real finish gate again
          // having travelled most of a lap since the previous finish crossing.
          b.finishPasses+=1;b.completedLaps+=1;b.distanceSinceFinish=0;
        }
      }

      b.prevX=p.x;b.prevY=p.y;
      b.sprite.setPosition(p.x,p.y);b.sprite.rotation=p.r+Number(this._carVisualRotOffset||0);
    }

    // Player laps come from the normal race timer, which is itself triggered by the real finish gate.
    this._survivalPlayerCompletedLaps=Math.max(0,this._survivalCurrentHistoryLen()-this._survivalHistoryBaseLen);

    let maxCompletedLap=this._survivalPlayerCompletedLaps;
    for(const b of this._survivalBots)if(b.active)maxCompletedLap=Math.max(maxCompletedLap,Number(b.completedLaps||0));

    if(maxCompletedLap>this._survivalEliminationLap){
      for(let lap=this._survivalEliminationLap+1;lap<=maxCompletedLap;lap++)if(this._survivalEntries().length>1)this._eliminateSurvivalLast();
      this._survivalEliminationLap=maxCompletedLap;
    }

    const ranked=this._survivalEntries();
    if(this._survivalHud?._state?.scene){
      const idx=ranked.findIndex(e=>e.player),pos=idx<0?ranked.length+1:idx+1;
      const lapTxt=Math.max(this._survivalPlayerCompletedLaps,...this._survivalBots.filter(b=>b.active).map(b=>Number(b.completedLaps||0)));
      this._survivalHud._state.setText(this._survivalPlayerOut?`ELIMINADO · ${ranked.length} coches siguen`:`POSICIÓN ${pos}/${ranked.length} · ronda ${lapTxt+1} · meta real activa`);
    }
  }

  _destroySurvival(){for(const b of this._survivalBots){try{b.sprite?.destroy?.();}catch{}}this._survivalBots=[];try{this._survivalHud?.destroy?.(true);}catch{}try{this._survivalNotice?.destroy?.(true);}catch{}this._survivalHud=null;this._survivalNotice=null;}

  update(time,delta){const result=super.update(time,delta);if(this._survivalMode){this._updateSurvivalBots(delta);if(this._survivalPlayerOut||this._survivalFinished){try{this.carBody?.setVelocity?.(0,0);this.carBody?.setAngularVelocity?.(0);}catch{}}}return result;}
}
