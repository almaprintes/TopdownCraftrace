import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifePitReportScene.js';
import { buildTrackRacingLineModel } from '../ai/trackRacingLinePlanner.js';
import { buildTrackSpeedProfile } from '../ai/trackSpeedProfilePlanner.js';
import { buildTrackManeuverPlan } from '../ai/trackManeuverPlanner.js';
import { updateSurvivalPhysicalBot as updateDuelPhysicalBot } from '../ai/survivalPhysicalBotController.js';

const DUEL_LAPS_KEY='tdr2:duelLaps';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function readDuelLaps(){
  try{const n=Number(localStorage.getItem(DUEL_LAPS_KEY)||15);return[5,10,15].includes(n)?n:15;}catch{return 15;}
}
function visualCarSprite(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>o?.visible!==false&&o?.texture?.key&&o.texture.key!=='__BODY__'&&scene.textures?.exists?.(o.texture.key))||null;
}
function centerline(scene){
  const cl=scene.track?.meta?.raceCenterline||scene.track?.meta?.centerline||scene.track?.raceCenterline||scene.track?.centerline;
  return Array.isArray(cl)?cl:[];
}
function pt(raw){
  if(Array.isArray(raw))return{x:Number(raw[0]),y:Number(raw[1])};
  return{x:Number(raw?.x),y:Number(raw?.y)};
}
function nearestProgress(cl,x,y){
  if(!Array.isArray(cl)||cl.length<2)return 0;
  let best=0,bestD=Infinity;
  for(let i=0;i<cl.length;i++){
    const p=pt(cl[i]);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
    const d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
    if(d<bestD){bestD=d;best=i;}
  }
  return best/cl.length;
}
function gate(scene){
  const g=scene.finishLine||scene.track?.meta?.finishLine||scene.track?.meta?.finish;
  if(!g?.a||!g?.b)return null;
  const ax=Number(g.a.x),ay=Number(g.a.y),bx=Number(g.b.x),by=Number(g.b.y);
  if(![ax,ay,bx,by].every(Number.isFinite))return null;
  return{ax,ay,bx,by};
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

export class RaceScene extends CurrentRaceScene {
  create(data={}){
    const requested=String(data?.gameMode||(()=>{try{return localStorage.getItem('tdr2:gameMode')||'timeattack';}catch{return'timeattack';}})());
    this._duelStandalone=requested==='duel';
    this._duelLapTarget=this._duelStandalone?readDuelLaps():0;
    this._duelBot=null;
    this._duelProfile=null;
    this._duelTrackModel=null;
    this._duelFinished=false;
    this._duelResultDom=null;
    this._duelHud=null;
    this._duelPlayer={armed:false,laps:0,lastLapAt:0,lapTimes:[],distance:0,prevX:null,prevY:null,lastProgress:null};
    this._duelCpu={armed:false,laps:0,lastLapAt:0,lapTimes:[],distance:0,prevX:null,prevY:null,lastProgress:null};

    // Important: pass DUEL through unchanged. RaceSurvivalModeScene only enables
    // itself for the literal 'survival', so none of its grid/elimination code runs.
    const result=super.create(data);
    if(this._duelStandalone){
      this._tdrGameMode='duel';
      this.time?.delayedCall?.(300,()=>this._initStandaloneDuel());
      this.time?.delayedCall?.(850,()=>{if(!this._duelBot)this._initStandaloneDuel();});
      this.events?.once?.('shutdown',()=>this._destroyStandaloneDuel());
      this.events?.once?.('destroy',()=>this._destroyStandaloneDuel());
    }
    return result;
  }

  _initStandaloneDuel(){
    if(!this._duelStandalone||this._duelBot||this._duelFinished)return;
    const cl=centerline(this),visual=visualCarSprite(this),player=this.carBody;
    if(cl.length<4||!visual?.texture?.key||!player?.scene)return;

    const trackWidth=Math.max(80,Number(this.track?.meta?.trackWidth||this.track?.trackWidth||140));
    this._duelTrackModel=buildTrackRacingLineModel({raceCenterline:cl,trackWidth,offsetScale:1,apexCommitment:.20});
    this._duelProfile=buildTrackManeuverPlan(buildTrackSpeedProfile(this._duelTrackModel,{lateralAccel:1500,minCornerSpeed:125}));
    if(!this._duelProfile?.valid||!Array.isArray(this._duelProfile.samples)||this._duelProfile.samples.length<4){
      this._showDuelInitError('No se pudo calcular la trazada de CPU1');return;
    }

    const rot=Number(player.rotation||0),fx=Math.cos(rot),fy=Math.sin(rot),rx=-fy,ry=fx;
    const startX=Number(player.x)-fx*46+rx*26;
    const startY=Number(player.y)-fy*46+ry*26;
    const sprite=this.add.image(startX,startY,visual.texture.key)
      .setOrigin(visual.originX??.5,visual.originY??.5)
      .setScale(Number(visual.scaleX||1),Number(visual.scaleY||1))
      .setDepth(Math.max(31,Number(this.carRig?.depth||30)+1));
    sprite.clearTint?.();sprite.setAlpha(1).setBlendMode('NORMAL');
    try{this.uiCam?.ignore?.(sprite);}catch{}

    const body=this.physics.add.sprite(startX,startY,'__BODY__');
    body.setVisible(false);
    body.setCircle(Math.max(7,Math.round(Math.min(Number(sprite.displayWidth||28),Number(sprite.displayHeight||48))*.22)));
    body.setCollideWorldBounds(true);body.setBounce(0);body.setDrag(0,0);body.rotation=rot;body.setVelocity(0,0);

    const samples=this._duelProfile.samples;
    let nearest=0,bestD=Infinity;
    for(let i=0;i<samples.length;i++){
      const p=samples[i],dx=Number(p.x)-startX,dy=Number(p.y)-startY,d=dx*dx+dy*dy;
      if(d<bestD){bestD=d;nearest=i;}
    }
    const bot={id:'CPU1',active:true,sprite,plannerBody:body,_plannerSampleIndex:nearest,_plannerFrac:nearest/samples.length,_plannerControl:null};
    this._duelBot=bot;
    this._duelCpu.prevX=startX;this._duelCpu.prevY=startY;
    this._duelCpu.lastProgress=nearestProgress(cl,startX,startY);
    this._duelPlayer.prevX=Number(player.x);this._duelPlayer.prevY=Number(player.y);
    this._duelPlayer.lastProgress=nearestProgress(cl,Number(player.x),Number(player.y));
    this._createStandaloneDuelHud();
  }

  _createStandaloneDuelHud(){
    if(this._duelHud?.scene)return;
    const c=this.add.container(this.scale.width/2,14).setDepth(7200).setScrollFactor(0);
    const bg=this.add.rectangle(0,0,370,44,0x101720,.90).setOrigin(.5,0).setStrokeStyle(1,0xff9f43,.82);
    const title=this.add.text(0,6,'🏎️ DUELO · TÚ VS CPU1',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffc27a'}).setOrigin(.5,0);
    const state=this.add.text(0,24,`PARRILLA · ${this._duelLapTarget} VUELTAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',color:'#d9e4ed'}).setOrigin(.5,0);
    c.add([bg,title,state]);c._state=state;c._title=title;this._duelHud=c;
  }

  _showDuelInitError(message){
    if(this._duelFinished)return;
    this._duelFinished=true;
    try{this.physics?.world?.pause?.();}catch{}
    this._createStandaloneDuelHud();
    this._duelHud?._title?.setText?.('🏎️ DUELO · CPU1 NO DISPONIBLE').setColor?.('#ff7788');
    this._duelHud?._state?.setText?.(message);
  }

  _updateProgressState(state,x,y,cl){
    const p=nearestProgress(cl,x,y),prev=Number(state.lastProgress);
    if(Number.isFinite(prev)){
      let d=p-prev;if(d<-.5)d+=1;if(d>.5)d-=1;
      if(d>0)state.distance+=d;
    }
    state.lastProgress=p;
  }

  _crossDuelFinish(state,isPlayer){
    const now=performance.now();
    if(!state.armed){
      state.armed=true;state.distance=0;state.lastLapAt=now;return;
    }
    if(state.distance<.70)return;
    const lapMs=now-Number(state.lastLapAt||now);
    state.laps+=1;state.distance=0;state.lastLapAt=now;
    if(Number.isFinite(lapMs)&&lapMs>1000)state.lapTimes.push(lapMs);
    if(state.laps>=this._duelLapTarget)this._finishStandaloneDuel(isPlayer?'player':'cpu1');
  }

  _finishStandaloneDuel(winner){
    if(this._duelFinished)return;
    this._duelFinished=true;this._duelWinner=winner;
    try{this.physics?.world?.pause?.();}catch{}
    this._duelHud?._title?.setText?.(winner==='player'?'🏆 DUELO · VICTORIA':'🏎️ DUELO · CPU1 GANA');
    this._duelHud?._state?.setText?.(`${this._duelLapTarget}/${this._duelLapTarget} VUELTAS · FIN`);
    this.time?.delayedCall?.(450,()=>this._showStandaloneDuelResult());
  }

  _showStandaloneDuelResult(){
    if(typeof document==='undefined'||this._duelResultDom)return;
    const p=this._duelPlayer.lapTimes,c=this._duelCpu.lapTimes,pb=p.length?Math.min(...p):null,cb=c.length?Math.min(...c):null;
    const root=document.createElement('div');root.dataset.tdrRaceUi='1';
    root.innerHTML=`<style>.duel-v{position:fixed;inset:0;z-index:15000;background:#02060cd9;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.duel-c{width:min(88vw,500px);background:#091722;border:2px solid #ff9f43;padding:22px;color:white}.duel-k{font-size:9px;font-weight:900;letter-spacing:.16em;color:#ffb45f}.duel-t{font-size:27px;font-weight:950;margin:5px 0 16px}.duel-g{display:grid;grid-template-columns:1fr 1fr;gap:9px}.duel-s{background:#111f2b;border:1px solid #314353;padding:12px;text-align:center}.duel-s small{display:block;color:#8fa2b4;font-size:8px;font-weight:900;margin-bottom:5px}.duel-s b{font-size:18px}.duel-a{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.duel-a button{height:44px;border:1px solid #526b7d;background:#122536;color:white;font:900 10px system-ui}.duel-a .p{border-color:#ff9f43;background:#4a2b10}</style><div class="duel-v"><div class="duel-c"><div class="duel-k">DUELO · ${this._duelLapTarget} VUELTAS</div><div class="duel-t">${this._duelWinner==='player'?'🏆 VICTORIA':'CPU1 GANA'}</div><div class="duel-g"><div class="duel-s"><small>TU MEJOR VUELTA</small><b>${fmtLap(pb)}</b></div><div class="duel-s"><small>MEJOR CPU1</small><b>${fmtLap(cb)}</b></div></div><div class="duel-a"><button class="p" data-a="again">OTRO DUELO</button><button data-a="menu">MENÚ</button></div></div></div>`;
    document.body.appendChild(root);this._duelResultDom=root;
    root.querySelector('[data-a="again"]')?.addEventListener('click',()=>{try{root.remove();}catch{}this._duelResultDom=null;try{this.physics?.world?.resume?.();}catch{}this.scene.restart({carId:this.carId||this.selectedCarId,trackKey:this.trackKey,gameMode:'duel'});});
    root.querySelector('[data-a="menu"]')?.addEventListener('click',()=>{try{root.remove();}catch{}this._duelResultDom=null;try{this.physics?.world?.resume?.();}catch{}this.scene.start('menu');});
  }

  _destroyStandaloneDuel(){
    try{this._duelBot?.sprite?.destroy?.();}catch{}
    try{this._duelBot?.plannerBody?.destroy?.();}catch{}
    try{this._duelHud?.destroy?.(true);}catch{}
    try{this._duelResultDom?.remove?.();}catch{}
    this._duelBot=null;this._duelHud=null;this._duelResultDom=null;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(!this._duelStandalone||this._duelFinished)return result;
    if(!this._duelBot){return result;}
    const bot=this._duelBot,body=bot.plannerBody,player=this.carBody;
    if(!body?.body||!player?.scene)return result;

    if(!this._raceStarted){
      body.setVelocity(0,0);
      this._duelHud?._state?.setText?.(`PARRILLA · ${this._duelLapTarget} VUELTAS`);
      return result;
    }

    const maxFwd=Math.max(80,Number(this.maxFwd||this.carParams?.maxFwd||420));
    const control=updateDuelPhysicalBot(bot,this._duelProfile,{
      dt:clamp(Number(delta||16.67)/1000,.001,.05),
      spacing:Number(this._duelTrackModel?.spacing||10),
      maxFwd:maxFwd*.88,
      cornerRisk:.35,
      accel:Number(this.accel||this.carParams?.accel||520),
      brakeForce:Number(this.brakeForce||this.carParams?.brakeForce||720),
      linearDrag:Number(this.linearDrag||this.carParams?.linearDrag||.004),
      turnRate:Number(this.turnRate||this.carParams?.turnRate||2.4),
      steering:this.carParams?.steering||{}
    });
    bot._plannerControl=control;
    bot.sprite.setPosition(Number(body.x),Number(body.y));
    bot.sprite.rotation=Number(body.rotation||0)+Number(this._carVisualRotOffset||0);
    bot.sprite.setVisible(true).setAlpha(1);

    const cl=centerline(this),g=gate(this);
    const px=Number(player.x),py=Number(player.y),cx=Number(body.x),cy=Number(body.y);
    this._updateProgressState(this._duelPlayer,px,py,cl);
    this._updateProgressState(this._duelCpu,cx,cy,cl);
    if(g){
      const ps=this._duelPlayer,cs=this._duelCpu;
      if(Number.isFinite(ps.prevX)&&Number.isFinite(ps.prevY)&&segIntersect(ps.prevX,ps.prevY,px,py,g.ax,g.ay,g.bx,g.by))this._crossDuelFinish(ps,true);
      if(!this._duelFinished&&Number.isFinite(cs.prevX)&&Number.isFinite(cs.prevY)&&segIntersect(cs.prevX,cs.prevY,cx,cy,g.ax,g.ay,g.bx,g.by))this._crossDuelFinish(cs,false);
    }
    this._duelPlayer.prevX=px;this._duelPlayer.prevY=py;this._duelCpu.prevX=cx;this._duelCpu.prevY=cy;

    const leader=(this._duelPlayer.laps+Number(this._duelPlayer.lastProgress||0))>=(this._duelCpu.laps+Number(this._duelCpu.lastProgress||0))?'TÚ':'CPU1';
    this._duelHud?._state?.setText?.(`VUELTAS · TÚ ${this._duelPlayer.laps}/${this._duelLapTarget} · CPU1 ${this._duelCpu.laps}/${this._duelLapTarget} · LÍDER ${leader}`);
    return result;
  }
}
