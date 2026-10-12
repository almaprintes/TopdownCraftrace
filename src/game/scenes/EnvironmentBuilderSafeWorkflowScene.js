import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderCollisionWorkflowScene.js';
import {installEnvironmentStudioExitGuard} from '../environment/environmentStudioExitGuard.js';
import {validCollisionLine} from '../environment/CollisionPenGeometry.js';

const clone=value=>JSON.parse(JSON.stringify(value));

export class EnvironmentBuilderScene extends Current {
  create(){
    super.create();
    this._exitGuard=installEnvironmentStudioExitGuard(this);
    const root=this._environmentDom;
    // Capture comes before the older DOM click handler that navigated away
    // immediately, ignoring unfinished traces and pending saves.
    root?.querySelector('[data-act="exit"]')?.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      this._requestExitEnvironmentStudio?.();
    },true);
    this._installSessionRecoveryButton();
    this.events.once('shutdown',()=>{this._exitGuard=null;});
  }

  _installSessionRecoveryButton(){
    const panel=this._workflowUi;
    if(!panel)return;
    const b=document.createElement('button');
    b.textContent='↶ RECUPERAR SESIÓN INTERRUMPIDA';
    b.dataset.workflow='session-recovery';
    b.style.cssText='display:block;width:100%;min-height:44px;margin-top:7px;font-size:10px';
    b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();this._recoverEnvironmentSession();
    });
    panel.appendChild(b);
  }

  _recoverEnvironmentSession(){
    const key=`tdr2:environment-exit-recovery:${this._trackId}`;
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}
    if(saved?.trackId!==this._trackId||!saved.project){
      this._builderToast?.('NO HAY UNA SESIÓN RECUPERABLE EN ESTE NAVEGADOR');
      return;
    }
    const lines=saved.project.collisionLines?.length||0;
    const zones=saved.project.collisionZones?.length||0;
    const unfinished=saved.penDraft?.nodes?.length||0;
    const question=`Se encontró una sesión de Environment Studio con ${lines} líneas, ${zones} zonas y ${unfinished} nodos pendientes. ¿Restaurar esta copia? El estado actual se guardará antes como copia de emergencia.`;
    if(window.confirm?.(question)!==true)return;
    // Preserve the existing live project before replacing it. Two distinct keys
    // prevent a failed recovery from destroying the last good saved version.
    try{
      localStorage.setItem(`tdr2:environment-before-restore:${this._trackId}`,JSON.stringify({
        version:1,trackId:this._trackId,savedAt:Date.now(),project:this._project(),
        penDraft:this._penDraft?clone(this._penDraft):null,
        zoneDraft:this._zoneDraft?clone(this._zoneDraft):null,
        zoneStrokeStarts:[...(this._zoneStrokeStarts||[])]
      }));
    }catch{
      this._flash?.('SIN ESPACIO PARA COPIA · RECUPERACIÓN CANCELADA');return;
    }
    this._applyProject(saved.project);
    this._penDraft=saved.penDraft?.nodes?.length?saved.penDraft:null;
    this._zoneDraft=Array.isArray(saved.zoneDraft)?saved.zoneDraft:[];
    this._zoneStrokeStarts=Array.isArray(saved.zoneStrokeStarts)?saved.zoneStrokeStarts:[];
    this._penGesture=null;this._zoneGesture=null;
    this._mode=this._penDraft?'collision-pen':this._zoneDraft.length?'collision-zone-draw':'select';
    this._collisionPausedMode=null;
    this._drawCollisionPen?.();this._drawCollisionZones?.();this._syncDomStatus?.();
    this._builderToast?.('SESIÓN RESTAURADA · REVISA, TERMINA Y GUARDA');
  }

  // A tap on another tool can no longer discard a work-in-progress pen.
  _isPendingPen(){
    return Number(this._penDraft?.nodes?.length)>0;
  }
  _protectPenSwitch(){
    if(!this._isPendingPen())return false;
    this._penGesture=null;
    this._collisionPausedMode='collision-pen';
    this._flash?.('PLUMA EN CURSO · TERMINAR, CONTINUAR O CANCELAR ANTES DE CAMBIAR');
    this._exitGuard?.backup('pen-tool-switch');
    return true;
  }
  _startFreehandZones(){
    if(this._protectPenSwitch())return;
    super._startFreehandZones?.();
  }
  _chooseAsphalt(){
    if(this._protectPenSwitch())return;
    super._chooseAsphalt?.();
  }
  _chooseLinear(def){
    if(this._protectPenSwitch())return;
    super._chooseLinear?.(def);
  }
  _activateCollisionPen(){
    if(this._isPendingPen()){
      this._collisionPausedMode='collision-pen';
      this._resumeCollisionDrawing?.();
      return;
    }
    super._activateCollisionPen?.();
  }
  _select(o){
    // Inherited object-selection code formerly deleted the unfinished pen.
    const draft=this._penDraft;
    super._select?.(o);
    if(draft?.nodes?.length){
      this._penDraft=draft;
      this._collisionPausedMode='collision-pen';
      this._drawCollisionPen?.();
    }
  }
  _selectSurface(s){
    const draft=this._penDraft;
    super._selectSurface?.(s);
    if(draft?.nodes?.length){
      this._penDraft=draft;this._collisionPausedMode='collision-pen';
      this._drawCollisionPen?.();
    }
  }
  _selectRail(s){
    const draft=this._penDraft;
    super._selectRail?.(s);
    if(draft?.nodes?.length){
      this._penDraft=draft;this._collisionPausedMode='collision-pen';
      this._drawCollisionPen?.();
    }
  }

  _setupInput(){
    super._setupInput();
    // Persist a reversible draft after each discrete finger stroke/node.
    this.input.on('pointerup',()=>{this._exitGuard?.backup('touch-edit');});
    this.input.on('pointerupoutside',()=>{this._exitGuard?.backup('touch-outside');});
    // Canvas interruption must not leave a permanently captured pen gesture.
    this.input.on('gameout',()=>{
      if(this._penGesture||this._zoneGesture){
        this._penGesture=null;this._zoneGesture=null;
        this._exitGuard?.backup('touch-interrupted');
        this._drawCollisionPen?.();this._drawCollisionZones?.();
        this._flash?.('TOQUE INTERRUMPIDO · EL TRAZO SIGUE DISPONIBLE');
      }
    });
  }

  _finishCollisionPen(){
    const before=this._collisionLines?.length||0;
    super._finishCollisionPen?.();
    if((this._collisionLines?.length||0)>before){
      this._exitGuard?.backup('pen-finished');
    }
  }
  _finishFreehandZone(){
    const before=this._collisionZones?.length||0;
    super._finishFreehandZone?.();
    if((this._collisionZones?.length||0)>before){
      this._exitGuard?.backup('zone-finished');
    }
  }
  _save(){
    const result=super._save?.();
    if(!this._penDraft?.nodes?.length&&!this._zoneDraft?.length)this._exitGuard?.backup('manual-save');
    return result;
  }
}
