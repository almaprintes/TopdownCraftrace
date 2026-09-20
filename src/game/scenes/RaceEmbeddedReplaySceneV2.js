import { RaceScene as EmbeddedReplayRaceScene } from './RaceEmbeddedReplayScene.js';
import { CarEngineSampleRuntime } from '../audio/CarEngineSampleRuntime.js';

const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
const STATS_REPLAY_KEY='tdr2:statsNativeReplay';
const SETTINGS_KEY='tdr2:settings';
const GAMEPAD_UI_CLASS='tdr-gamepad-active';
const GAMEPAD_UI_STYLE='tdr-gamepad-touch-ui-style';

function readPendingReplay(){try{const raw=JSON.parse(sessionStorage.getItem(STATS_REPLAY_KEY)||'null');return raw&&Array.isArray(raw.samples)&&raw.samples.length>4?raw:null;}catch{return null;}}
function connectedGamepad(){try{return Array.from(navigator.getGamepads?.()||[]).some(pad=>pad&&pad.connected!==false);}catch{return false;}}
function gamepadSelected(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls?.steeringMode==='gamepad';}catch{return false;}}
function installGamepadUiStyle(){
  try{
    if(document.getElementById(GAMEPAD_UI_STYLE))return;
    const style=document.createElement('style');style.id=GAMEPAD_UI_STYLE;
    // Never hide #tdr-race-controls: it also owns DELTA/PAUSE. Only driving touch UI is hidden.
    style.textContent=`body.${GAMEPAD_UI_CLASS} #tdr-steering-wheel,body.${GAMEPAD_UI_CLASS} #tdr-race-controls [data-stick],body.${GAMEPAD_UI_CLASS} [data-tdr-touch-controls],body.${GAMEPAD_UI_CLASS} [data-tdr-steering-button]{display:none!important;visibility:hidden!important;pointer-events:none!important}`;
    document.head.appendChild(style);
  }catch{}
}

export class RaceScene extends EmbeddedReplayRaceScene{
  init(data){
    const pending=data?.statsNativeReplay?readPendingReplay():null;
    const requested=String(pending?.trackId||data?.trackKey||this.track?.id||this.track?.key||'').trim();
    if(requested)this.trackKey=requested;
    return super.init?.(data);
  }

  create(data){
    const pending=data?.statsNativeReplay?readPendingReplay():null;
    const embeddedRequested=data?.statsEmbeddedReplay===true||pending?.embedded===true;
    if(embeddedRequested){
      // Replay is a viewer, never a live race. Remove old race/debug DOM before
      // the scene is built so it cannot leak into Race Control or survive shutdown.
      try{document.querySelectorAll('#tdr-replay-controls,[data-tdr-race-ui="1"],[data-tdr-ghost-diagnostic],[data-online-ghost-diagnostic]').forEach(n=>n.remove());}catch{}
    }
    const replayTrackKey=String(pending?.trackId||data?.trackKey||'').trim();
    const createData=replayTrackKey?{...(data||{}),trackKey:replayTrackKey}:data;
    this._tdrEmbeddedReplay=embeddedRequested===true;

    let blockedAutoStart=false;
    const clock=this.time,originalDelayed=clock?.delayedCall?.bind(clock);
    if(originalDelayed){clock.delayedCall=(delay,cb,args,scope)=>{const src=String(cb||'');if(Number(delay)===150&&src.includes('_startAutoFired')&&src.includes('RED LIGHTS')){blockedAutoStart=true;return{remove(){},destroy(){}};}return originalDelayed(delay,cb,args,scope);};}
    let result;try{result=super.create(createData);}finally{if(originalDelayed)clock.delayedCall=originalDelayed;}

    installGamepadUiStyle();
    this._tdrGamepadConnectedHandler=()=>this._tdrSyncGamepadUi(true);
    this._tdrGamepadDisconnectedHandler=()=>this._tdrSyncGamepadUi(true);
    this._tdrGamepadFocusHandler=()=>this._tdrSyncGamepadUi(true);
    try{
      window.addEventListener('gamepadconnected',this._tdrGamepadConnectedHandler);
      window.addEventListener('gamepaddisconnected',this._tdrGamepadDisconnectedHandler);
      window.addEventListener('focus',this._tdrGamepadFocusHandler);
      window.addEventListener('pageshow',this._tdrGamepadFocusHandler);
    }catch{}
    this._tdrSyncGamepadUi(true);

    if(!embeddedRequested&&!this._tdrEmbeddedReplay){
      try{
        this._tdrEngineSample?.destroy?.();this._tdrEngineSample=new CarEngineSampleRuntime(this);this._tdrInstallIgnitionStart(blockedAutoStart);
        this.events.once('shutdown',()=>{this._tdrRemoveIgnitionButton();this._tdrEngineSample?.destroy?.();this._tdrEngineSample=null;});
      }catch(e){console.warn('[TDR2 ignition] init failed',e);}
    }else this._tdrRemoveIgnitionButton();
    this.events.once('shutdown',()=>{this._tdrCleanupGamepadUi();try{document.querySelectorAll('#tdr-replay-controls,[data-tdr-stats-native-replay="1"],[data-tdr-embedded-replay="1"],[data-tdr-ghost-diagnostic],[data-online-ghost-diagnostic]').forEach(n=>n.remove());}catch{}try{document.body.classList.remove('tdr-native-replay-clean');}catch{}});
    return result;
  }

