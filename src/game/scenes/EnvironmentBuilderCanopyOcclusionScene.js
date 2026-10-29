// Environment Studio 2.5D: trace photographed branches that visually pass
// OVER a car. Strictly an authored image occlusion layer, never a solid wall.
import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderAmericasImportScene.js';
import {ENVIRONMENT_ZONE_COLORS} from '../environment/environmentStudioZoneColors.js';
import {validCanopyZone,normalizedCanopyZones} from '../environment/canopyOcclusionGeometry.js';
import {pointInsidePolygon} from '../environment/FreehandCollisionZones.js';
import {createTrackEnvironment} from '../tracks/environmentRegistry.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CANOPY_LIMIT=16;
export class EnvironmentBuilderScene extends Current{
  create(){
    this._canopyZones=[];
    this._canopyDraft=[];
    this._canopySelected=null;
    this._canopyGesture=null;
    this._canopyPausedMode=null;
    super.create();
    this._canopyInk=this.add.graphics().setDepth(29);
    this.cameras.main.ignore(this._canopyInk);
    this._mountCanopyControls();
    this._drawCanopies();
    this.events.once('shutdown',()=>{
      this._canopyGesture=null;
      this._canopyInk?.destroy();
      this._canopyUi=null;this._canopyToggleCount=null;
    });
  }
  _mountCanopyControls(){
    const aside=this._environmentDom?.querySelector('.es-right');
    if(!aside)return;
    const section=document.createElement('section');
    section.className='es-canopy-tool';
    section.style.cssText='border:1px solid #458c73;border-radius:8px;background:#0b2729;padding:10px;margin:8px 0';
    section.innerHTML=`<h3 style="margin:0 0 5px;color:#a7ffd2">🌳 COPAS SOBRE LOS COCHES · 2.5D</h3>
      <p style="font-size:10px;color:#b7d7cb;line-height:1.4">Marca SOLO ramas o copas que invadan la carretera. En carrera, la misma fotografía las dibuja delante del coche, sin colisión.</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px">
      <button type="button" data-canopy="draw">✎ NUEVA COPA</button>
      <button type="button" data-canopy="finish">✓ CERRAR COPA</button>
      <button type="button" data-canopy="undo">↶ DESHACER PUNTO</button>
      <button type="button" data-canopy="edit">☝ EDITAR COPAS</button>
      <button type="button" data-canopy="move">✋ MOVER MAPA</button>
      <button type="button" data-canopy="resume">↪ CONTINUAR</button>
      <button type="button" data-canopy="delete">✕ BORRAR SELECCIÓN</button>
      <button type="button" data-canopy="cancel">CANCELAR BORRADOR</button>
      </div>
      <button type="button" data-canopy="import-copas" style="width:100%;min-height:43px;margin-top:8px;border:1px solid #6cbdf2">
        🌿 CARGAR COPAS DEL CIRCUITO
      </button>
      <p data-canopy-status style="font-size:10px;color:#a6e5d2;margin:8px 0 0">Sin copas</p>`;
    // Canopy painting stays fully functional but does not permanently cover
    // the asset catalogue or the circuit on a short landscape iPhone.
    const group=document.createElement('details');
    group.className='es-canopy-details';
    const toggle=document.createElement('summary');
    toggle.textContent='🌳 COPAS 2.5D · OCULTACIÓN';
    const count=document.createElement('span');
    count.className='es-canopy-count';
    toggle.appendChild(count);
    group.append(toggle,section);
    aside.prepend(group);
    this._canopyUi=section;
    this._canopyToggleCount=count;
    const actions={
      draw:()=>{
        if((this._canopyZones?.length||0)>=CANOPY_LIMIT){
          this._flash?.('MÁXIMO 16 COPAS POR CIRCUITO');return;
        }
        this._canopyDraft=[];this._canopySelected=null;
        this._mode='canopy-draw';this._canopyPausedMode=null;
      },
      finish:()=>{
        const proposed={id:`canopy-${Date.now()}-${this._canopyZones.length}`,
          kind:'photo-canopy',opacity:.93,points:clone(this._canopyDraft||[])};
        if(!normalizedCanopyZones([proposed],this._realTrack?.worldW,this._realTrack?.worldH).length){
          this._flash?.('COPA INCOMPLETA: MÍNIMO 3 PUNTOS, SIN CRUCES');return;
        }
        this._canopyZones.push(proposed);
        this._canopyDraft=[];this._canopySelected=proposed;
        this._mode='canopy-edit';this._canopyPausedMode=null;
        this._exitGuard?.backup?.('canopy-finished');
        this._flash?.('COPA TERMINADA · GUARDA O EXPORTA JSON');
      },
      undo:()=>{if(this._canopyDraft?.length)this._canopyDraft.pop();},
      edit:()=>{this._canopyDraft=[];this._mode='canopy-edit';this._canopyPausedMode=null;},
      move:()=>{this._canopyPausedMode=this._mode==='canopy-draw'?'canopy-draw':this._mode==='canopy-edit'?'canopy-edit':null;this._mode='pan';},
      resume:()=>{this._mode=this._canopyPausedMode||'canopy-draw';this._canopyPausedMode=null;},
      delete:()=>{
        if(!this._canopySelected){this._flash?.('PRIMERO SELECCIONA UNA COPA');return;}
        this._canopyZones=this._canopyZones.filter(z=>z!==this._canopySelected);
        this._canopySelected=null;this._canopyGesture=null;this._mode='canopy-edit';
      },
      cancel:()=>{this._canopyDraft=[];this._canopyGesture=null;this._mode='select';this._canopyPausedMode=null;},
      'import-copas':()=>{
        const trackId=String(this._trackId||'');
        const preset=createTrackEnvironment(trackId);
        const candidates=normalizedCanopyZones(preset?.canopyZones,
          this._realTrack?.worldW,this._realTrack?.worldH);
        if(!candidates.length){
          this._flash?.('ESTE CIRCUITO NO TIENE COPAS GUARDADAS');return;
        }
        if(this._canopyZones.length&&window.confirm?.(
          `¿Sustituir SOLO las copas visuales actuales por las ${candidates.length} copas guardadas de este circuito? Colisiones, foto y resto del proyecto no cambian.`)===false)return;
        this._canopyZones=clone(candidates);this._canopySelected=null;
        this._canopyDraft=[];this._mode='canopy-edit';
        this._flash?.(`${candidates.length} COPAS CARGADAS · LISTAS PARA EDITAR`);
      }
    };
    for(const [name,fn] of Object.entries(actions)){
      const button=section.querySelector(`[data-canopy="${name}"]`);
      button.style.cssText='min-height:42px;font-size:10px;white-space:normal';
      button.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        fn();this._drawCanopies();this._syncDomStatus();
      });
    }
    this._syncDomStatus();
  }
  _setupInput(){
    super._setupInput();
    const inside=p=>this._inside?.(p)&&!this._pinching;
    const world=p=>this._editCam.getWorldPoint(p.x,p.y);
    this.input.on('pointerdown',p=>{
      if(!inside(p))return;
      const pos=world(p),zoom=Math.max(.1,this._editCam.zoom||1);
      if(this._mode==='canopy-draw'){
        if(this._canopyDraft.length>=120){
          this._flash?.('LÍMITE DE 120 NODOS');return;
        }
        const pts=this._canopyDraft;
        if(!pts.length||distance(pts.at(-1),pos)>Math.max(2,4/zoom))
          pts.push({x:pos.x,y:pos.y});
        this._freePan=this._panStart=null;
        this._drawCanopies();this._syncDomStatus();return;
      }
      if(this._mode!=='canopy-edit')return;
      const pickRadius=15/zoom;
      let zone=this._canopySelected,index=-1;
      if(zone)index=zone.points.findIndex(q=>distance(q,pos)<=pickRadius);
      if(index<0)zone=[...(this._canopyZones||[])].reverse()
        .find(z=>pointInsidePolygon(z.points,pos));
      if(!zone){this._canopySelected=null;this._drawCanopies();return;}
      this._canopySelected=zone;
      this._canopyGesture={id:p.id,kind:index>=0?'vertex':'move',index,
        last:pos,original:clone(zone.points)};
      this._freePan=this._panStart=null;
      this._drawCanopies();this._syncDomStatus();
    });
    this.input.on('pointermove',p=>{
      const g=this._canopyGesture;
      if(!g||g.id!==p.id||!p.isDown||this._pinching)return;
      const z=this._canopySelected;if(!z)return;
      const w=world(p);
      if(g.kind==='vertex')z.points[g.index]={x:w.x,y:w.y};
      else{
        const dx=w.x-g.last.x,dy=w.y-g.last.y;
        for(const q of z.points){q.x+=dx;q.y+=dy;}
      }
      g.last=w;this._freePan=this._panStart=null;this._drawCanopies();
    });
    const stop=p=>{
      const g=this._canopyGesture;
      if(!g||g.id!==p?.id)return;
      const z=this._canopySelected;
      if(z&&!normalizedCanopyZones([z],this._realTrack?.worldW,this._realTrack?.worldH).length){
        z.points=g.original;this._flash?.('COPA INVÁLIDA · CAMBIO CANCELADO');
      }
      this._canopyGesture=null;this._drawCanopies();this._syncDomStatus();
    };
    this.input.on('pointerup',stop);
    this.input.on('pointerupoutside',stop);
    this.input.on('gameout',()=>{this._canopyGesture=null;});
  }
  _drawCanopies(){
    const g=this._canopyInk;if(!g)return;
    g.clear();
    const u=1/Math.max(.1,this._editCam?.zoom||1);
    const draw=(pts,selected=false,unfinished=false)=>{
      if(!Array.isArray(pts)||pts.length<2)return;
      const colors=ENVIRONMENT_ZONE_COLORS.canopy;
      const color=selected?colors.selected:unfinished?colors.draft:colors.line;
      if(pts.length>=3){
        g.fillStyle(color,unfinished?.06:.16);
        g.beginPath();g.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
        g.closePath();g.fillPath();
      }
      g.lineStyle(2.6*u,color,.98);g.beginPath();g.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
      if(!unfinished)g.closePath();
      g.strokePath();
      if(selected||unfinished){
        g.fillStyle(color,1);
        for(const q of pts)g.fillCircle(q.x,q.y,4.3*u);
      }
    };
    for(const z of this._canopyZones||[])draw(z.points,z===this._canopySelected);
    draw(this._canopyDraft,false,true);
  }
  _syncDomStatus(){
    super._syncDomStatus?.();
    const t=this._canopyUi?.querySelector('[data-canopy-status]');
    if(t)t.textContent=`${this._canopyZones?.length||0} copas terminadas · ${this._canopyDraft?.length||0} puntos · ${this._mode==='canopy-draw'?'TOCA EL BORDE DE LAS RAMAS':this._mode==='canopy-edit'?'ARRASTRA COPA O VÉRTICES':this._canopyPausedMode?'TRAZADO EN PAUSA':'Pulsa NUEVA COPA'}`;
    if(this._canopyToggleCount)this._canopyToggleCount.textContent=` ${this._canopyZones?.length||0}/16`;
  }
  _project(){
    const project=super._project?.()||{};
    project.version=Math.max(8,Number(project.version)||0);
    project.canopyZones=normalizedCanopyZones(this._canopyZones,
      this._realTrack?.worldW,this._realTrack?.worldH);
    return project;
  }
  _applyProject(p){
    super._applyProject?.(p);
    this._canopyZones=normalizedCanopyZones(p?.canopyZones,
      this._realTrack?.worldW,this._realTrack?.worldH);
    this._canopySelected=null;this._canopyDraft=[];this._canopyGesture=null;
    this._drawCanopies();this._syncDomStatus();
  }
  _openRealTrack(trackId,resetProject=true){
    this._canopyZones=[];this._canopySelected=null;this._canopyDraft=[];
    super._openRealTrack?.(trackId,resetProject);
    this._drawCanopies();this._syncDomStatus();
  }
}
