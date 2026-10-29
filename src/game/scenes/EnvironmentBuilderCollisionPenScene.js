import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderMaterialStudioScene.js';
import {penNode,validCollisionLine,hitCollisionCurve,insertCollisionNode,cubicCollisionPoint} from '../environment/CollisionPenGeometry.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a,b,r)=>distance(a,b)<=r;

import {ENVIRONMENT_ZONE_COLORS} from '../environment/environmentStudioZoneColors.js';

export class EnvironmentBuilderScene extends Current {
  create(){
    this._collisionLines=[];
    this._collisionSelected=null;
    this._penDraft=null;
    this._penGesture=null;
    super.create();
    // Unlike modular guardrails, these curves are editor-only guides;
    // their saved coordinates become invisible collision segments in race.
    this._collisionInk=this.add.graphics().setDepth(25);
    this._collisionHandles=this.add.graphics().setDepth(26);
    this.cameras.main.ignore([this._collisionInk,this._collisionHandles]);
    this._mountCollisionPenUi();
    this._drawCollisionPen();
    this.events.once('shutdown',()=>{
      this._penGesture=null;this._penDraft=null;
      this._collisionInk?.destroy?.();this._collisionHandles?.destroy?.();
    });
  }

  _mountCollisionPenUi(){
    const root=this._environmentDom,aside=root?.querySelector('.es-right');
    if(!root||!aside)return;
    const section=document.createElement('section');
    section.className='es-pen-collision';
    section.innerHTML=`<h3>PLUMA · COLISIONES</h3>
      <p data-pen-help style="font-size:10px;font-weight:500;line-height:1.45;color:#9bb1cd;margin:4px 0 9px">
      Toca para añadir un nodo. Mantén pulsado y arrastra para curvar. La línea será invisible en carrera.</p>
      <div class="es-grid two" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:7px">
        <button data-pen="new">✒ NUEVA LÍNEA</button>
        <button data-pen="finish">✓ TERMINAR</button>
        <button data-pen="undo">↶ ÚLTIMO NODO</button>
        <button data-pen="cancel">CANCELAR</button>
        <button data-pen="select">EDITAR / SELECCIÓN</button>
        <button data-pen="delete" class="danger">BORRAR LÍNEA</button>
      </div><p data-pen-count style="font-size:9px;color:#7fffd4;margin-top:9px"></p>`;
    const group=document.createElement('details');
    group.className='es-advanced-group es-pen-details';
    const summary=document.createElement('summary');
    summary.textContent='PLUMA · COLISIONES';
    group.append(summary,section);
    aside.prepend(group);
    this._penUi=section;
    const on=(name,callback)=>section.querySelector(`[data-pen="${name}"]`)?.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();callback();this._syncDomStatus();
    });
    on('new',()=>this._activateCollisionPen());
    on('finish',()=>this._finishCollisionPen());
    on('undo',()=>this._undoCollisionAction?this._undoCollisionAction():this._removeLastCollisionNode());
    on('cancel',()=>this._cancelCollisionPen());
    on('select',()=>this._enterCollisionSelection());
    on('delete',()=>this._deleteCollisionLine());
    const left=root.querySelector('.es-left');
    if(left){
      const button=document.createElement('button');button.dataset.act='collisionPen';
      button.textContent='✒ COL';button.style.fontSize='11px';button.title='Pluma de colisiones Bézier';
      button.addEventListener('click',()=>this._activateCollisionPen());
      left.append(button);
    }
    this._syncDomStatus();
  }

  _activateCollisionPen(){
    this._closeEditablesMenu?.();
    super._disarmCreation?.();
    this._penGesture=null;this._collisionSelected=null;
    this._selected=this._selectedSurface=this._selRail=null;
    this._selectionG?.clear?.();
    this._penDraft={nodes:[],halfThickness:9,type:'collision'};
    this._mode='collision-pen';
    this._drawCollisionPen();this._syncDomStatus();
    this._flash?.('PLUMA · TOCA PARA NODO · ARRASTRA PARA CURVA');
  }

  _finishCollisionPen(){
    const line=this._penDraft;
    if(!line||line.nodes.length<2){this._flash?.('AÑADE AL MENOS DOS NODOS');return;}
    if(!validCollisionLine(line)){this._flash?.('TRAZADO INCOMPLETO');return;}
    const length=line.nodes.reduce((acc,p,i)=>i?acc+distance(p,line.nodes[i-1]):0,0);
    if(length<12){this._flash?.('TRAZADO DEMASIADO CORTO');return;}
    line.id=`pen-collision-${Date.now()}-${this._collisionLines.length}`;
    this._collisionLines.push(clone(line));
    this._penDraft=null;this._penGesture=null;
    this._selectCollisionLine(this._collisionLines[this._collisionLines.length-1]);
    this._builderToast?.('COLISIÓN GUARDADA EN EL PROYECTO · PULSA GUARDAR');
    this._drawCollisionPen();this._syncDomStatus();
  }

  _removeLastCollisionNode(){
    if(this._mode!=='collision-pen'||!this._penDraft?.nodes?.length)return;
    this._penDraft.nodes.pop();
    this._penGesture=null;this._drawCollisionPen();this._syncDomStatus();
  }
  _cancelCollisionPen(){
    this._penGesture=null;this._penDraft=null;
    this._mode=this._collisionSelected?'collision-edit':'select';
    this._drawCollisionPen();this._syncDomStatus();
  }
  _enterCollisionSelection(){
    this._penGesture=null;
    // Enter selection without throwing away an unfinished Bézier route.
    if(this._penDraft?.nodes?.length)this._collisionPausedMode='collision-pen';
    this._mode=this._collisionSelected?'collision-edit':'select';
    this._drawCollisionPen();this._syncDomStatus();
  }
  _selectCollisionLine(line){
    this._collisionSelected=line;this._mode='collision-edit';
    this._selected=this._selectedSurface=this._selRail=null;
    this._selectionG?.clear?.();this._panStart=null;this._freePan=null;
    this._drawCollisionPen();this._syncDomStatus();
  }
  _deleteCollisionLine(){
    if(!this._collisionSelected){this._flash?.('SELECCIONA UNA LÍNEA DE COLISIÓN');return;}
    this._collisionLines=this._collisionLines.filter(l=>l!==this._collisionSelected);
    this._collisionSelected=null;this._penGesture=null;this._mode='select';
    this._drawCollisionPen();this._syncDomStatus();
  }
  _delete(){
    if(this._collisionSelected){this._deleteCollisionLine();return;}
    super._delete?.();
  }
  _select(o){this._collisionSelected=null;this._penDraft=null;super._select?.(o);this._drawCollisionPen();}
  _selectSurface(s){this._collisionSelected=null;this._penDraft=null;super._selectSurface?.(s);this._drawCollisionPen();}
  _selectRail(s){this._collisionSelected=null;this._penDraft=null;super._selectRail?.(s);this._drawCollisionPen();}

  _collisionHit(w,handleRadius,curveRadius){
    const selected=this._collisionSelected;
    if(selected){
      for(let i=selected.nodes.length-1;i>=0;i--){
        const n=selected.nodes[i];
        for(const key of ['in','out']){
          if(near(w,n[key],handleRadius)&&!near(n[key],n,1))
            return{line:selected,index:i,key};
        }
        if(near(w,n,handleRadius))return{line:selected,index:i,key:'anchor'};
      }
    }
    for(let k=this._collisionLines.length-1;k>=0;k--){
      const line=this._collisionLines[k],hit=hitCollisionCurve(line,w,curveRadius);
      if(hit)return{line,...hit,key:'curve'};
    }
    return null;
  }

  _setupInput(){
    super._setupInput();
    const world=p=>this._editCam.getWorldPoint(p.x,p.y);
    this.input.on('pointerdown',p=>{
      if(this._pinching||!this._inside?.(p)||this._penGesture)return;
      const w=world(p),zoom=Math.max(.1,this._editCam?.zoom||1);
      if(this._mode==='collision-pen'){
        if(this._penDraft.nodes.length>=250){this._flash?.('MÁXIMO 250 NODOS');return;}
        const n=penNode(w.x,w.y);this._penDraft.nodes.push(n);
        this._penGesture={pointerId:p.id,kind:'new',node:n,start:w};
        this._panStart=null;this._freePan=null;this._drawCollisionPen();return;
      }
      if(this._mode!=='select'&&this._mode!=='collision-edit')return;
      const hit=this._collisionHit(w,15/zoom,18/zoom);
      if(!hit){if(this._mode==='collision-edit'){
        this._collisionSelected=null;this._mode='select';this._drawCollisionPen();this._syncDomStatus();
      }return;}
      this._emptyTapCandidate=null;this._assetTapCandidate=null;
      // Preserve edit geometry until pointer release: a second finger turns
      // this first touch into navigation, not an accidental anchor edit.
      const originalNodes=JSON.parse(JSON.stringify(hit.line.nodes));
      this._selectCollisionLine(hit.line);
      if(hit.key==='curve'){
        // A first tap selects a wall; another tap inserts a Bézier node.
        if(hit.line===this._penLastSelected && hit.line.nodes.length<250){
          const node=insertCollisionNode(hit.line.nodes,hit.segment,Math.max(.001,Math.min(.999,hit.t)));
          const index=hit.line.nodes.indexOf(node);
          this._penGesture={pointerId:p.id,kind:'anchor',line:hit.line,index,start:w,originalNodes};
        }
        this._penLastSelected=hit.line;
      }else{
        this._penGesture={pointerId:p.id,kind:hit.key,line:hit.line,index:hit.index,start:w,originalNodes};
        this._penLastSelected=hit.line;
      }
      this._panStart=null;this._freePan=null;this._drawCollisionPen();
    });
    this.input.on('pointermove',p=>{
      const d=this._penGesture;
      if(!d||d.pointerId!==p.id||!p.isDown||this._pinching)return;
      const w=world(p);
      if(d.kind==='new'){
        const v=d.node;
        v.out={x:w.x,y:w.y};v.in={x:v.x*2-w.x,y:v.y*2-w.y};
      }else if(d.line){
        const n=d.line.nodes[d.index];if(!n)return;
        if(d.kind==='anchor'){
          const dx=w.x-n.x,dy=w.y-n.y;n.x=w.x;n.y=w.y;
          n.in.x+=dx;n.in.y+=dy;n.out.x+=dx;n.out.y+=dy;
        }else if(d.kind==='in'||d.kind==='out'){
          n[d.kind]={x:w.x,y:w.y};
          const opposite=d.kind==='in'?'out':'in';
          n[opposite]={x:2*n.x-w.x,y:2*n.y-w.y};
        }
      }
      this._panStart=null;this._freePan=null;this._drawCollisionPen();
    });
    const release=p=>{if(!p||this._penGesture?.pointerId===p.id){this._penGesture=null;this._syncDomStatus();}};
    this.input.on('pointerup',release);
    this.input.on('pointerupoutside',release);
  }

  _drawCollisionPen(){
    const g=this._collisionInk,h=this._collisionHandles;
    if(!g||!h)return;g.clear();h.clear();
    const zoom=Math.max(.1,this._editCam?.zoom||1),step=1/zoom;
    const draw=(line,selected=false)=>{
      if(!validCollisionLine(line))return;
      const palette=ENVIRONMENT_ZONE_COLORS.pen;
      const trace=(width,color,alpha)=>{
        g.lineStyle(width*step,color,alpha);
        for(let i=0;i<line.nodes.length-1;i++){
          let p=cubicCollisionPoint(line.nodes,i,0);
          const a=line.nodes[i],b=line.nodes[i+1],approx=distance(a,b)+distance(a.out,a)+distance(b.in,b);
          const count=Math.min(150,Math.max(8,Math.ceil(approx/(10*step))));
          for(let j=1;j<=count;j++){
            const q=cubicCollisionPoint(line.nodes,i,j/count);
            g.lineBetween(p.x,p.y,q.x,q.y);p=q;
          }
        }
      };
      // Dark contour preserves white-pen legibility on pale aerial photos.
      trace(selected?6.4:5.2,palette.shadow,.82);
      trace(selected?4:3,selected?palette.selected:palette.line,selected?1:.92);
    };
    for(const line of this._collisionLines)draw(line,line===this._collisionSelected);
    const active=this._penDraft||this._collisionSelected;
    if(this._penDraft){
      draw(this._penDraft,true);
      if(this._penDraft.nodes.length===1){
        const n=this._penDraft.nodes[0];h.fillStyle(ENVIRONMENT_ZONE_COLORS.pen.handle,1);h.fillCircle(n.x,n.y,8*step);
      }
    }
    if(!active)return;
    for(const n of active.nodes){
      for(const key of ['in','out'])if(!near(n,n[key],1)){
        h.lineStyle(1.5*step,ENVIRONMENT_ZONE_COLORS.pen.tangent,.85);h.lineBetween(n.x,n.y,n[key].x,n[key].y);
        h.fillStyle(ENVIRONMENT_ZONE_COLORS.pen.tangent,1);h.fillCircle(n[key].x,n[key].y,6*step);
      }
      h.fillStyle(0xffdd75,1);h.fillCircle(n.x,n.y,8*step);
      h.lineStyle(1.5*step,0x1a2734,1);h.strokeCircle(n.x,n.y,8*step);
    }
  }

  _syncDomStatus(){
    super._syncDomStatus?.();
    const r=this._environmentDom;
    if(!r)return;
    if(this._mode==='collision-pen'||this._mode==='collision-edit'){
      const status=r.querySelector('[data-status]');
      if(status)status.textContent=this._mode==='collision-pen'?'MODO · PLUMA COLISIONES':'MODO · EDITAR COLISIÓN';
      const active=this._mode==='collision-pen'?'collisionPen':'select';
      r.querySelectorAll('.es-left button').forEach(x=>x.classList.toggle('on',x.dataset.act===active));
    }
    const info=this._penUi?.querySelector('[data-pen-count]');
    if(info)info.textContent=`${this._collisionLines?.length||0} líneas · ${this._penDraft?.nodes.length||0} nodos nuevos · ${this._collisionSelected?'seleccionada':''}`;
  }
  _project(){
    const p=super._project?.()||{};p.version=Math.max(6,Number(p.version)||0);
    p.collisionLines=(this._collisionLines||[]).filter(validCollisionLine).map(clone);
    return p;
  }
  _applyProject(p){
    this._penDraft=null;this._penGesture=null;this._collisionSelected=null;this._penLastSelected=null;
    super._applyProject?.(p);
    this._collisionLines=(p?.collisionLines||[]).filter(validCollisionLine).map(clone);
    this._drawCollisionPen();this._syncDomStatus();
  }
  _openRealTrack(trackId,resetProject=true){
    this._collisionLines=[];this._collisionSelected=null;this._penDraft=null;this._penLastSelected=null;
    super._openRealTrack?.(trackId,resetProject);
    this._drawCollisionPen();this._syncDomStatus();
  }
  _clearCurrentDecoration(){
    // The editor's "clear all" includes these invisible lines, but does not
    // remove the immutable Track Studio image or physics geometry.
    const count=(this._objects?.length||0)+(this._surfaces?.length||0)+(this._rails?.length||0)+(this._collisionLines?.length||0)+(this._collisionZones?.length||0)+(this._canopyZones?.length||0);
    if(!count){this._flash?.('NO HAY DECORACIÓN QUE BORRAR');return;}
    if(window.confirm?.('¿Borrar decoración y colisiones editables? El trazado oficial no se modifica.')===false)return;
    for(const o of this._objects||[])try{o?.destroy?.();}catch{}
    this._objects=[];this._surfaces=[];this._rails=[];this._collisionLines=[];this._collisionZones=[];this._canopyZones=[];this._canopyDraft=[];this._canopySelected=null;
    this._zoneSelected=null;this._zoneDraft=null;this._zoneGesture=null;
    this._collisionSelected=this._selected=this._selectedSurface=this._selRail=null;
    this._penDraft=null;this._penGesture=null;this._mode='select';
    this._selectionG?.clear?.();this._redrawSurfaces?.();this._drawRails?.();this._drawCollisionPen();this._drawCollisionZones?.();this._drawCanopies?.();this._syncDomStatus();
  }
}