  _tdrHideResidualPhaserSteering(){
    if(!this._tdrGamepadUiActive)return;
    // The last visible stick is a legacy Phaser HUD object outside touchUI.
    // Target only fixed-camera graphics/images in the lower-left steering zone;
    // world scenery and the central HUD use different scroll factors/positions.
    const w=Number(this.scale?.width)||0,h=Number(this.scale?.height)||0;
    if(!w||!h)return;
    try{
      for(const obj of this.children?.list||[]){
        if(!obj||obj===this.carBody||obj.visible===false)continue;
        const sx=Number(obj.scrollFactorX),sy=Number(obj.scrollFactorY),x=Number(obj.x),y=Number(obj.y);
        if(sx!==0||sy!==0||!Number.isFinite(x)||!Number.isFinite(y))continue;
        if(x>w*.34||y<h*.42)continue;
        const type=String(obj.type||obj.constructor?.name||'').toLowerCase();
        if(!/(graphics|image|sprite|ellipse|circle|arc)/.test(type))continue;
        try{obj.setVisible?.(false);obj.disableInteractive?.();}catch{}
      }
    }catch{}
  }

  _tdrApplyGamepadDrivingUi(active){
    // Single ownership rule: this layer only toggles the gamepad CSS class.
    // PALANCA/BOTONES/VOLANTE are never repaired or rewritten here.
    // Gamepad-only destruction/hiding is owned by RaceGamepadScene at scene creation.
    try{document.body.classList.toggle(GAMEPAD_UI_CLASS,active);}catch{}
  }

  _tdrSyncGamepadUi(force=false){
    if(this._tdrEmbeddedReplay)return;
    // A connected pad must not suppress touch controls unless MANDO is explicitly selected.
    // Browsers keep paired controllers visible in navigator.getGamepads() even after the user switches back to PALANCA/BOTONES/VOLANTE.
    const active=gamepadSelected();
    if(!force&&active===this._tdrGamepadUiActive)return;
    this._tdrGamepadUiActive=active;
    this._tdrApplyGamepadDrivingUi(active);
  }

  _tdrCleanupGamepadUi(){
    try{
      window.removeEventListener('gamepadconnected',this._tdrGamepadConnectedHandler);window.removeEventListener('gamepaddisconnected',this._tdrGamepadDisconnectedHandler);
      window.removeEventListener('focus',this._tdrGamepadFocusHandler);window.removeEventListener('pageshow',this._tdrGamepadFocusHandler);
      document.body.classList.remove(GAMEPAD_UI_CLASS);
    }catch{}
    this._tdrGamepadConnectedHandler=null;this._tdrGamepadDisconnectedHandler=null;this._tdrGamepadFocusHandler=null;this._tdrGamepadUiActive=false;
  }

