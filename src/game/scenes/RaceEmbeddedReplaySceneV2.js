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
    // Must exist before Phaser calls preload(): the loading experience is mounted
    // there, before create() gets a chance to derive the embedded replay mode.
    this.statsEmbeddedReplay=data?.statsEmbeddedReplay===true||pending?.embedded===true;
    this._tdrEmbeddedReplay=this.statsEmbeddedReplay;
    return super.init?.(data);
  }

  create(data){
    const pending=data?.statsNativeReplay?readPendingReplay():null;
    const embeddedRequested=data?.statsEmbeddedReplay===true||pending?.embedded===true;
    if(embeddedRequested){
      // Race Control owns replay loading. Suppress every legacy Phaser loading/HUD
      // object before the live race scene is built so none can leak behind the DOM viewer.
      try{this._tdrSuppressEmbeddedLoadingPhaser=true;}catch{}
    }
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
    const result=super._startStatsNativeReplay(payload);
    if(payload?.embedded===true&&this._tdrStatsReplay){
      // Embedded replay has a strict lifecycle: READY means frame 0, paused.
      // Race Control is the only owner allowed to start playback.
      this._tdrStatsReplay.elapsed=0;this._tdrStatsReplay.playing=false;this._tdrStatsReplay.finished=false;
      try{this._applyStatsReplayFrame?.(0);this._copyEmbeddedReplayFrame?.();}catch{}
      requestAnimationFrame(()=>{try{this._copyEmbeddedReplayFrame?.();window.dispatchEvent(new CustomEvent('tdr:embedded-replay-ready'));}catch{}});
    }
    return result;
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

  _tdrHideEmbeddedLoadingPhaserResidue(){
    if(!this._tdrEmbeddedReplay)return;
    const keep=new Set([this.car,this.carBody,this.carRig]);
    try{
      for(const obj of this.children?.list||[]){
        if(!obj||keep.has(obj)||obj.visible===false)continue;
        const sx=Number(obj.scrollFactorX),sy=Number(obj.scrollFactorY),depth=Number(obj.depth);
        const text=String(obj.text||obj._text||'').toUpperCase();
        const loadingText=/CIRCUITO|PREPARANDO|SINCRONIZANDO|SESI[ÓO]N|SUPERFICIE|GR[ÁA]FICOS|CARGANDO|ARRANCANDO|PISTA LISTA|CALENTANDO/.test(text);
        const fixedUi=sx===0&&sy===0&&Number.isFinite(depth)&&depth>=500;
        if(loadingText||fixedUi){try{obj.setVisible?.(false);obj.disableInteractive?.();}catch{}}
      }
    }catch{}
  }

  update(time,delta){
    if(this._tdrEmbeddedReplay)this._tdrHideEmbeddedLoadingPhaserResidue();
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

    // HÉLIX Vortex handling laboratory.
    // Keep the established Physics Base 1.0 untouched for every other car. Vortex is
    // deliberately the development mule: preserve some lateral momentum through the
    // base tyre scrub so body heading and travel direction can separate naturally.
    const vortexFeel=this.carId==='helix_vortex'&&!this._tdrEmbeddedReplay&&this.carBody?.body?.velocity;
    let vortexBefore=null;
    if(vortexFeel){
      const b=this.carBody,rot=Number(b.rotation||0),vx=Number(b.body.velocity.x||0),vy=Number(b.body.velocity.y||0);
      const fx=Math.cos(rot),fy=Math.sin(rot),rx=-fy,ry=fx;
      vortexBefore={vx,vy,vF:vx*fx+vy*fy,vL:vx*rx+vy*ry,rot};
    }

    try{super.update(time,delta);}finally{if(originalThrottle!==null&&this.touch)this.touch.throttle=originalThrottle;}

    if(vortexBefore&&this.carBody?.body?.velocity){
      const b=this.carBody,dt=Math.max(.001,Math.min(.05,Number(delta||16.67)/1000));
      const rot=Number(b.rotation||vortexBefore.rot),fx=Math.cos(rot),fy=Math.sin(rot),rx=-fy,ry=fx;
      const vx=Number(b.body.velocity.x||0),vy=Number(b.body.velocity.y||0);
      const vF=vx*fx+vy*fy,vL=vx*rx+vy*ry;
      const preL=vortexBefore.vx*rx+vortexBefore.vy*ry;
      const speed=Math.hypot(vx,vy),kmh=speed*.185;
      const slipDeg=Math.abs(Math.atan2(vL,Math.max(18,Math.abs(vF))))*180/Math.PI;
      const steer=Math.min(1,Math.abs(Number(this._steerFiltered??this.touch?.steer??this.touch?.stickX??0)));
      const throttle=Math.max(0,Math.min(1,Number(this.touch?.throttle||0)));
      const brake=Math.max(0,Math.min(1,Number(this.touch?.brake||0)));
      const surface=String(this._surface||'TRACK').toUpperCase();
      const asphalt=surface!=='DIRT'&&surface!=='GRASS'&&surface!=='OFF';

      if(asphalt&&kmh>22){
        // Breakaway builds from steering load and existing slip. Once the car is moving
        // sideways, momentum survives even while the nose is already being corrected.
        const speedLoad=clamp01((kmh-22)/88);
        const steerLoad=clamp01((steer-.08)/.72);
        const slipLoad=clamp01((slipDeg-1.5)/8.5);
        const loaded=clamp01(.62*steerLoad*speedLoad+.38*slipLoad);
        const driveSupport=1+.18*throttle*(1-brake);
        const retention=Math.min(.82,(.18+.58*loaded)*driveSupport);
        let targetL=vL+(preL-vL)*retention;

        // Vortex turn-in: keep the useful rear movement, but do not let inherited
        // lateral momentum dominate the first phase of a new steering command.
        // This gives the front axle authority to bite before the whole car washes wide.
        const turnIn=clamp01((steer-.10)/.48)*speedLoad*(1-.42*slipLoad);
        const sameSide=Math.sign(preL)===Math.sign(vL)||Math.abs(vL)<.5;
        if(sameSide&&turnIn>0){
          const frontBite=.28*turnIn*(1-.35*throttle);
          targetL*=1-frontBite;
        }

        // Recovery is intentionally slower than breakaway. Counter-steer changes the
        // heading first; the mass follows afterwards instead of snapping to the nose.
        const neutral=steer<.07;
        const recoveryRate=neutral?(1.25+1.15*(1-slipLoad)):(.48+.72*(1-loaded));
        const recovery=Math.exp(-recoveryRate*dt);
        const preservedL=targetL*recovery;

        // Do not manufacture energy: retain the post-controller forward component and
        // cap the reconstructed vector to the larger of pre/post frame speed.
        let outX=fx*vF+rx*preservedL,outY=fy*vF+ry*preservedL;
        const cap=Math.max(speed,Math.hypot(vortexBefore.vx,vortexBefore.vy))*1.002;
        const outSpeed=Math.hypot(outX,outY);
        if(outSpeed>cap&&outSpeed>0){const k=cap/outSpeed;outX*=k;outY*=k;}
        b.body.velocity.x=outX;b.body.velocity.y=outY;
        this._vortexFeelTelemetry={slipDeg,retention,lateral:preservedL,loaded};
      }
    }

    if(!androidNormal)this._tdrHideResidualPhaserSteering();
    if(this._tdrEmbeddedReplay)this._tdrHideEmbeddedLoadingPhaserResidue();
    try{this._tdrEngineSample?.update?.();}catch{}
  }

  _syncEmbeddedSourceCamera(){
    if(!this._tdrEmbeddedReplay)return;
    // Keep the race renderer at its native full canvas. The Race Control feed below
    // is responsible for fitting that complete frame into the viewer; changing the
    // Phaser viewport here only masks/crops a full-screen replay.
    const cam=this.cameras?.main,gameW=Number(this.scale?.width)||Number(this.game?.canvas?.width)||1,gameH=Number(this.scale?.height)||Number(this.game?.canvas?.height)||1;
    this._tdrEmbeddedViewport={x:0,y:0,w:gameW,h:gameH};
    try{cam?.setVisible?.(true);cam?.setViewport?.(0,0,gameW,gameH);}catch{}
  }
  _applyStatsReplayFrame(t){super._applyStatsReplayFrame(t);if(!this._tdrEmbeddedReplay)return;this._syncEmbeddedSourceCamera();const x=Number(this.carBody?.x),y=Number(this.carBody?.y);if(Number.isFinite(x)&&Number.isFinite(y)){try{this.cameras?.main?.stopFollow?.();this.cameras?.main?.centerOn?.(x,y);}catch{}}}
  _copyEmbeddedReplayFrame(){
    if(!this._tdrEmbeddedReplay)return;
    const src=this.game?.canvas,feed=this._ensureEmbeddedFeed?.(),target=this._embeddedReplayTarget?.();
    if(!src||!feed||!target)return;
    const rect=target.getBoundingClientRect?.();if(!rect||rect.width<=1||rect.height<=1)return;
    const dpr=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1)),dw=Math.max(1,Math.round(rect.width*dpr)),dh=Math.max(1,Math.round(rect.height*dpr));
    if(feed.width!==dw)feed.width=dw;if(feed.height!==dh)feed.height=dh;
    const sw=Number(src.width)||1,sh=Number(src.height)||1,scale=Math.min(dw/sw,dh/sh),rw=Math.max(1,Math.round(sw*scale)),rh=Math.max(1,Math.round(sh*scale)),dx=Math.round((dw-rw)*.5),dy=Math.round((dh-rh)*.5);
    try{
      const ctx=feed.getContext('2d',{alpha:false});if(!ctx)return;
      ctx.fillStyle='#020a11';ctx.fillRect(0,0,dw,dh);
      ctx.drawImage(src,0,0,sw,sh,dx,dy,rw,rh);
      this._drawReplayAnalysis?.(ctx,{sx:0,sy:0,cw:sw,ch:sh,dw:rw,dh:rh,dpr,dx,dy});
    }catch{}
  }
}
