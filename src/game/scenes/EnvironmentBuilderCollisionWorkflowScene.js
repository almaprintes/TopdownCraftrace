import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderFreehandCollisionScene.js';

// Explicit editing/navigation workflow. Panning never commits points and never
// discards the in-progress Bézier line or freehand outline.
export class EnvironmentBuilderScene extends Current {
  create(){
    this._collisionPausedMode=null;
    super.create();
    this._mountCollisionWorkflow();
    this._syncDomStatus();
  }

  _mountCollisionWorkflow(){
    const root=this._environmentDom,aside=root?.querySelector('.es-right');
    if(!root||!aside)return;
    const section=document.createElement('section');
    section.className='es-collision-workflow';
    section.innerHTML=`<h3>DIBUJAR Y NAVEGAR</h3>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px">
        <button data-workflow="move">✋ MOVER MAPA</button>
        <button data-workflow="resume">✎ CONTINUAR</button>
        <button data-workflow="undo">↶ DESHACER</button>
        <button data-workflow="finish">✓ TERMINAR</button>
      </div>
      <p data-workflow-state style="font-size:10px;font-weight:500;line-height:1.45;color:#a9d7d0;margin:8px 0 0"></p>`;
    aside.prepend(section);
    this._workflowUi=section;
    for(const [name,fn] of Object.entries({
      move:()=>this._pauseCollisionForPan(),
      resume:()=>this._resumeCollisionDrawing(),
      undo:()=>this._undoCollisionAction(),
      finish:()=>this._finishCollisionDrawing()
    })){
      const button=section.querySelector(`[data-workflow="${name}"]`);
      button.style.minHeight='44px';
      button.style.fontSize='10px';
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn();this._syncDomStatus();});
    }
    // Legacy PAN button has its own click handler; intercept in capture phase
    // so the editor remembers which drawing tool must be restored afterward.
    const pan=root.querySelector('[data-act="pan"]');
    pan?.addEventListener('click',e=>{
      if(!this._isCollisionDrawing()&&!this._collisionPausedMode)return;
      e.preventDefault();e.stopImmediatePropagation();
      this._pauseCollisionForPan();
    },true);
    // Legacy Select intentionally leaves unfinished geometry untouched:
    // users can still hit CONTINUAR to return to it.
    this._syncDomStatus();
  }

  _isCollisionDrawing(){
    return this._mode==='collision-pen'||this._mode==='collision-zone-draw';
  }
  _pauseCollisionForPan(){
    if(this._isCollisionDrawing())this._collisionPausedMode=this._mode;
    this._penGesture=null;this._zoneGesture=null;
    this._panStart=null;this._freePan=null;
    this._mode='pan';
    this._syncDomStatus();
    this._flash?.('MOVER MAPA · NINGÚN TOQUE AÑADE NODOS · CONTINUAR PARA VOLVER');
  }
  _resumeCollisionDrawing(){
    const tool=this._collisionPausedMode
      ||(this._penDraft?'collision-pen':this._zoneDraft?.length?'collision-zone-draw':null);
    if(!tool){
      this._flash?.('ELIGE PLUMA O MANO ALZADA PARA EMPEZAR');
      return;
    }
    this._collisionPausedMode=null;
    this._panStart=null;this._freePan=null;
    this._mode=tool;
    this._drawCollisionPen?.();this._drawCollisionZones?.();
    this._syncDomStatus();
    this._flash?.('DIBUJO REANUDADO · CONTINÚA DESDE TU ÚLTIMO PUNTO');
  }
  _undoCollisionAction(){
    if(this._penGesture||this._zoneGesture){
      this._flash?.('SUELTA EL DEDO ANTES DE DESHACER');
      return;
    }
    if(this._collisionPausedMode==='collision-pen'||this._mode==='collision-pen'){
      if(this._penDraft?.nodes?.length){
        this._penDraft.nodes.pop();
        this._drawCollisionPen?.();this._syncDomStatus();
        this._flash?.('ÚLTIMO NODO DESHECHO');
        return;
      }
    }
    if(this._collisionPausedMode==='collision-zone-draw'||this._mode==='collision-zone-draw'){
      if(this._zoneDraft?.length&&this._zoneStrokeStarts?.length){
        const start=this._zoneStrokeStarts.pop();
        this._zoneDraft.length=start;
        this._drawCollisionZones?.();this._syncDomStatus();
        this._flash?.('ÚLTIMO TRAZO DESHECHO');
        return;
      }
    }
    this._undoLast?.();
  }
  _finishCollisionDrawing(){
    const tool=this._mode==='pan'?this._collisionPausedMode:this._mode;
    if(tool==='collision-pen'){
      this._mode='collision-pen';
      this._finishCollisionPen?.();
    }else if(tool==='collision-zone-draw'){
      this._mode='collision-zone-draw';
      this._finishFreehandZone?.();
    }else this._flash?.('NO HAY UN TRAZADO EN CURSO');
    this._collisionPausedMode=null;
    this._syncDomStatus();
  }

  _activateCollisionPen(){
    if(this._collisionPausedMode==='collision-pen'&&this._penDraft){
      this._resumeCollisionDrawing();
      return;
    }
    this._collisionPausedMode=null;
    super._activateCollisionPen?.();
  }
  _startFreehandZones(){
    if(this._collisionPausedMode==='collision-zone-draw'&&this._zoneDraft){
      this._resumeCollisionDrawing();
      return;
    }
    this._collisionPausedMode=null;
    super._startFreehandZones?.();
  }
  _cancelCollisionPen(){
    this._collisionPausedMode=null;
    super._cancelCollisionPen?.();
  }
  _cancelFreehandZone(){
    this._collisionPausedMode=null;
    super._cancelFreehandZone?.();
  }
  _applyProject(p){
    this._collisionPausedMode=null;
    super._applyProject?.(p);
  }
  _openRealTrack(trackId,resetProject=true){
    this._collisionPausedMode=null;
    super._openRealTrack?.(trackId,resetProject);
  }

  _setupInput(){
    super._setupInput();
    // Multi-touch navigation can begin while the first touch is still placing
    // a pen anchor/stroke. Undo that provisional input on the second finger.
    this.input.on('pointerdown',()=>{
      if(!this._pinching)return;
      const g=this._penGesture;
      if(g?.kind==='new'&&this._penDraft?.nodes?.at(-1)===g.node){
        this._penDraft.nodes.pop();
      }
      this._penGesture=null;
      const z=this._zoneGesture;
      if(z?.kind==='draw'&&Array.isArray(this._zoneDraft)){
        this._zoneDraft.length=z.start;
        if(z.moved&&this._zoneStrokeStarts?.at(-1)===z.start)this._zoneStrokeStarts.pop();
      }
      this._zoneGesture=null;
      this._drawCollisionPen?.();this._drawCollisionZones?.();
    });
  }

  _syncDomStatus(){
    super._syncDomStatus?.();
    const pane=this._workflowUi;if(!pane)return;
    const state=pane.querySelector('[data-workflow-state]');
    if(state){
      const pen=this._penDraft?.nodes?.length||0,zone=this._zoneStrokeStarts?.length||0;
      state.textContent=this._mode==='pan'
        ?`MODO MANO · navega y haz zoom. ${pen} nodos de pluma y ${zone} trazos de zona conservados.`
        :this._mode==='collision-pen'
          ?`PLUMA · ${pen} nodos. Usa MOVER MAPA cuando quieras desplazarte.`
          :this._mode==='collision-zone-draw'
            ?`MANO ALZADA · ${zone} trazos. Puedes dibujar en varias partes antes de terminar.`
            :this._collisionPausedMode?'TRAZADO EN PAUSA · pulsa CONTINUAR para seguir':'Selecciona una herramienta de colisión.';
    }
    for(const b of pane.querySelectorAll('button'))b.classList.remove('on');
    const active=this._mode==='pan'?'move':this._isCollisionDrawing()?'resume':null;
    if(active)pane.querySelector(`[data-workflow="${active}"]`)?.classList.add('on');
    const disabled=!(this._collisionPausedMode||this._isCollisionDrawing()||this._penDraft||this._zoneDraft?.length);
    const resume=pane.querySelector('[data-workflow="resume"]');
    if(resume)resume.disabled=disabled;
  }
}