  _startStatsNativeReplay(payload){
    if(payload?.embedded===true&&this.track?.geom?.cells){const previousCull=this._cullEnabled;this._cullEnabled=false;try{super.update(performance.now(),0);}catch(err){console.warn('[TDR replay] full-track warmup skipped',err);}this._cullEnabled=previousCull;}
    return super._startStatsNativeReplay(payload);
  }

  _tdrInstallIgnitionStart(blockedAutoStart){
    this._raceStarted=false;this._startAutoFired=true;this._startState='WAIT_ENGINE';
    if(this._startHint)this._startHint.setText('Arranca el motor para preparar la salida');
    if(this._startStatus){this._startStatus.setText('ENGINE OFF');this._startStatus.setColor('#ffffff');}
    if(!blockedAutoStart)console.warn('[TDR2 ignition] legacy auto-start timer was not intercepted');
    this._tdrRemoveIgnitionButton();
    const host=this.game?.canvas?.parentElement||document.body,btn=document.createElement('button');
    btn.id='tdr-ignition-start';btn.type='button';btn.textContent='◉  ARRANCAR MOTOR';
    Object.assign(btn.style,{position:'fixed',left:'50%',top:'58%',transform:'translate(-50%,-50%)',zIndex:'2147483000',minWidth:'230px',padding:'16px 24px',borderRadius:'14px',border:'1px solid rgba(255,255,255,.34)',background:'rgba(5,12,22,.94)',color:'#fff',font:'800 16px Orbitron,system-ui,sans-serif',letterSpacing:'.08em',boxShadow:'0 10px 36px rgba(0,0,0,.48)',touchAction:'manipulation'});
    const start=(ev)=>{ev?.preventDefault?.();ev?.stopPropagation?.();if(this._startState!=='WAIT_ENGINE')return;try{navigator.vibrate?.(35);}catch{}this._tdrEngineSample?.startEngine?.();this._startState='READY';if(this._startHint)this._startHint.setText('Motor encendido · puedes acelerar');if(this._startStatus){this._startStatus.setText('ENGINE ON');this._startStatus.setColor('#2bff88');}btn.textContent='MOTOR ENCENDIDO ✓';btn.disabled=true;setTimeout(()=>{this._tdrRemoveIgnitionButton();this._tdrBeginLights();},650);};
    btn.addEventListener('pointerup',start,{once:true});host.appendChild(btn);this._tdrIgnitionButton=btn;
  }
  _tdrRemoveIgnitionButton(){try{this._tdrIgnitionButton?.remove?.();}catch{}this._tdrIgnitionButton=null;}
  _tdrBeginLights(){
    if(this._startState!=='READY')return;this._startState='COUNTDOWN';
    if(this._startHint)this._startHint.setText('Mantente listo...');if(this._startStatus){this._startStatus.setText('RED LIGHTS');this._startStatus.setColor('#ffffff');}
    if(this._startAsset)this._startAsset.setTexture('start_base');const stepMs=600;
    for(let i=1;i<=6;i++)this.time.delayedCall(stepMs*i,()=>{if(this._startAsset)this._startAsset.setTexture(`start_l${i}`);});
    const randMs=800+Math.floor(Math.random()*700);this.time.delayedCall(stepMs*6+randMs,()=>{this._startState='GO';if(this._startAsset)this._startAsset.setTexture('start_base');if(this._startStatus){this._startStatus.setText('GO!');this._startStatus.setColor('#2bff88');}if(this.timing){this.timing.lapStart=performance.now();this.timing.started=true;this.timing.s1=null;this.timing.s2=null;this.timing.s3=null;}this._raceStarted=true;this._tdrClutchReleaseAt=performance.now();this.time.delayedCall(350,()=>{this._startState='RACING';if(this._startModal)this._startModal.setVisible(false);});});
  }

