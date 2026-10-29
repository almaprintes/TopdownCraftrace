import {createTrackShape,shapeIsValid,sampleShapeEdge,splitShapeEdge,moveShapePart,copyTrackShape,nodeRoadWidth,adjustShapeWidthAtNode} from './trackShapeGeometry.js';
import {pickShapeTarget} from './shapeTouchInteraction.js';
import {EDITOR_CONTROL_PIXELS,worldControlRadius} from './trackStudioControlGeometry.js';
import {createShapeDomInspector,shapeInspectorCopy,studioInspectorCopy} from './shapeDomInspector.js';
import { installKartingPreview, LOCAL_KARTING_PREVIEW_KEY } from '../tracks/localKartingPreview.js';
import { trackStudioShapeToolbarLayout } from './trackStudioNavigationLayout.js';

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
  const zoom=Math.max(.02,s._editCam?.zoom||1),stroke=Math.max(1,2.2/zoom);
  g.lineStyle(stroke,0x2ff0ff,.98);drawPolyline(g,left,shape.closed);
  g.lineStyle(stroke,0xffce4b,.98);drawPolyline(g,right,shape.closed);
  if(!s._shapeEditing || !s._shapeSelected)return;
  // Reveal control points only on the selected edge; the other stays a clean outline.
  const radius=px=>worldControlRadius(px,zoom);
  const px=EDITOR_CONTROL_PIXELS;
  for(const side of ['leftEdge','rightEdge']){
    if(side!==s._shapeSelected.side)continue;
    for(let i=0;i<shape[side].length;i++){
      const n=shape[side][i],selected=s._shapeSelected?.side===side&&s._shapeSelected?.index===i;
      const r=radius(selected?px.selectedNode:px.node);
      g.fillStyle(0x061522,.96);
      g.fillCircle(n.x,n.y,r+radius(px.halo));
      g.fillStyle(side==='leftEdge'?0x38f0ff:0xffd05b,1);
      g.fillCircle(n.x,n.y,r);
      g.lineStyle(radius(1.5),selected?0xffffff:0x142b35,1);
      g.strokeCircle(n.x,n.y,r);
      if(!selected)continue;
      g.lineStyle(radius(1.6),0xffffff,.95);
      g.lineBetween(n.x,n.y,n.handleIn.x,n.handleIn.y);
      g.lineBetween(n.x,n.y,n.handleOut.x,n.handleOut.y);
      const handleR=radius(px.handle);
      for(const p of [n.handleIn,n.handleOut]){
        g.fillStyle(0x091724,.98);
        g.fillCircle(p.x,p.y,handleR+radius(px.halo));
        g.fillStyle(0xffffff,1);
        g.fillCircle(p.x,p.y,handleR);
      }
    }
  }
}
function button(s,x,y,text,callback,width=112,height=38){
  // Premium fixed-screen tools with full-size input targets.
  // A Container is essential: hiding the PARRILLA variant hides its whole
  // background and interactive zone, not just a label.
  const w=Math.max(82,width),h=Math.max(38,height);
  const background=s.add.graphics();
  background.fillStyle(0x142a3b,0.98);
  background.lineStyle(1,0x42667a,1);
  background.fillRoundedRect(-w/2,-h/2,w,h,8);
  background.strokeRoundedRect(-w/2,-h/2,w,h,8);
  const label=s.add.text(0,0,text,{
    fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
    fontSize:'11px',fontStyle:'bold',color:'#e5f7ff'
  }).setOrigin(0.5);
  const hit=s.add.zone(0,0,w,h).setOrigin(0.5)
    .setInteractive({useHandCursor:true});
  hit.on('pointerdown',(_p,_x,_y,event)=>{
    s._tapCandidate=false;event?.stopPropagation?.();
  });
  hit.on('pointerup',(_p,_x,_y,event)=>{
    s._tapCandidate=false;event?.stopPropagation?.();callback();
  });
  const container=s.add.container(x+w/2,y+h/2,[background,label,hit])
    .setDepth(1000).setScrollFactor(0);
  container.setTint=(color)=>{
    label.setColor(color===0x83f6d7?'#83f6d7':'#e5f7ff');
    return container;
  };
  s._editCam.ignore(container);
  // Keep the original validated callback available to the DOM skin.
  container.run=callback;
  return container;
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
  // A selected centerline node (or a corresponding border control) may
  // override the base road width. This applies to editor and exported shape.
  s._selectedWidthNodeIndex=()=>{
    if(s._selectedNode>=0&&s._selectedNode<s._nodes.length)return s._selectedNode;
    if(!s._shapeEditing||!s._shapeSelected||!shapeIsValid(s._trackShape))return -1;
    const edge=s._trackShape[s._shapeSelected.side];
    const anchor=edge?.[s._shapeSelected.index];
    if(!anchor)return -1;
    if(Number.isInteger(anchor.sourceNodeIndex)&&anchor.sourceNodeIndex>=0&&anchor.sourceNodeIndex<s._nodes.length)return anchor.sourceNodeIndex;
    if(edge.length===s._nodes.length)return s._shapeSelected.index;
    // Historic subdivided outlines contain no source IDs: map by the
    // closest actual centerline anchor rather than reordering the edges.
    let idx=-1,dist=Infinity;
    for(let i=0;i<s._nodes.length;i++){
      const n=s._nodes[i],d=Math.hypot(anchor.x-n.x,anchor.y-n.y);
      if(d<dist){dist=d;idx=i;}
    }
    return idx;
  };
  s._setLocalNodeWidth=(value)=>{
    const index=s._selectedWidthNodeIndex(),n=s._nodes[index];
    if(!n)return false;
    const original=nodeRoadWidth(n,s._trackWidth);
    const next=value===null?s._trackWidth:Math.max(s._trackWidthMin||30,
      Math.min(s._trackWidthMax||1600,Math.round(Number(value))));
    if(!Number.isFinite(next)||Math.abs(next-original)<1e-8)return false;
    // Prevent a local change from replacing manually edited outlines.
    if(s._trackShape&&!shapeIsValid(s._trackShape)){
      s._flashMessage?.('Contorno inválido: corrige los bordes antes de ajustar ancho');
      return false;
    }
    s._pushHistory();
    if(s._trackShape && !adjustShapeWidthAtNode(s._trackShape,s._nodes,index,next-original)){
      s._flashMessage?.('No se pudo actualizar el contorno');
      return false;
    }
    if(value===null||next===s._trackWidth)delete n.width;
    else n.width=next;
    s._autosaveRecovery();
    s._redrawEditor();s._updatePanel();
    return true;
  };
  let gridOn=null,gridOff=null;
  const refreshGridToggle=()=>{
    gridOn?.setVisible(s._showStartingGrid !== false);
    gridOff?.setVisible(s._showStartingGrid === false);
  };
  const toggleGrid=()=>{
    s._pushHistory();
    s._showStartingGrid = s._showStartingGrid === false;
    s._autosaveRecovery();
    s._redrawEditor();
    s._updatePanel();
    s._flashMessage(s._showStartingGrid ? 'Parrilla activada' : 'Parrilla oculta · meta conservada');
  };
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
    refreshGridToggle();
  };
  const inspector=createShapeDomInspector(s);
  // Important: NEVER call legacy _updatePanel after installing the editor.
  // It invokes Phaser Text.setText on every pointerup, causing iPhone crashes
  // even when shape editing is disabled (confirmed by DEV 1.2.102 stack).
  s._updatePanel=()=>{
    s._emptyHelp?.setVisible(
      !s._studioChromeMounted&&!(s._nodes?.length||s._guideImage||s._imageCanvas||s._trackShape)
    );
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
  const shapeNav=trackStudioShapeToolbarLayout(s._viewX,s._viewY,s._viewW);
  const [createPos,editPos,addPos,gridPos,previewPos]=shapeNav.points;
  const createBtn=button(s,createPos.x,createPos.y,'CREAR PISTA',()=>createOrRebuild(s),createPos.width,createPos.height);
  const editBtn=button(s,editPos.x,editPos.y,'AJUSTAR',()=>{
    if(!shapeIsValid(s._trackShape))return s._flashMessage('Primero pulsa CREAR PISTA');
    s._shapeEditing=!s._shapeEditing;s._shapeSelected=null;s._selectedNode=-1;
    s._selectedPart=null;s._tool='edit';
    s._redrawEditor();s._updatePanel();
    // Keep the button's Phaser Text immutable to avoid a second iOS canvas-UV crash.
    editBtn.setTint?.(s._shapeEditing?0x83f6d7:0xffffff);
    s._flashMessage(s._shapeEditing?'Toca pista para seleccionar; segundo gesto para mover':'Modo centerline · bordes conservados');
  },editPos.width,editPos.height);
  const addBtn=button(s,addPos.x,addPos.y,'+ NODO',()=>insertNode(s),addPos.width,addPos.height);
  // Two immutable Phaser labels avoid the iPhone Text.setText / UV crash.
  gridOn=button(s,gridPos.x,gridPos.y,'PARRILLA: SÍ',toggleGrid,gridPos.width,gridPos.height);
  gridOff=button(s,gridPos.x,gridPos.y,'PARRILLA: NO',toggleGrid,gridPos.width,gridPos.height);
  refreshGridToggle();
  // DEV preview is stored in this browser only. Race times use a separate
  // key, so existing Karting Tenerife rankings are not contaminated.
  let installing=false;
  const previewBtn=button(s,previewPos.x,previewPos.y,'▶ PROBAR JUEGO',async()=>{
    if(installing)return;
    if(!window.confirm('¿Probar este Karting Tenerife en el juego DEV?\\n\\nSe guardará una copia local con un identificador de pruebas. La versión pública y sus récords no cambian.'))return;
    installing=true;
    try{
      await installKartingPreview(s);
      s._autosaveRecovery?.();
      s._flashMessage('Circuito listo. Abriendo carrera DEV…');
      s.scene.start('race',{trackKey:LOCAL_KARTING_PREVIEW_KEY});
    }catch(err){
      console.error('[TrackStudio] No se pudo preparar la carrera',err);
      s._flashMessage('No se puede probar: '+(err?.message||'error'));
    }finally{installing=false}
  },previewPos.width,previewPos.height);
  // Image Lab presentation layer delegates to these exact original handlers,
  // so engine, history, confirmations and track data remain unchanged.
  s._studioShapeButtons={create:createBtn,edit:editBtn,add:addBtn,
    gridOn,gridOff,preview:previewBtn};
    // Controls are screen-fixed and never get written into project coordinates.
  s.events.once('shutdown',()=>{inspector.destroy();[createBtn,editBtn,addBtn,gridOn,gridOff,previewBtn].forEach(b=>b?.destroy());gfx.destroy();});
}
