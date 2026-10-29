import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderCollisionPenScene.js';
import {simplifyFreehandZone,validCollisionZone,pointInsidePolygon} from '../environment/FreehandCollisionZones.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// Draw over trees, buildings or other decorative shapes without painting
// anything on the source image. All coordinates are world pixels (1:1).
import {ENVIRONMENT_ZONE_COLORS} from '../environment/environmentStudioZoneColors.js';

export class EnvironmentBuilderScene extends Current {
  create(){
    this._collisionZones=[];
    this._zoneSelected=null;
    this._zoneDraft=null;
    this._zoneGesture=null;
    this._zoneStrokeStarts=[];
    super.create();
    this._collisionZoneInk=this.add.graphics().setDepth(23.5);
    this.cameras.main.ignore(this._collisionZoneInk);
    this._mountFreehandZoneUi();
    this._drawCollisionZones();
    this.events.once('shutdown',()=>{
      this._zoneGesture=null;this._zoneDraft=null;
      this._collisionZoneInk?.destroy?.();
    });
  }

  _mountFreehandZoneUi(){
    const root=this._environmentDom,aside=root?.querySelector('.es-right');
    if(!root||!aside)return;
    const section=document.createElement('section');
    section.className='es-freehand-collision-zones';
    section.innerHTML=`<h3>ZONAS · COLISIÓN</h3>
      <p style="font-size:10px;font-weight:500;line-height:1.45;color:#9bb1cd;margin:4px 0 8px">
      Dibuja el contorno en varios trazos. Puedes mover el mapa y continuar; cierra solo cuando pulses TERMINAR ZONA.</p>
      <div class="es-grid two" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:7px">
        <button data-zone="draw">✎ MANO ALZADA</button>
        <button data-zone="finish">✓ TERMINAR ZONA</button>
        <button data-zone="undo">↶ DESHACER TRAZO</button>
        <button data-zone="edit">EDITAR ZONAS</button>
        <button data-zone="cancel">CANCELAR TRAZO</button>
        <button data-zone="delete" class="danger">BORRAR ZONA</button>
      </div>
      <p data-zone-count style="font-size:9px;color:#8cddfa;margin-top:9px"></p>`;
    const group=document.createElement('details');
    group.className='es-advanced-group es-zone-details';
    const summary=document.createElement('summary');
    summary.textContent='ZONAS · COLISIÓN';
    group.append(summary,section);
    aside.prepend(group);
    this._zoneUi=section;
    const wire=(id,fn)=>section.querySelector(`[data-zone="${id}"]`)?.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();fn();this._syncDomStatus();
    });
    wire('draw',()=>this._startFreehandZones());
    wire('finish',()=>this._finishFreehandZone());
    wire('undo',()=>this._undoCollisionAction?this._undoCollisionAction():this._undoFreehandStroke());
    wire('edit',()=>this._editFreehandZones());
    wire('cancel',()=>this._cancelFreehandZone());
    wire('delete',()=>this._deleteFreehandZone());
    const left=root.querySelector('.es-left');
    if(left){
      const button=document.createElement('button');
      button.dataset.act='freehandCollision';
      button.textContent='▱ ZONA';button.title='Dibujar zona sólida de colisión a mano alzada';
      button.style.fontSize='11px';button.addEventListener('click',()=>this._startFreehandZones());
      left.append(button);
    }
    this._syncDomStatus();
  }

  _startFreehandZones(){
    this._disarmCreation?.();
    this._penDraft=null;this._penGesture=null;this._collisionSelected=null;
    this._selected=this._selectedSurface=this._selRail=null;
    this._selectionG?.clear?.();
    this._zoneDraft=[];this._zoneStrokeStarts=[];this._zoneGesture=null;this._zoneSelected=null;
    this._mode='collision-zone-draw';this._drawCollisionPen?.();
    this._drawCollisionZones();this._syncDomStatus();
    this._flash?.('MANO ALZADA · RODEA LA ZONA Y SUELTA PARA CERRAR');
  }
  _finishFreehandZone(){
    if(this._zoneGesture){this._flash?.('SUELTA EL DEDO ANTES DE TERMINAR');return;}
    const points=this._zoneDraft||[];
    const zoom=Math.max(.1,this._editCam?.zoom||1);
    const zone=simplifyFreehandZone(points,{tolerance:Math.min(14,Math.max(2,3/zoom)),maxPoints:180});
    if(!zone){this._flash?.('ZONA NO VÁLIDA · REVISA QUE EL CONTORNO NO SE CRUCE');return;}
    zone.id=`solid-zone-${Date.now()}-${this._collisionZones.length}`;
    this._collisionZones.push(zone);this._zoneDraft=[];this._zoneStrokeStarts=[];
    this._zoneSelected=null;this._mode='collision-zone-draw';
    this._drawCollisionZones();this._syncDomStatus();
    this._builderToast?.('ZONA CERRADA · PULSA GUARDAR PARA CONSERVARLA');
  }
  _undoFreehandStroke(){
    if(this._zoneGesture){this._flash?.('SUELTA EL DEDO PARA DESHACER');return;}
    if(this._zoneDraft?.length&&this._zoneStrokeStarts?.length){
      const start=this._zoneStrokeStarts.pop();
      this._zoneDraft.length=start;
      this._drawCollisionZones();this._syncDomStatus();
      this._flash?.('ÚLTIMO TRAZO DESHECHO');
      return;
    }
    this._undoLast?.();
  }
  _editFreehandZones(){
    // Preserve an unfinished drawing when temporarily switching to selection.
    this._zoneGesture=null;
    this._mode=this._zoneSelected?'collision-zone-edit':'select';
    this._drawCollisionZones();this._syncDomStatus();
  }
  _cancelFreehandZone(){
    this._zoneDraft=null;this._zoneStrokeStarts=[];this._zoneGesture=null;
    if(this._mode==='collision-zone-draw')this._mode='select';
    this._drawCollisionZones();this._syncDomStatus();
  }
  _deleteFreehandZone(){
    if(!this._zoneSelected){this._flash?.('SELECCIONA UNA ZONA');return;}
    this._collisionZones=this._collisionZones.filter(z=>z!==this._zoneSelected);
    this._zoneSelected=null;this._zoneDraft=null;this._zoneStrokeStarts=[];this._zoneGesture=null;
    this._mode='select';this._drawCollisionZones();this._syncDomStatus();
    this._flash?.('ZONA DE COLISIÓN BORRADA');
  }
  _delete(){
    if(this._zoneSelected){this._deleteFreehandZone();return;}
    super._delete?.();
  }

  _collisionHit(w,handleRadius,curveRadius){
    if(this._mode==='select'&&this._collisionZones?.some(z=>pointInsidePolygon(z.points,w)))
      return null; // The zone is in front of the independent Bézier line.
    return super._collisionHit?.(w,handleRadius,curveRadius);
  }
  _select(obj){
    this._zoneSelected=null;this._zoneDraft=null;
    super._select?.(obj);this._drawCollisionZones();
  }
  _selectSurface(s){
    this._zoneSelected=null;this._zoneDraft=null;
    super._selectSurface?.(s);this._drawCollisionZones();
  }
  _selectRail(s){
    this._zoneSelected=null;this._zoneDraft=null;
    super._selectRail?.(s);this._drawCollisionZones();
  }
  _activateCollisionPen(){this._zoneSelected=null;this._zoneDraft=null;super._activateCollisionPen?.();this._drawCollisionZones();}
  _chooseAsphalt(){this._zoneSelected=null;this._zoneDraft=null;super._chooseAsphalt?.();this._drawCollisionZones();}
  _chooseLinear(def){this._zoneSelected=null;this._zoneDraft=null;super._chooseLinear?.(def);this._drawCollisionZones();}

  _setupInput(){
    super._setupInput();
    const world=p=>this._editCam.getWorldPoint(p.x,p.y);
    this.input.on('pointerdown',p=>{
      if(this._pinching||!this._inside?.(p)||this._zoneGesture)return;
      const w=world(p);
      const zoom=Math.max(.1,this._editCam?.zoom||1);
      if(this._mode==='collision-zone-draw'){
        // A short tap does not add geometry. Only a deliberate stroke does.
        const start=this._zoneDraft?.length||0;
        this._zoneDraft=this._zoneDraft||[];
        this._zoneGesture={pointerId:p.id,kind:'draw',start,startScreen:{x:p.x,y:p.y},origin:w,moved:false};
        this._freePan=this._panStart=null;this._drawCollisionZones();return;
      }
      if(this._mode!=='select'&&this._mode!=='collision-zone-edit')return;
      // Prefer the active polygon's vertex handles, then test area interiors.
      const hitRadius=14/zoom;
      let zone=this._zoneSelected,vertex=-1;
      if(zone)for(let i=0;i<zone.points.length;i++)if(dist(zone.points[i],w)<=hitRadius){vertex=i;break;}
      if(vertex<0){
        zone=[...this._collisionZones].reverse().find(z=>pointInsidePolygon(z.points,w));
      }
      if(!zone){
        if(this._mode==='collision-zone-edit'){
          this._zoneSelected=null;this._mode='select';this._drawCollisionZones();
        }
        return;
      }
      this._zoneSelected=zone;this._mode='collision-zone-edit';
      this._selected=this._selectedSurface=this._selRail=this._collisionSelected=null;
      this._emptyTapCandidate=this._assetTapCandidate=null;
      this._selectionG?.clear?.();this._drawCollisionPen?.();
      this._zoneGesture={pointerId:p.id,kind:vertex>=0?'vertex':'move',index:vertex,last:w,original:copy(zone.points)};
      this._freePan=this._panStart=null;this._drawCollisionZones();this._syncDomStatus();
    });
    this.input.on('pointermove',p=>{
      const gesture=this._zoneGesture;
      if(!gesture||gesture.pointerId!==p.id||!p.isDown||this._pinching)return;
      const w=world(p);
      if(gesture.kind==='draw'){
        const z=Math.max(.1,this._editCam?.zoom||1),minStep=Math.max(2,3/z);
        const points=this._zoneDraft;
        if(!gesture.moved){
          if(Math.hypot(p.x-gesture.startScreen.x,p.y-gesture.startScreen.y)<9)return;
          gesture.moved=true;
          this._zoneStrokeStarts.push(gesture.start);
          points.push({x:gesture.origin.x,y:gesture.origin.y});
        }
        if(points?.length&&dist(points.at(-1),w)>=minStep&&points.length<1800){
          points.push({x:w.x,y:w.y});this._drawCollisionZones();
        }
      }else if(this._zoneSelected){
        if(gesture.kind==='vertex'){
          this._zoneSelected.points[gesture.index]={x:w.x,y:w.y};
        }else{
          const dx=w.x-gesture.last.x,dy=w.y-gesture.last.y;
          for(const q of this._zoneSelected.points){q.x+=dx;q.y+=dy;}
        }
        gesture.last=w;this._panStart=this._freePan=null;this._drawCollisionZones();
      }
    });
    const release=(p,outside=false)=>{
      const gesture=this._zoneGesture;
      if(!gesture||p?.id!==gesture.pointerId)return;
      this._zoneGesture=null;
      if(gesture.kind==='draw'){
        if(!gesture.moved){
          // Taps while locating the next sector must not leave accidental points.
          this._flash?.('TRAZO NO INICIADO · ARRASTRA PARA DIBUJAR');
        }else{
          if(!outside&&this._inside?.(p)){
            const w=world(p);
            if(this._zoneDraft.length&&dist(this._zoneDraft.at(-1),w)>2)
              this._zoneDraft.push({x:w.x,y:w.y});
          }
          this._flash?.('TRAZO AÑADIDO · PUEDES MOVER EL MAPA O SEGUIR DIBUJANDO');
        }
      }else if(this._zoneSelected&&!validCollisionZone(this._zoneSelected)){
        this._zoneSelected.points=gesture.original;
        this._flash?.('CAMBIO CANCELADO · POLÍGONO NO VÁLIDO');
      }
      this._drawCollisionZones();this._syncDomStatus();
    };
    this.input.on('pointerup',p=>release(p,false));
    this.input.on('pointerupoutside',p=>release(p,true));
  }

  _drawCollisionZones(){
    const g=this._collisionZoneInk;if(!g)return;g.clear();
    const zoom=Math.max(.1,this._editCam?.zoom||1),unit=1/zoom;
    const shape=(pts,selected=false,unfinished=false)=>{
      if(!pts||pts.length<2)return;
      const colors=ENVIRONMENT_ZONE_COLORS.zone;
      const color=selected?colors.selected:unfinished?colors.draft:colors.line;
      if(pts.length>=3){
        g.fillStyle(color,unfinished?.10:.16);
        g.beginPath();g.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
        g.closePath();g.fillPath();
      }
      g.lineStyle((selected?3.5:2.5)*unit,color,.97);
      g.beginPath();g.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
      if(!unfinished)g.closePath();g.strokePath();
    };
    for(const zone of this._collisionZones||[])shape(zone.points,zone===this._zoneSelected);
    if(this._zoneDraft?.length)shape(this._zoneDraft,false,true);
    if(this._zoneSelected&&this._mode==='collision-zone-edit'){
      g.fillStyle(ENVIRONMENT_ZONE_COLORS.zone.handle,1);
      for(const p of this._zoneSelected.points)g.fillCircle(p.x,p.y,5.5*unit);
    }
  }

  _syncDomStatus(){
    super._syncDomStatus?.();
    const root=this._environmentDom;
    if(!root)return;
    if(this._mode==='collision-zone-draw'||this._mode==='collision-zone-edit'){
      const status=root.querySelector('[data-status]');
      if(status)status.textContent=this._mode==='collision-zone-draw'?'MODO · PINTAR COLISIONES':'MODO · EDITAR ZONA';
      const active=this._mode==='collision-zone-draw'?'freehandCollision':'select';
      root.querySelectorAll('.es-left button').forEach(b=>b.classList.toggle('on',b.dataset.act===active));
    }
    const count=this._zoneUi?.querySelector('[data-zone-count]');
    if(count)count.textContent=`${this._collisionZones?.length||0} zonas cerradas · ${this._zoneDraft?.length||0} puntos en curso · ${this._zoneSelected?'1 seleccionada':'TERMINAR ZONA para cerrar'}`;
  }

  _project(){
    const p=super._project?.()||{};
    p.version=Math.max(7,Number(p.version)||0);
    p.collisionZones=(this._collisionZones||[]).filter(validCollisionZone).map(copy);
    return p;
  }
  _applyProject(p){
    this._zoneSelected=null;this._zoneGesture=null;this._zoneDraft=null;this._zoneStrokeStarts=[];
    super._applyProject?.(p);
    this._collisionZones=(p?.collisionZones||[]).filter(validCollisionZone).map(copy);
    this._drawCollisionZones();this._syncDomStatus();
  }
  _openRealTrack(trackId,resetProject=true){
    this._collisionZones=[];this._zoneSelected=null;this._zoneDraft=null;this._zoneStrokeStarts=[];this._zoneGesture=null;
    super._openRealTrack?.(trackId,resetProject);
    this._drawCollisionZones();this._syncDomStatus();
  }
}