  update(time,delta){
    const androidNormal=/Android/i.test(String(navigator?.userAgent||''))&&!this._tdrEmbeddedReplay;
    // DEV 1.1.32 A/B: keep the V2 scene in the inheritance chain so race entry stays
    // intact, but bypass its per-frame UI/gamepad scanning on normal Android races.
    // Ignition/audio setup remains untouched; this isolates the frame-loop additions.
    if(!androidNormal){
      this._tdrSyncGamepadUi();
      this._tdrHideResidualPhaserSteering();
    }
    let originalThrottle=null;
    if(this._raceStarted&&this._tdrClutchReleaseAt&&this.touch){originalThrottle=Number(this.touch.throttle)||0;const clutch=clamp01((performance.now()-this._tdrClutchReleaseAt)/350);this.touch.throttle=originalThrottle*clutch;}
    try{super.update(time,delta);}finally{if(originalThrottle!==null&&this.touch)this.touch.throttle=originalThrottle;}
    if(!androidNormal)this._tdrHideResidualPhaserSteering();
    try{this._tdrEngineSample?.update?.();}catch{}
  }

  _syncEmbeddedSourceCamera(){
    if(!this._tdrEmbeddedReplay)return;const cam=this.cameras?.main,target=this._embeddedReplayTarget?.(),gameW=Number(this.scale?.width)||Number(this.game?.canvas?.width)||1,gameH=Number(this.scale?.height)||Number(this.game?.canvas?.height)||1;let vw=gameW,vh=gameH,vx=0,vy=0;const rect=target?.getBoundingClientRect?.();if(rect?.width>1&&rect?.height>1){const targetAspect=rect.width/rect.height,gameAspect=gameW/gameH;if(gameAspect>targetAspect){vw=Math.max(1,gameH*targetAspect);vx=(gameW-vw)*.5;}else{vh=Math.max(1,gameW/targetAspect);vy=(gameH-vh)*.5;}}this._tdrEmbeddedViewport={x:vx,y:vy,w:vw,h:vh};try{cam?.setVisible?.(true);cam?.setViewport?.(vx,vy,vw,vh);}catch{}
  }
  _applyStatsReplayFrame(t){super._applyStatsReplayFrame(t);if(!this._tdrEmbeddedReplay)return;this._syncEmbeddedSourceCamera();const x=Number(this.carBody?.x),y=Number(this.carBody?.y);if(Number.isFinite(x)&&Number.isFinite(y)){try{this.cameras?.main?.stopFollow?.();this.cameras?.main?.centerOn?.(x,y);}catch{}}}
  _copyEmbeddedReplayFrame(){
    if(!this._tdrEmbeddedReplay)return;const src=this.game?.canvas,feed=this._ensureEmbeddedFeed?.(),target=this._embeddedReplayTarget?.();if(!src||!feed||!target)return;const rect=target.getBoundingClientRect?.();if(!rect||rect.width<=1||rect.height<=1)return;this._syncEmbeddedSourceCamera();const dpr=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1)),dw=Math.max(1,Math.round(rect.width*dpr)),dh=Math.max(1,Math.round(rect.height*dpr));if(feed.width!==dw)feed.width=dw;if(feed.height!==dh)feed.height=dh;const sw=Number(src.width)||1,sh=Number(src.height)||1,gameW=Number(this.scale?.width)||1,gameH=Number(this.scale?.height)||1,scaleX=sw/gameW,scaleY=sh/gameH,vp=this._tdrEmbeddedViewport||{x:0,y:0,w:gameW,h:gameH},sx=Math.max(0,Math.round(vp.x*scaleX)),sy=Math.max(0,Math.round(vp.y*scaleY)),cw=Math.max(1,Math.min(sw-sx,Math.round(vp.w*scaleX))),ch=Math.max(1,Math.min(sh-sy,Math.round(vp.h*scaleY)));try{const ctx=feed.getContext('2d',{alpha:false});if(!ctx)return;ctx.drawImage(src,sx,sy,cw,ch,0,0,dw,dh);this._drawReplayAnalysis?.(ctx,{sx:0,sy:0,cw,ch,dw,dh,dpr});}catch{}
  }
}
