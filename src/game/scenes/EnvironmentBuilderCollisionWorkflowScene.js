import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderFreehandCollisionScene.js';
import {validCollisionLine} from '../environment/CollisionPenGeometry.js';

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
      <button data-workflow="restore-pen" style="margin-top:7px;width:100%;min-height:40px">↶ RECUPERAR PLUMA GUARDADA</button>
      <p data-workflow-state style="font-size:10px;font-weight:500;line-height:1.45;color:#a9d7d0;margin:8px 0 0"></p>`;
    aside.prepend(section);
    this._workflowUi=section;
    for(const [name,fn] of Object.entries({
      move:()=>this._pauseCollisionForPan(),
      resume:()=>this._resumeCollisionDrawing(),
      undo:()=>this._undoCollisionAction(),
      finish:()=>this._finishCollisionDrawing(),
      'restore-pen':()=>this._restoreMissingCollisionLines()
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

  // Dedicated persistent checkpoint: unlike recovery autosaves it survives
  // a later switch of tool, load, or partial project overwrite.
  _penCheckpointKey(){
    return `tdr2:environment-pen-checkpoint:${this._trackId||'unknown'}`;
  }
  _checkpointCompletedPen(){
    const lines=(this._collisionLines||[]).filter(validCollisionLine);
    if(!lines.length)return;
    try{
      const existing=JSON.parse(localStorage.getItem(this._penCheckpointKey())||'null');
      const deletedIds=new Set(existing?.deletedIds||[]);
      const merged=new Map();
      for(const line of [...(existing?.lines||[]),...lines]){
        const id=String(line?.id||JSON.stringify(line?.nodes));
        if(!deletedIds.has(id)&&validCollisionLine(line))merged.set(id,line);
      }
      localStorage.setItem(this._penCheckpointKey(),JSON.stringify({
        version:1,trackId:this._trackId,createdAt:Date.now(),deletedIds:[...deletedIds],lines:[...merged.values()]
      }));
    }catch(err){
      console.warn('[Environment Studio] no se pudo proteger la pluma terminada',err);
      this._flash?.('AVISO · COPIA DE SEGURIDAD DE PLUMA NO DISPONIBLE');
    }
  }
  _finishCollisionPen(){
    const before=this._collisionLines?.length||0;
    super._finishCollisionPen?.();
    if((this._collisionLines?.length||0)>before){
      this._checkpointCompletedPen();
      // Save the complete project immediately, before switching to zones.
      // Existing assets and finalized zones are included unchanged.
      super._save?.();
      this._syncDomStatus();
    }
  }
  _possibleCollisionLines(){
    const candidates=[...(this._collisionLines||[])];
    const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
    const checkpoint=read(this._penCheckpointKey());
    const deletedIds=new Set(checkpoint?.deletedIds||[]);
    if(checkpoint?.trackId===this._trackId)candidates.push(...(checkpoint.lines||[]));
    const saved=read(this._storageKey?.()||'');
    if(saved?.trackId===this._trackId)candidates.push(...(saved.collisionLines||[]));
    const recovery=read(this._recoveryKey?.()||'');
    if(recovery?.trackId===this._trackId)candidates.push(...(recovery.project?.collisionLines||[]));
    for(const history of this._undoStack||[]){
      if(history?.trackId===this._trackId)candidates.push(...(history.collisionLines||[]));
    }
    const uniq=new Map();
    for(const line of candidates){
      const id=String(line?.id||JSON.stringify(line?.nodes));
      if(!deletedIds.has(id)&&validCollisionLine(line))uniq.set(id,line);
    }
    return [...uniq.values()];
  }
  _restoreMissingCollisionLines(){
    const saved=this._possibleCollisionLines();
    const present=new Set((this._collisionLines||[]).map(l=>String(l.id||JSON.stringify(l.nodes))));
    const missing=saved.filter(l=>!present.has(String(l.id||JSON.stringify(l.nodes))));
    if(!missing.length){
      this._builderToast?.('NO HAY PLUMAS ADICIONALES EN LAS COPIAS LOCALES');
      return;
    }
    const allow=window.confirm?.(`Se han encontrado ${missing.length} líneas de pluma recuperables. ¿Añadirlas sin modificar las zonas sólidas ni la fotografía?`);
    if(allow===false)return;
    this._collisionLines=[...(this._collisionLines||[]),...missing.map(l=>JSON.parse(JSON.stringify(l)))];
    this._checkpointCompletedPen();
    this._drawCollisionPen?.();this._syncDomStatus();
    this._builderToast?.(`${missing.length} LÍNEAS RECUPERADAS · PULSA GUARDAR Y EXPORTAR`);
  }
  _deleteCollisionLine(){
    const id=this._collisionSelected?.id;
    const count=this._collisionLines?.length||0;
    super._deleteCollisionLine?.();
    if(!id||(this._collisionLines?.length||0)>=count)return;
    try{
      const key=this._penCheckpointKey();
      const previous=JSON.parse(localStorage.getItem(key)||'null')||{};
      const deletedIds=[...new Set([...(previous.deletedIds||[]),id])];
      const lines=(previous.lines||[]).filter(line=>line.id!==id);
      localStorage.setItem(key,JSON.stringify({version:1,trackId:this._trackId,createdAt:Date.now(),deletedIds,lines}));
    }catch{}
  }
  _clearCurrentDecoration(){
    const before=(this._collisionLines||[]).map(line=>line.id).filter(Boolean);
    super._clearCurrentDecoration?.();
    if(!before.length||(this._collisionLines||[]).length)return;
    try{
      const key=this._penCheckpointKey();
      const previous=JSON.parse(localStorage.getItem(key)||'null')||{};
      const deletedIds=[...new Set([...(previous.deletedIds||[]),...before])];
      localStorage.setItem(key,JSON.stringify({version:1,trackId:this._trackId,createdAt:Date.now(),deletedIds,lines:[]}));
    }catch{}
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
  _hasUnfinishedCollisionDraft(){
    const n=Number(this._penDraft?.nodes?.length)||0;
    const z=Number(this._zoneDraft?.length)||0;
    if(n){
      this._flash?.(`PLUMA SIN TERMINAR (${n} NODOS) · PULSA TERMINAR ANTES DE GUARDAR O EXPORTAR`);
      return true;
    }
    if(z){
      this._flash?.('ZONA SIN TERMINAR · PULSA TERMINAR ANTES DE GUARDAR O EXPORTAR');
      return true;
    }
    return false;
  }
  _save(){
    if(this._hasUnfinishedCollisionDraft())return;
    const out=super._save?.();
    try{
      const saved=JSON.parse(localStorage.getItem(this._storageKey?.()||'')||'{}');
      if((saved.collisionLines||[]).length!==(this._collisionLines||[]).filter(validCollisionLine).length)
        this._flash?.('AVISO · LÍNEAS NO INCLUIDAS EN GUARDADO · RECUPERAR PLUMA');
    }catch{this._flash?.('AVISO · NO SE PUDO VERIFICAR EL GUARDADO');}
    return out;
  }
  _export(){
    // Prevent an incomplete pen/zone from silently disappearing from the
    // downloadable JSON. Only finished authored geometry is serialized.
    if(this._hasUnfinishedCollisionDraft())return;
    const current=(this._collisionLines||[]).filter(validCollisionLine).length;
    const archived=this._possibleCollisionLines().length;
    if(archived>current){
      this._flash?.(`AVISO · FALTAN ${archived-current} LÍNEAS DE PLUMA · PULSA RECUPERAR PLUMA`);
      return;
    }
    const exported=this._project?.();
    if((exported?.collisionLines||[]).length!==current){
      this._flash?.('ERROR · EXPORTACIÓN SIN LAS LÍNEAS DE PLUMA');return;
    }
    return super._export?.();
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
