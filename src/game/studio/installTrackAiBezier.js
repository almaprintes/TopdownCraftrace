// Track Studio experimental AI Bezier layer: separate from the road and
// historic apex hints. Nodes/handles are edited in world coordinates.
import {normalizeAiBezierLine,createAiBezierFromTrackNodes,
 sampleAiBezierLine,moveAiBezierPart,AI_BEZIER_MAX_NODES}
 from './trackAiBezierLine.js';
import {splitShapeEdge} from './trackShapeGeometry.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function draw(scene){
 const gfx=scene._aiBezierGfx;
 if(!gfx)return;
 gfx.clear();
 const line=scene._aiBezierLine;
 if(!line)return;
 const zoom=Math.max(.04,scene._editCam?.zoom||1),editing=scene._tool==='aiBezier';
 const samples=sampleAiBezierLine(line,20);
 if(samples.length<3)return;
 gfx.lineStyle(Math.max(1.8,2.6/zoom),0xe8a7ff,editing?1:.58);
 gfx.beginPath();gfx.moveTo(samples[0].x,samples[0].y);
 for(let i=1;i<samples.length;i++)gfx.lineTo(samples[i].x,samples[i].y);
 gfx.closePath();gfx.strokePath();
 if(!editing)return;
 line.nodes.forEach((node,index)=>{
  const active=scene._aiBezierSelected===index;
  gfx.fillStyle(active?0xffffff:0xd89eff,1);
  gfx.fillCircle(node.x,node.y,(active?8:5.5)/zoom);
  if(!active)return;
  gfx.lineStyle(1.5/zoom,0xffffff,.8);
  gfx.lineBetween(node.x,node.y,node.handleIn.x,node.handleIn.y);
  gfx.lineBetween(node.x,node.y,node.handleOut.x,node.handleOut.y);
  for(const part of ['handleIn','handleOut']){
   gfx.fillStyle(part==='handleIn'?0x80eaff:0xffdf90,1);
   gfx.fillCircle(node[part].x,node[part].y,6/zoom);
  }
 });
}
export function installTrackStudioAiBezier(scene){
 scene._aiBezierLine=null;scene._aiBezierSelected=-1;scene._aiBezierGesture=null;
 scene._aiBezierGfx=scene.add.graphics().setDepth(15);
 scene.cameras.main.ignore(scene._aiBezierGfx);
 const oldProject=scene._getProjectData.bind(scene);
 scene._getProjectData=()=>{
  const value=oldProject();
  return scene._aiBezierLine?{...value,aiBezierLine:normalizeAiBezierLine(scene._aiBezierLine)}
   :value;
 };
 const oldExport=scene._exportToGameTrack.bind(scene);
 scene._exportToGameTrack=()=>{
  const value=oldExport();
  if(value){
   delete value.aiBezierLine;
   if(scene._aiBezierLine)value.aiBezierLine=normalizeAiBezierLine(scene._aiBezierLine);
  }
  return value;
 };
 const oldApply=scene._applyProjectData.bind(scene);
 scene._applyProjectData=data=>{
  oldApply(data);
  scene._aiBezierLine=normalizeAiBezierLine(data?.aiBezierLine);
  scene._aiBezierSelected=-1;scene._aiBezierGesture=null;
  scene._redrawEditor();scene._updatePanel();
 };
 const oldImport=scene._importProjectOrTrack.bind(scene);
 scene._importProjectOrTrack=data=>{
  const editor=Boolean(data?.editor||Array.isArray(data?.nodes));
  const value=oldImport(data);
  if(!editor){
   scene._aiBezierLine=normalizeAiBezierLine(data?.aiBezierLine||data?.meta?.aiBezierLine);
   scene._aiBezierSelected=-1;scene._redrawEditor();scene._updatePanel();
  }
  return value;
 };
 const oldNew=scene._newProject.bind(scene);
 scene._newProject=(...args)=>{
  const value=oldNew(...args);
  scene._aiBezierLine=null;scene._aiBezierSelected=-1;
  scene._redrawEditor();scene._updatePanel();return value;
 };
 const oldRedraw=scene._redrawEditor.bind(scene);
 scene._redrawEditor=(...args)=>{const out=oldRedraw(...args);draw(scene);return out;};
 scene._aiBezierToggle=()=>{
  const active=scene._tool==='aiBezier';
  scene._cancelPenGesture?.();
  scene._tool=active?'edit':'aiBezier';
  scene._shapeEditing=false;scene._shapeSelected=null;
  scene._selectedNode=-1;scene._selectedPart=null;scene._selectedPiano=-1;
  scene._aiBezierGesture=null;
  scene._updateToolButtons();scene._redrawEditor();scene._updatePanel();
  scene._flashMessage(active?'Edición Bézier cerrada':
   'TRAZADA IA · genera una base y ajusta sus nodos y tiradores');
 };
 scene._aiBezierGenerate=()=>{
  if(!scene._isClosed||scene._nodes.length<3)
   return scene._flashMessage('Primero abre un circuito cerrado');
  if(scene._aiBezierLine&&!window.confirm(
    '¿Regenerar la trayectoria IA? Perderás los ajustes Bézier actuales. La carretera no cambiará.'))return;
  try{
   scene._pushHistory();
   scene._aiBezierLine=createAiBezierFromTrackNodes(scene._nodes,32);
   scene._aiBezierSelected=0;
   scene._autosaveRecovery();scene._redrawEditor();scene._updatePanel();
   scene._flashMessage('Trayectoria IA creada · ajusta sus nodos sin alterar la pista');
  }catch(error){scene._flashMessage(error.message||'Error al generar trayectoria IA');}
 };
 scene._aiBezierInsert=()=>{
  const line=scene._aiBezierLine,index=scene._aiBezierSelected;
  if(!line||index<0)return scene._flashMessage('Selecciona primero un nodo Bézier');
  if(line.nodes.length>=AI_BEZIER_MAX_NODES)return scene._flashMessage('Máximo de 80 nodos');
  scene._pushHistory();
  const next=normalizeAiBezierLine(line);
  scene._aiBezierSelected=splitShapeEdge(next.nodes,index,true);
  scene._aiBezierLine=normalizeAiBezierLine(next);
  scene._autosaveRecovery();scene._redrawEditor();scene._updatePanel();
 };
 scene._aiBezierDelete=()=>{
  const line=scene._aiBezierLine,index=scene._aiBezierSelected;
  if(!line||index<0)return;
  if(line.nodes.length<=3)return scene._flashMessage('La trayectoria cerrada necesita al menos 3 nodos');
  scene._pushHistory();
  const next=normalizeAiBezierLine(line);
  next.nodes.splice(index,1);
  scene._aiBezierLine=normalizeAiBezierLine(next);
  scene._aiBezierSelected=Math.min(index,next.nodes.length-1);
  scene._autosaveRecovery();scene._redrawEditor();scene._updatePanel();
 };
 scene._aiBezierClear=()=>{
  if(!scene._aiBezierLine)return;
  if(!window.confirm('¿Borrar solo la trayectoria IA Bézier? La pista y las guías antiguas seguirán guardadas.'))return;
  scene._pushHistory();scene._aiBezierLine=null;scene._aiBezierSelected=-1;
  scene._autosaveRecovery();scene._redrawEditor();scene._updatePanel();
 };
 function pick(world){
  const line=scene._aiBezierLine;if(!line)return null;
  const size=22/Math.max(.05,scene._editCam?.zoom||1);
  const selected=line.nodes[scene._aiBezierSelected];
  if(selected)for(const part of ['handleIn','handleOut'])
   if(distance(selected[part],world)<=size)return{index:scene._aiBezierSelected,part};
  let best=null,minimum=size;
  line.nodes.forEach((node,index)=>{
   const d=distance(node,world);
   if(d<minimum){best={index,part:'anchor'};minimum=d;}
  });
  return best;
 }
 scene._aiBezierPointerDown=pointer=>{
  const down=scene.input.manager.pointers.filter(p=>p.isDown&&scene._isPointerInViewport(p));
  if(down.length!==1){
   scene._aiBezierGesture=null;scene._gestureWasMultiTouch=true;
   scene._tapCandidate=false;scene._panLast=null;return true;
  }
  const world=scene._screenToWorld(pointer.x,pointer.y),hit=pick(world);
  scene._aiBezierGesture={id:pointer.id,screen:{x:pointer.x,y:pointer.y},
   previous:{x:pointer.x,y:pointer.y},world,hit,
   canMove:hit?.index===scene._aiBezierSelected,moved:false,changed:false};
  if(hit)scene._aiBezierSelected=hit.index;
  scene._tapCandidate=false;scene._draggingPart=false;scene._panLast=null;
  scene._gestureWasMultiTouch=false;
  scene._redrawEditor();scene._updatePanel();return true;
 };
 scene._aiBezierPointerMove=down=>{
  const g=scene._aiBezierGesture;
  if(down.length>1){
   if(g?.changed)scene._autosaveRecovery();
   scene._aiBezierGesture=null;scene._gestureWasMultiTouch=true;return false;
  }
  if(!g||down.length!==1||down[0].id!==g.id)return false;
  const p=down[0],travel=distance({x:p.x,y:p.y},g.screen);
  if(travel>9)g.moved=true;
  if(g.hit&&g.canMove&&g.moved){
   const world=scene._screenToWorld(p.x,p.y);
   const node=scene._aiBezierLine?.nodes?.[g.hit.index];
   if(node){
    const part=g.hit.part,current=part==='anchor'?node:node[part];
    const target={x:current.x+world.x-g.world.x,y:current.y+world.y-g.world.y};
    const next=moveAiBezierPart(scene._aiBezierLine,g.hit.index,part,target);
    if(next){
     if(!g.changed){scene._pushHistory();g.changed=true;}
     scene._aiBezierLine=next;g.world=world;
     scene._redrawEditor();scene._updatePanel();
    }
   }
  }else if(!g.hit&&g.moved){
   scene._editCam.scrollX-=(p.x-g.previous.x)/scene._editCam.zoom;
   scene._editCam.scrollY-=(p.y-g.previous.y)/scene._editCam.zoom;
  }
  g.previous={x:p.x,y:p.y};return true;
 };
 scene._aiBezierPointerUp=(pointer,stillDown)=>{
  const g=scene._aiBezierGesture;
  if(!g||g.id!==pointer.id)return false;
  scene._aiBezierGesture=null;
  if(g.changed)scene._autosaveRecovery();
  if(!stillDown){
   scene._gestureWasMultiTouch=false;scene._tapCandidate=false;
   scene._panLast=null;scene._mapGesture=null;
  }
  scene._redrawEditor();scene._updatePanel();return true;
 };
 scene._aiBezierPointerCancel=()=>{
  if(scene._aiBezierGesture?.changed)scene._autosaveRecovery();
  scene._aiBezierGesture=null;
 };
 scene.events.once('shutdown',()=>{
  scene._aiBezierGfx?.destroy();scene._aiBezierGfx=null;
 });
}
