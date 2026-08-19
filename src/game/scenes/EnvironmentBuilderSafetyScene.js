import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderPinchAnchorScene.js';

export class EnvironmentBuilderScene extends Current {
  create(){
    this._safetyReady=false;
    this._lastPointerDown=null;
    this._savedSignature='';
    super.create();
    this._savedSignature=this._projectSignature();
    this._installRecoveryUi();
    this._startRecoveryAutosave();
    this._safetyReady=true;
  }

  _setupInput(){
    super._setupInput();
    this.input.on('pointerdown',p=>{this._lastPointerDown={x:p.x,y:p.y,time:Date.now()};});
  }

  _loadButtonRect(){
    const {width}=this.scale,usableRight=width-this._right;
    const titleW=Math.min(330,Math.max(255,usableRight*.27));
    const x=titleW+28+86;
    return{x,y:12,w:76,h:34};
  }

  _startedOnLoadButton(){
    const p=this._lastPointerDown,r=this._loadButtonRect();
    return !!p&&Date.now()-p.time<2500&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
  }

  _projectSignature(){
    try{return JSON.stringify(this._project?.()||{});}catch{return '';}
  }

  _hasUnsavedChanges(){
    return this._projectSignature()!==this._savedSignature;
  }

  _recoveryKey(){return `tdr2:environment-recovery:${this._trackId||'unknown'}`;}

  _writeRecovery(reason='auto'){
    try{
      const payload={version:1,trackId:this._trackId,savedAt:Date.now(),reason,project:this._project?.()||{}};
      localStorage.setItem(this._recoveryKey(),JSON.stringify(payload));
      this._refreshRecoveryInfo(payload.savedAt);
      return true;
    }catch{return false;}
  }

  _save(){
    super._save?.();
    this._savedSignature=this._projectSignature();
    this._writeRecovery('manual-save');
  }

  _load(){
    // A release that merely slides onto CARGAR must never execute it.
    if(!this._startedOnLoadButton()){
      this._flash?.('CARGAR CANCELADO · TOQUE EL BOTÓN DIRECTAMENTE');
      return;
    }

    const dirty=this._hasUnsavedChanges();
    if(dirty){
      // Preserve exactly what is on screen before offering a destructive load.
      this._writeRecovery('before-load');
      const ok=window.confirm?.('Hay cambios sin guardar. CARGAR reemplazará el estado actual.\n\nSe ha creado una copia de recuperación. ¿Quieres continuar?');
      if(ok===false){this._builderToast?.('CARGA CANCELADA');return;}
    }else{
      this._writeRecovery('before-load');
    }

    super._load?.();
    this.time.delayedCall(0,()=>{
      this._savedSignature=this._projectSignature();
      this._builderToast?.('ESTADO CARGADO');
    });
  }

  _startRecoveryAutosave(){
    this._recoveryTimer=this.time.addEvent({delay:15000,loop:true,callback:()=>{
      if(!this._safetyReady||!this._hasUnsavedChanges())return;
      this._writeRecovery('autosave');
    }});
    this.events.once('shutdown',()=>{try{this._recoveryTimer?.remove?.();}catch{}});
  }

  _installRecoveryUi(){
    const {width,height}=this.scale,rx=width-this._right+14,y=height-31;
    const b=this.add.rectangle(rx,y,this._right-28,24,0x142231,1).setOrigin(0)
      .setStrokeStyle(1,0x45dfff,.72).setInteractive({useHandCursor:true}).setDepth(61500);
    const t=this.add.text(rx+8,y+12,'RECUPERAR AUTOGUARDADO',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'bold',color:'#bfeeff'}).setOrigin(0,.5).setDepth(61501);
    this._recoveryInfo=this.add.text(rx+this._right-36,y+12,'',{fontFamily:'system-ui',fontSize:'8px',color:'#7f97aa'}).setOrigin(1,.5).setDepth(61501);
    this._editCam?.ignore([b,t,this._recoveryInfo]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._restoreRecovery();});
    try{const r=JSON.parse(localStorage.getItem(this._recoveryKey())||'null');if(r?.savedAt)this._refreshRecoveryInfo(r.savedAt);}catch{}
  }

  _refreshRecoveryInfo(ts){
    if(!this._recoveryInfo||!ts)return;
    const d=new Date(ts),hh=String(d.getHours()).padStart(2,'0'),mm=String(d.getMinutes()).padStart(2,'0'),ss=String(d.getSeconds()).padStart(2,'0');
    this._recoveryInfo.setText(`${hh}:${mm}:${ss}`);
  }

  _restoreRecovery(){
    let r=null;try{r=JSON.parse(localStorage.getItem(this._recoveryKey())||'null');}catch{}
    if(!r?.project){this._builderToast?.('NO HAY AUTOGUARDADO');return;}
    if(this._hasUnsavedChanges()){
      this._writeRecovery('before-recovery');
      const ok=window.confirm?.('¿Recuperar el autoguardado? El estado actual se sustituirá, pero también se guardará como copia de emergencia.');
      if(ok===false)return;
    }
    this._applyProject?.(r.project);
    // Recovery is intentionally considered unsaved until GUARDAR is pressed.
    this._builderToast?.('AUTOGUARDADO RECUPERADO');
  }

  _openRealTrack(trackId,resetProject=true){
    super._openRealTrack(trackId,resetProject);
    if(this._safetyReady)this.time.delayedCall(0,()=>{
      this._savedSignature=this._projectSignature();
      try{const r=JSON.parse(localStorage.getItem(this._recoveryKey())||'null');if(r?.savedAt)this._refreshRecoveryInfo(r.savedAt);else this._recoveryInfo?.setText?.('');}catch{}
    });
  }
}
