import { RaceScene as CurrentRaceScene } from './RaceVideoPreferencesScene.js';

const MODE_KEY='tdr2:gameMode';
const GHOST_PREFIX='tdr2:ghost:';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function readMode(data){
  if(data?.gameMode==='ghost'||data?.gameMode==='timeattack')return data.gameMode;
  try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return 'timeattack';}
}

function keyFor(trackKey,carId){return `${GHOST_PREFIX}${trackKey||'track01'}:${carId||'car'}`;}

function readGhost(key){
  try{
    const g=JSON.parse(localStorage.getItem(key)||'null');
    if(!g||!Array.isArray(g.samples)||g.samples.length<2||!Number.isFinite(Number(g.lapMs)))return null;
    return g;
  }catch{return null;}
}

function writeGhost(key,g){
  try{localStorage.setItem(key,JSON.stringify(g));return true;}catch{return false;}
}

function lerpAngle(a,b,t){
  let d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;
  return a+d*t;
}

function visualCarSprite(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>{
    const key=o?.texture?.key;
    return o?.visible!==false && key && key!=='__BODY__' && scene.textures?.exists?.(key);
  })||null;
}

function fmtMs(ms){
  const t=Math.max(0,Number(ms)||0);
  const m=Math.floor(t/60000);
  const s=Math.floor((t%60000)/1000);
  const cs=Math.floor((t%1000)/10);
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    this._tdrGameMode=readMode(data);
    this._replayActive=false;
    this._replayPaused=false;
    this._replayElapsed=0;
    this._replayStartedAt=0;
    this._replayCameraMode='follow';
    this._replayExporting=false;
    this._replayRecorder=null;
    this._replayChunks=[];
    this._replayHidden=[];
    const result=super.create(data);

    this._ghostTrackKey=data?.trackKey||this.trackKey||(()=>{try{return localStorage.getItem('tdr2:trackKey')||'track01';}catch{return 'track01';}})();
    this._ghostCarId=data?.carId||this.carId||(()=>{try{return localStorage.getItem('tdr2:carId')||'car';}catch{return 'car';}})();
    this._ghostStorageKey=keyFor(this._ghostTrackKey,this._ghostCarId);
    this._ghostData=readGhost(this._ghostStorageKey);
    this._ghostSamples=[];
    this._ghostLapStartPerf=null;
    this._ghostLastSamplePerf=0;
    this._ghostHistoryLen=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._ghostSprite=null;
    this._ghostHud=null;
    this._ghostSubHud=null;
    this._replayUi=null;

    this.time.delayedCall(0,()=>{
      if(this._tdrGameMode==='ghost'){
        this._createGhostSprite();
        this._createGhostHud();
      }
    });

    if(this._tdrGameMode==='ghost'&&this._ghostData){
      this.time.delayedCall(180,()=>this._syncGhostVisual());
      this.time.delayedCall(500,()=>this._syncGhostVisual());
      this.time.delayedCall(1000,()=>this._syncGhostVisual());
    }

    this._onGhostResize=()=>this._positionGhostControls();
    this.scale.on('resize',this._onGhostResize);

    this.events.once('shutdown',()=>{
      try{this._replayRecorder?.state!=='inactive'&&this._replayRecorder?.stop?.();}catch{}
      try{this._ghostSprite?.destroy?.();}catch{}
      try{this._ghostHud?.destroy?.();}catch{}
      try{this._ghostSubHud?.destroy?.();}catch{}
      try{this._replayUi?.destroy?.(true);}catch{}
      try{this._replayStyle?.remove?.();}catch{}
      try{this.scale.off('resize',this._onGhostResize);}catch{}
      this._onGhostResize=null;
      this._ghostSprite=null;this._ghostHud=null;this._ghostSubHud=null;this._replayUi=null;this._replayStyle=null;
    });
    return result;
  }

  _runtimeGhostTextureKey(){
    const runtimeKey=`car_${this._ghostCarId}`;
    if(this.textures?.exists?.(runtimeKey))return runtimeKey;
    const visual=visualCarSprite(this);
    const current=visual?.texture?.key;
    return current&&current!=='__BODY__'&&this.textures?.exists?.(current)?current:null;
  }

  _createGhostSprite(){
    if(this._tdrGameMode!=='ghost'||!this._ghostData||this._ghostSprite?.scene)return;
    const body=this.carBody;
    const visual=visualCarSprite(this);
    const tex=this._runtimeGhostTextureKey();
    if(!body||!visual||!tex)return;

    const g=this.add.image(Number(body.x||0),Number(body.y||0),tex)
      .setOrigin(visual.originX??.5,visual.originY??.5)
      .setAlpha(.48)
      .setTint(0x79eaff)
      .setBlendMode('ADD');

    g.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));
    g.setDepth(Math.max(31,Number(this.carRig?.depth||30)+1));
    this._ghostSprite=g;
    this._ghostTextureKey=tex;
    try{this.uiCam?.ignore?.(g);}catch{}
  }

  _syncGhostVisual(){
    if(this._tdrGameMode!=='ghost'||!this._ghostData)return;
    if(!this._ghostSprite?.scene){this._createGhostSprite();return;}
    const desired=this._runtimeGhostTextureKey();
    if(desired&&this._ghostSprite.texture?.key!==desired){
      try{this._ghostSprite.setTexture(desired);this._ghostTextureKey=desired;}catch{}
    }
    const visual=visualCarSprite(this);
    if(visual){
      try{this._ghostSprite.setOrigin(visual.originX??.5,visual.originY??.5);}catch{}
      try{this._ghostSprite.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));}catch{}
    }
    if(this._replayActive){
      this._ghostSprite.clearTint?.();
      this._ghostSprite.setAlpha(1).setBlendMode('NORMAL');
    }
  }

  _makeReplayButton(x,y,w,h,label,onTap){
    const c=this.add.container(x,y).setDepth(6100).setScrollFactor(0);
    const bg=this.add.rectangle(0,0,w,h,0x07131d,.88).setOrigin(.5).setStrokeStyle(1,0x64e8ff,.55).setInteractive({useHandCursor:true});
    const tx=this.add.text(0,0,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#e9fbff'}).setOrigin(.5);
    bg.on('pointerdown',()=>c.setScale(.97));
    bg.on('pointerout',()=>c.setScale(1));
    bg.on('pointerup',()=>{c.setScale(1);onTap?.();});
    c.add([bg,tx]);
    return c;
  }

  _ghostControlsLayout(){
    const w=Number(this.scale?.width||1280),h=Number(this.scale?.height||720);
    // Three stacked strips that behave like an extension of the minimap panel.
    const controlWidth=230;
    const right=w-20;
    const x=right-controlWidth/2;
    const topY=clamp(Math.round(h*.285),190,214);
    const row1H=22,row2H=20,buttonH=28;
    return {
      x,controlWidth,row1H,row2H,buttonH,
      topY,
      secondY:topY+row1H,
      buttonY:topY+row1H+row2H+buttonH/2
    };
  }

  _positionGhostControls(){
    const p=this._ghostControlsLayout();
    if(this._ghostHud?.scene)this._ghostHud.setPosition(p.x,p.topY).setFixedSize(p.controlWidth,p.row1H);
    if(this._ghostSubHud?.scene)this._ghostSubHud.setPosition(p.x,p.secondY).setFixedSize(p.controlWidth,p.row2H);
    if(this._replayEntryBtn?.scene){
      this._replayEntryBtn.setPosition(p.x,p.buttonY);
      const bg=this._replayEntryBtn.list?.[0];
      if(bg?.setSize)bg.setSize(p.controlWidth,p.buttonH);
      if(bg?.setDisplaySize)bg.setDisplaySize(p.controlWidth,p.buttonH);
    }
  }

  _setGhostHudLabels(top,bottom){
    if(this._ghostHud?.scene)this._ghostHud.setText(top);
    if(this._ghostSubHud?.scene)this._ghostSubHud.setText(bottom);
  }

  _createGhostHud(){
    if(this._ghostHud?.scene)return;
    const p=this._ghostControlsLayout();
    const top='👻 FANTASMA';
    const bottom=this._ghostData?'RÉCORD CARGADO':'CREA TU PRIMERA VUELTA';
    const base={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontStyle:'bold',backgroundColor:'rgba(3,13,22,.82)',align:'center',valign:'middle',fixedWidth:p.controlWidth,padding:{x:6,y:2}};
    this._ghostHud=this.add.text(p.x,p.topY,top,{...base,fontSize:'10px',color:'#9beeff',fixedHeight:p.row1H})
      .setOrigin(.5,0).setScrollFactor(0).setDepth(5005);
    this._ghostSubHud=this.add.text(p.x,p.secondY,bottom,{...base,fontSize:'9px',color:'#d8f8ff',fixedHeight:p.row2H})
      .setOrigin(.5,0).setScrollFactor(0).setDepth(5005);
    if(this._ghostData)this._ensureReplayEntryButton();
  }

  _ensureReplayEntryButton(){
    if(!this._ghostData||this._replayEntryBtn?.scene)return;
    const p=this._ghostControlsLayout();
    this._replayEntryBtn=this._makeReplayButton(p.x,p.buttonY,p.controlWidth,p.buttonH,'▶  VER REPETICIÓN',()=>this._enterReplay());
  }

  _recordGhostSample(now){
    if(this._replayActive||!this._raceStarted||!this.carBody)return;
    if(this._ghostLapStartPerf==null)this._ghostLapStartPerf=now;
    if(now-this._ghostLastSamplePerf<45)return;
    this._ghostLastSamplePerf=now;
    this._ghostSamples.push({t:Math.max(0,Math.round(now-this._ghostLapStartPerf)),x:Number(this.carBody.x||0),y:Number(this.carBody.y||0),r:Number(this.carBody.rotation||0)});
    if(this._ghostSamples.length>5000)this._ghostSamples.shift();
  }

  _completedLapCheck(now){
    if(this._replayActive)return;
    const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
    if(hist.length<=this._ghostHistoryLen)return;
    const last=hist[hist.length-1]||{};
    const lapMs=Number(last.lapMs ?? this.timing?.lastLap);
    const valid=last.valid!==false&&last.invalid!==true&&Number.isFinite(lapMs)&&lapMs>1000;
    if(valid&&this._ghostSamples.length>4){
      const previous=this._ghostData;
      if(!previous||lapMs<Number(previous.lapMs)){
        const saved={version:4,trackKey:this._ghostTrackKey,carId:this._ghostCarId,lapMs:Math.round(lapMs),samples:this._ghostSamples.slice()};
        if(writeGhost(this._ghostStorageKey,saved)){
          this._ghostData=saved;
          if(this._tdrGameMode==='ghost'){
            try{this._ghostSprite?.destroy?.();}catch{}
            this._ghostSprite=null;
            this._createGhostSprite();
            this._syncGhostVisual();
            this._setGhostHudLabels(previous?'👻 NUEVO FANTASMA':'👻 FANTASMA CREADO',previous?'RÉCORD MEJORADO':'SIGUIENTE VUELTA');
            this._ensureReplayEntryButton();
          }
        }
      }
    }
    this._ghostHistoryLen=hist.length;
    this._ghostSamples=[];
    this._ghostLapStartPerf=now;
    this._ghostLastSamplePerf=0;
  }

  _sampleGhostAt(t){
    const samples=this._ghostData?.samples||[];
    if(samples.length<2)return null;
    let lo=0,hi=samples.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(Number(samples[mid].t)<t)lo=mid+1;else hi=mid;}
    const i=Math.max(1,lo),a=samples[i-1],b=samples[i]||a;
    const den=Math.max(1,Number(b.t)-Number(a.t));
    const k=clamp((t-Number(a.t))/den,0,1);
    return {x:Number(a.x)+(Number(b.x)-Number(a.x))*k,y:Number(a.y)+(Number(b.y)-Number(a.y))*k,r:lerpAngle(Number(a.r||0),Number(b.r||0),k)};
  }

  _playGhost(now){
    const g=this._ghostSprite,data=this._ghostData;
    if(this._tdrGameMode!=='ghost'||!g?.scene||!data?.samples?.length||this._ghostLapStartPerf==null||this._replayActive)return;
    const t=now-this._ghostLapStartPerf;
    if(t<0||t>Number(data.lapMs)+250){g.setVisible(false);return;}
    const p=this._sampleGhostAt(t);if(!p)return;
    g.setVisible(true).setPosition(p.x,p.y);
    g.rotation=p.r+Number(this._carVisualRotOffset||0);
  }

  _hideForReplay(obj){
    if(!obj?.scene||obj===this._ghostSprite||obj===this._replayUi)return;
    this._replayHidden.push([obj,obj.visible]);
    try{obj.setVisible(false);}catch{}
  }

  _enterReplay(){
    if(!this._ghostData||this._replayActive)return;
    this._replayActive=true;this._replayPaused=false;this._replayElapsed=0;this._replayStartedAt=performance.now();
    this._syncGhostVisual();
    if(this._ghostSprite?.scene)this._ghostSprite.setVisible(true).setAlpha(1).clearTint?.().setBlendMode('NORMAL');

    for(const obj of [this.carRig,this.touchUI,this.hud,this.competitionHud,this.minimapSportFrame,this._ghostHud,this._ghostSubHud,this._replayEntryBtn,this._tdrFpsText])this._hideForReplay(obj);
    try{this._audio?.master?.gain?.setTargetAtTime?.(0,this._audioCtx?.currentTime||0,.02);}catch{}
    try{this.carBody?.setVelocity?.(0,0);this.carBody?.setAngularVelocity?.(0);}catch{}

    this._replayStyle=document.createElement('style');
    this._replayStyle.textContent='#tdr-race-controls{display:none!important}';
    document.head.appendChild(this._replayStyle);

    this._createReplayUi();
    this._setReplayCamera('follow');
  }

  _exitReplay(){
    if(!this._replayActive)return;
    this._replayActive=false;this._replayPaused=false;this._replayExporting=false;
    try{this._replayRecorder?.state!=='inactive'&&this._replayRecorder?.stop?.();}catch{}
    this._replayRecorder=null;
    try{this._replayStyle?.remove?.();}catch{}this._replayStyle=null;
    try{this._replayUi?.destroy?.(true);}catch{}this._replayUi=null;
    for(const [obj,visible] of this._replayHidden.splice(0)){try{if(obj?.scene)obj.setVisible(visible);}catch{}}
    if(this._ghostSprite?.scene)this._ghostSprite.setAlpha(.48).setTint(0x79eaff).setBlendMode('ADD');
    try{this.cameras.main.stopFollow();this.cameras.main.startFollow(this.carBody,true,.12,.12);}catch{}
    this._ghostLapStartPerf=performance.now();this._ghostSamples=[];
  }

  _restartReplay(){
    this._replayElapsed=0;this._replayStartedAt=performance.now();this._replayPaused=false;
    if(this._replayPlayText?.scene)this._replayPlayText.setText('⏸ PAUSA');
  }

  _toggleReplayPause(){
    if(!this._replayActive)return;
    if(this._replayPaused){this._replayPaused=false;this._replayStartedAt=performance.now()-this._replayElapsed;}
    else{this._replayElapsed=performance.now()-this._replayStartedAt;this._replayPaused=true;}
    if(this._replayPlayText?.scene)this._replayPlayText.setText(this._replayPaused?'▶ REANUDAR':'⏸ PAUSA');
  }

  _setReplayCamera(mode){
    this._replayCameraMode=mode;
    const cam=this.cameras.main,g=this._ghostSprite;if(!cam||!g)return;
    try{cam.stopFollow();}catch{}
    if(mode==='follow'){
      cam.setZoom(Math.max(.72,Number(this.zoom||.86)));
      cam.startFollow(g,true,.09,.09);
    }else{
      cam.setZoom(Math.max(.48,Math.min(.68,Number(this.zoom||.86)*.72)));
      cam.startFollow(g,true,.045,.045);
    }
    if(this._replayCamText?.scene)this._replayCamText.setText(mode==='follow'?'🎥 SEGUIMIENTO':'🎥 ABIERTA');
  }

  _createReplayUi(){
    if(this._replayUi?.scene)return;
    const w=this.scale.width,h=this.scale.height;
    const ui=this.add.container(0,0).setDepth(6200).setScrollFactor(0);this._replayUi=ui;
    const title=this.add.text(16,14,`REPETICIÓN · ${fmtMs(this._ghostData?.lapMs)}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#ffffff',backgroundColor:'rgba(2,9,15,.58)',padding:{x:8,y:5}}).setScrollFactor(0);
    const time=this.add.text(w-16,14,'0:00.00',{fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:'13px',fontStyle:'bold',color:'#8ff2ff',backgroundColor:'rgba(2,9,15,.58)',padding:{x:8,y:5}}).setOrigin(1,0).setScrollFactor(0);this._replayTimeText=time;
    const back=this._makeReplayButton(72,h-28,112,34,'← VOLVER',()=>this._exitReplay());
    const restart=this._makeReplayButton(198,h-28,124,34,'↺ INICIO',()=>this._restartReplay());
    const play=this._makeReplayButton(330,h-28,126,34,'⏸ PAUSA',()=>this._toggleReplayPause());
    this._replayPlayText=play.list?.[1]||null;
    const cam=this._makeReplayButton(w-260,h-28,140,34,'🎥 SEGUIMIENTO',()=>this._setReplayCamera(this._replayCameraMode==='follow'?'wide':'follow'));
    this._replayCamText=cam.list?.[1]||null;
    const exp=this._makeReplayButton(w-92,h-28,156,34,'⬆ EXPORTAR VÍDEO',()=>this._startReplayExport());
    this._replayExportBtn=exp;
    ui.add([title,time,back,restart,play,cam,exp]);
  }

  _setReplayUiVisible(visible){
    if(this._replayUi?.scene)this._replayUi.setVisible(visible);
  }

  _startReplayExport(){
    if(this._replayExporting||!this._ghostData)return;
    const canvas=this.game?.canvas;
    const MR=window.MediaRecorder;
    if(!canvas?.captureStream||!MR){
      if(this._replayTimeText?.scene)this._replayTimeText.setText('EXPORTACIÓN NO DISPONIBLE');
      return;
    }
    let mime='';
    for(const candidate of ['video/mp4;codecs=h264','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']){
      try{if(MR.isTypeSupported?.(candidate)){mime=candidate;break;}}catch{}
    }
    try{
      const stream=canvas.captureStream(60);
      const recorder=new MR(stream,mime?{mimeType:mime,videoBitsPerSecond:8000000}:{videoBitsPerSecond:8000000});
      this._replayChunks=[];this._replayRecorder=recorder;this._replayExporting=true;
      recorder.ondataavailable=e=>{if(e.data?.size)this._replayChunks.push(e.data);};
      recorder.onstop=()=>{
        this._replayExporting=false;
        this._setReplayUiVisible(true);
        try{
          const type=recorder.mimeType||mime||'video/webm';
          const blob=new Blob(this._replayChunks,{type});
          const ext=type.includes('mp4')?'mp4':'webm';
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');a.href=url;a.download=`TopdownCraftrace_${this._ghostTrackKey}_${this._ghostCarId}_${Math.round(this._ghostData.lapMs)}.${ext}`;
          document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
        }catch{}
      };
      recorder.start(250);
      this._setReplayUiVisible(false);
      this._restartReplay();
    }catch(e){
      this._replayExporting=false;this._setReplayUiVisible(true);
      if(this._replayTimeText?.scene)this._replayTimeText.setText('ERROR DE EXPORTACIÓN');
    }
  }

  _updateReplay(now){
    if(!this._replayActive||!this._ghostData)return;
    if(!this._replayPaused)this._replayElapsed=now-this._replayStartedAt;
    const lapMs=Number(this._ghostData.lapMs||0);
    if(this._replayElapsed>lapMs){
      this._replayElapsed=lapMs;
      if(this._replayExporting){
        try{this._replayRecorder?.stop?.();}catch{}
      }else{
        this._replayPaused=true;
        if(this._replayPlayText?.scene)this._replayPlayText.setText('▶ REANUDAR');
      }
    }
    const p=this._sampleGhostAt(this._replayElapsed);
    if(p&&this._ghostSprite?.scene){
      this._ghostSprite.setVisible(true).setPosition(p.x,p.y);
      this._ghostSprite.rotation=p.r+Number(this._carVisualRotOffset||0);
    }
    if(this._replayTimeText?.scene&&this._replayUi?.visible)this._replayTimeText.setText(fmtMs(this._replayElapsed));
  }

  update(time,delta){
    const now=performance.now();
    if(this._replayActive){
      this._syncGhostVisual();
      this._updateReplay(now);
      return;
    }
    super.update(time,delta);
    if(this._raceStarted&&this._ghostLapStartPerf==null)this._ghostLapStartPerf=now;
    this._syncGhostVisual();
    this._recordGhostSample(now);
    this._completedLapCheck(now);
    this._playGhost(now);
  }
}
