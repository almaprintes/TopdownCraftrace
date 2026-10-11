import {createTrackShape,shapeIsValid,sampleShapeEdge,splitShapeEdge,moveShapePart,copyTrackShape} from './trackShapeGeometry.js';
import {pickShapeTarget} from './shapeTouchInteraction.js';
import {createShapeDomInspector,shapeInspectorCopy,studioInspectorCopy} from './shapeDomInspector.js';

function drawPolyline(g,points,closed){
  if(points.length<2)return;
  g.beginPath();g.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
  if(closed)g.closePath();
  g.strokePath();
}
function render(s){
  const g=s._shapeGfx;
  if(!g)return;
  g.clear();
  const shape=s._trackShape;
  if(!shapeIsValid(shape))return;
  const left=sampleShapeEdge(shape.leftEdge,shape.closed,14),
        right=sampleShapeEdge(shape.rightEdge,shape.closed,14);
  if(left.length<2||right.length<2)return;
  g.fillStyle(0x00d5fa,.13);
  g.fillPoints([...left,...right.slice().reverse()],true);
  const zoom=Math.max(.04,s._editCam?.zoom||1),stroke=Math.max(1,2.2/zoom);
  g.lineStyle(stroke,0x2ff0ff,.98);drawPolyline(g,left,shape.closed);
  g.lineStyle(stroke,0xffce4b,.98);drawPolyline(g,right,shape.closed);
  if(!s._shapeEditing || !s._shapeSelected)return;
  // Reveal control points only on the selected edge; the other stays a clean outline.
  const nodeR=7/zoom;
  for(const side of ['leftEdge','rightEdge']){
    if(side!==s._shapeSelected.side)continue;
    for(let i=0;i<shape[side].length;i++){
      const n=shape[side][i],selected=s._shapeSelected?.side===side&&s._shapeSelected?.index===i;
      g.fillStyle(side==='leftEdge'?0x2ff0ff:0xffce4b,1);
      g.fillCircle(n.x,n.y,selected?nodeR*1.5:nodeR);
      g.lineStyle(Math.max(.8,1.6/zoom),0x071827,1);
      g.strokeCircle(n.x,n.y,selected?nodeR*1.5:nodeR);
      if(!selected)continue;
      g.lineStyle(stroke,0xffffff,.9);
      g.lineBetween(n.x,n.y,n.handleIn.x,n.handleIn.y);
      g.lineBetween(n.x,n.y,n.handleOut.x,n.handleOut.y);
      g.fillStyle(0xffffff,1);
      g.fillCircle(n.handleIn.x,n.handleIn.y,nodeR*.87);
      g.fillCircle(n.handleOut.x,n.handleOut.y,nodeR*.87);
    }
  }
}
function button(s,x,y,text,callback){
  const obj=s.add.text(x,y,text,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
    fontSize:'12px',fontStyle:'bold',color:'#ffffff',backgroundColor:'#12344b',
    padding:{x:9,y:6}})
    .setDepth(1000).setScrollFactor(0).setInteractive({useHandCursor:true});
  obj.on('pointerdown',(_p,_x,_y,event)=>{
    s._tapCandidate=false;
    event?.stopPropagation?.();
  });
  obj.on('pointerup',(_p,_x,_y,event)=>{
    s._tapCandidate=false;
    event?.stopPropagation?.();
    callback();
  });
  s._editCam.ignore(obj);
  return obj;
}
function findShapeControl(s,x,y){
  if(!s._shapeEditing||!shapeIsValid(s._trackShape))return null;
  return pickShapeTarget(s._trackShape,s._shapeSelected,{x,y},s._editCam?.zoom);
}

