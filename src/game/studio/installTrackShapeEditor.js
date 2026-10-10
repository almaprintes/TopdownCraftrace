import {createTrackShape,shapeIsValid,sampleShapeEdge,splitShapeEdge,moveShapePart,copyTrackShape} from './trackShapeGeometry.js';

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
  if(!s._shapeEditing)return;
  const nodeR=Math.min(22,Math.max(5,6/zoom));
  for(const side of ['leftEdge','rightEdge']){
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
  const shape=s._trackShape,zoom=Math.max(.04,s._editCam?.zoom||1),
        radius=Math.min(40,Math.max(9,13/zoom));
  let best=null,dist2=radius*radius;
  const consider=(side,index,part,p)=>{
    const dx=x-p.x,dy=y-p.y,d=dx*dx+dy*dy;
    if(d<dist2){dist2=d;best={type:'shape',side,index,part};}
  };
  // Selected node's Bézier handles first to make precision adjustment usable.
  const sel=s._shapeSelected;
  if(sel&&shape[sel.side]?.[sel.index]){
    const n=shape[sel.side][sel.index];
    consider(sel.side,sel.index,'handleIn',n.handleIn);
    consider(sel.side,sel.index,'handleOut',n.handleOut);
  }
  for(const side of ['leftEdge','rightEdge']){
    shape[side].forEach((n,index)=>consider(side,index,'anchor',n));
  }
  return best;
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
    s._shapeSelected={type:'shape',side:'leftEdge',index:0,part:'anchor'};
    s._selectedNode=-1;s._selectedPart=null;s._tool='edit';
    s._autosaveRecovery();s._redrawEditor();s._updatePanel();
    s._flashMessage('Pista convertida: bordes turquesa y amarillo');
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
    render(s);
  };
  const originalPanel=s._updatePanel.bind(s);
  s._updatePanel=()=>{
    originalPanel();
    if(!s._shapeEditing||!shapeIsValid(s._trackShape))return;
    const sel=s._shapeSelected,node=sel&&s._trackShape[sel.side]?.[sel.index];
    s._panelDeleteBtn?.setVisible(false);
    s._panelEmptyText?.setVisible(false);
    s._panelInfoText?.setVisible(true);
    s._panelInfoText?.setText(node
      ?('BORDE '+(sel.side==='leftEdge'?'IZQUIERDO':'DERECHO')+'\n'
       +'Nodo: '+(sel.index+1)+'/'+s._trackShape[sel.side].length+'\n'
       +'X: '+Math.round(node.x)+'\nY: '+Math.round(node.y)+'\n'
       +'Mueve el punto o sus dos tiradores.\n'
       +' +NODO subdivide el siguiente tramo.')
      :'AJUSTAR BORDES\nPulsa un punto turquesa o amarillo.\n'
       +'Arrastra el nodo o sus tiradores.\n'
       +'La centerline está protegida en este modo.');
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
    s._flashMessage(s._shapeEditing?'Editando bordes independientes':'Modo centerline · bordes conservados');
  });
  const addBtn=button(s,x+205,y,'+ NODO',()=>insertNode(s));
  // Controls are screen-fixed and never get written into project coordinates.
  s.events.once('shutdown',()=>{[createBtn,editBtn,addBtn].forEach(b=>b.destroy());gfx.destroy();});
}