function createOrRebuild(s){
  if(s._nodes.length<(s._isClosed?3:2))return s._flashMessage('Traza primero la centerline completa');
  if(s._trackShape && !window.confirm('¿Regenerar ambos bordes?\n\nPerderás los ajustes de la forma actual. El eje central NO se modificará.'))return;
  try{
    const next=createTrackShape(s._nodes,Number(s._trackWidth),!!s._isClosed);
    s._pushHistory();
    s._trackShape=next;
    if(s._isClosed && s._raceType==='stage')s._raceType='circuit';
    s._shapeEditing=true;
    s._shapeSelected=null;
    s._selectedNode=-1;s._selectedPart=null;s._tool='edit';
    s._autosaveRecovery();s._redrawEditor();s._updatePanel();
    s._flashMessage('Pista lista: toca un borde para mostrar sus nodos');
  }catch(e){s._flashMessage(e.message||'No se pudo convertir en pista');}
}
function insertNode(s){
  if(!s._shapeEditing||!shapeIsValid(s._trackShape))return s._flashMessage('Activa AJUSTAR y selecciona un nodo de borde');
  const selected=s._shapeSelected;
  if(!selected)return s._flashMessage('Selecciona el nodo anterior al tramo que quieres dividir');
  const edge=s._trackShape[selected.side];
  if(edge.length>=1200)return s._flashMessage('Máximo de nodos de borde alcanzado');
  try{
    const index=selected.index===edge.length-1&&!s._trackShape.closed?selected.index-1:selected.index;
    s._pushHistory();
    const added=splitShapeEdge(edge,index,s._trackShape.closed);
    s._shapeSelected={type:'shape',side:selected.side,index:added,part:'anchor'};
    s._autosaveRecovery();s._redrawEditor();s._updatePanel();
    s._flashMessage('Nodo añadido al borde, sin deformar la curva');
  }catch(e){s._flashMessage(e.message||'No se pudo añadir nodo');}
}
export function installTrackStudioShapeEditor(s){
  s._trackShape=null;s._shapeEditing=false;s._shapeSelected=null;
  const gfx=s.add.graphics().setDepth(13);
  s._shapeGfx=gfx;s.cameras.main.ignore(gfx);
  const originalProject=s._getProjectData.bind(s);
  s._getProjectData=()=>({...originalProject(),trackShape:copyTrackShape(s._trackShape),shapeEditing:!!s._shapeEditing});
  const originalExport=s._exportToGameTrack.bind(s);
  s._exportToGameTrack=()=>{
    const exported=originalExport();
    if(exported&&shapeIsValid(s._trackShape))exported.trackShape=copyTrackShape(s._trackShape);
    return exported;
  };
  const originalApply=s._applyProjectData.bind(s);
  s._applyProjectData=data=>{
    originalApply(data);
    s._trackShape=copyTrackShape(data?.trackShape);
    s._shapeEditing=!!(s._trackShape&&data?.shapeEditing);
    s._shapeSelected=null;
    if(s._isClosed&&s._raceType==='stage')s._raceType='circuit';
    s._redrawEditor();s._updatePanel();
  };
  const originalNew=s._newProject.bind(s);
  s._newProject=()=>{
    originalNew();
    s._trackShape=null;s._shapeEditing=false;s._shapeSelected=null;
    s._redrawEditor();s._updatePanel();
  };
  const originalImport=s._importProjectOrTrack.bind(s);
  s._importProjectOrTrack=data=>{
    originalImport(data);
    if(data?.editor||Array.isArray(data?.nodes))return;
    s._trackShape=copyTrackShape(data?.trackShape);
    s._shapeEditing=false;s._shapeSelected=null;
    s._redrawEditor();s._updatePanel();
  };
  const originalRedraw=s._redrawEditor.bind(s);
  s._redrawEditor=()=>{
    originalRedraw();
    if(s._trackShape)s._trackGfx.clear(); // do not overlay an obsolete uniform-width ribbon.
    if(s._shapeEditing){
      // Centerline control dots formerly overlapped the two editable boundaries.
      s._nodeGfx?.clear();s._guideGfx?.clear();
    }
    render(s);
  };
  const inspector=createShapeDomInspector(s);
  // Important: NEVER call legacy _updatePanel after installing the editor.
  // It invokes Phaser Text.setText on every pointerup, causing iPhone crashes
  // even when shape editing is disabled (confirmed by DEV 1.2.102 stack).
  s._updatePanel=()=>{
    const edgeMode=!!(s._shapeEditing && shapeIsValid(s._trackShape));
    s._panelInfoText?.setVisible(false);
    s._panelEmptyText?.setVisible(false);
    const showControls=!edgeMode&&(
      (s._selectedPiano>=0&&s._selectedPiano<(s._pianos?.length||0))||
      (s._selectedNode>=0&&s._selectedNode<(s._nodes?.length||0))
    );
    s._panelDeleteBtn?.setVisible(showControls);
    for(const part of [s._padUp,s._padDown,s._padLeft,s._padRight]){
      part?.bg?.setVisible(showControls);
      part?.txt?.setVisible(showControls);
    }
    s._padCenter?.setVisible(showControls);
    s._padCenterTxt?.setVisible(showControls);
    inspector.show(edgeMode
      ? shapeInspectorCopy(s._trackShape,s._shapeSelected)
      : studioInspectorCopy(s));
  };
  s._findShapeControlAt=(x,y)=>findShapeControl(s,x,y);
  s._moveShapeControl=(part,world)=>{
    if(!s._shapeEditing||!s._trackShape||part?.type!=='shape')return;
    if(moveShapePart(s._trackShape,part.side,part.index,part.part,world)){
      s._shapeSelected={...part};s._selectedNode=-1;
      s._redrawEditor();s._updatePanel();
    }
  };
  const y=s._viewY+9,x=s._viewX+10;
  const createBtn=button(s,x,y,'CREAR PISTA',()=>createOrRebuild(s));
  const editBtn=button(s,x+114,y,'AJUSTAR',()=>{
    if(!shapeIsValid(s._trackShape))return s._flashMessage('Primero pulsa CREAR PISTA');
    s._shapeEditing=!s._shapeEditing;s._shapeSelected=null;s._selectedNode=-1;
    s._selectedPart=null;s._tool='edit';
    s._redrawEditor();s._updatePanel();
    // Keep the button's Phaser Text immutable to avoid a second iOS canvas-UV crash.
    editBtn.setTint?.(s._shapeEditing?0x83f6d7:0xffffff);
    s._flashMessage(s._shapeEditing?'Toca pista para seleccionar; segundo gesto para mover':'Modo centerline · bordes conservados');
  });
  const addBtn=button(s,x+225,y,'+ NODO',()=>insertNode(s));
  // Controls are screen-fixed and never get written into project coordinates.
  s.events.once('shutdown',()=>{inspector.destroy();[createBtn,editBtn,addBtn].forEach(b=>b.destroy());gfx.destroy();});
}
