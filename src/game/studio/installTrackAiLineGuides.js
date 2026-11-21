// TrackStudio 2.0 AI apex authoring. Touch coordinates are in track-world pixels.
// This plugin changes no centerline, tarmac boundaries, physics or LIVE 4 AI.
import {AI_LINE_GUIDE_MAX,normalizeAiLineGuides,makeAiLineGuide,
 modifyAiLineGuide} from './trackAiLineGuides.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function render(scene){
 const gfx=scene._aiGuideGfx;
 if(!gfx)return;
 gfx.clear();
 const zoom=Math.max(.02,scene._editCam?.zoom||1);
 for(const p of scene._aiLineGuides||[]){
  const selected=scene._aiGuideSelectedId===p.id;
  const focused=scene._tool==='aiGuide';
  gfx.fillStyle(0xffc15b,focused?.12:.055);
  gfx.fillCircle(p.x,p.y,p.radiusPx);
  gfx.lineStyle(Math.max(1.2,1.4/zoom),selected?0xffffff:0xffb347,focused?.94:.55);
  gfx.strokeCircle(p.x,p.y,p.radiusPx);
  gfx.fillStyle(0x081524,.98);gfx.fillCircle(p.x,p.y,(selected?12:10)/zoom);
  gfx.fillStyle(selected?0xffffff:0xffc15b,1);
  gfx.fillCircle(p.x,p.y,(selected?7:5.5)/zoom);
 }
}
export function installTrackStudioAiGuides(scene){
 scene._aiLineGuides=[];scene._aiGuideSelectedId=null;scene._aiGuideDown=null;
 scene._aiGuideGfx=scene.add.graphics().setDepth(14);
 scene.cameras.main.ignore(scene._aiGuideGfx);
 const oldProject=scene._getProjectData.bind(scene);
 scene._getProjectData=()=>{
  const value=oldProject();
  return scene._aiLineGuides.length
   ?{...value,aiLineGuides:normalizeAiLineGuides(scene._aiLineGuides)}:value;
 };
 const oldExport=scene._exportToGameTrack.bind(scene);
 scene._exportToGameTrack=()=>{
  const value=oldExport();
  if(!value)return value;
  // The imported metadata may contain an outdated copy. Remove it when the
  // last guide is deleted; maintain byte-compatible exports for guide-free tracks.
  delete value.aiLineGuides;
  if(scene._aiLineGuides.length)value.aiLineGuides=normalizeAiLineGuides(scene._aiLineGuides);
  return value;
 };
 const oldApply=scene._applyProjectData.bind(scene);
 scene._applyProjectData=data=>{
  oldApply(data);
  scene._aiLineGuides=normalizeAiLineGuides(data?.aiLineGuides).points;
  scene._aiGuideSelectedId=null;scene._aiGuideDown=null;
  scene._redrawEditor();scene._updatePanel();
 };
 const oldImport=scene._importProjectOrTrack.bind(scene);
 scene._importProjectOrTrack=data=>{
  const hasEditor=Boolean(data?.editor||Array.isArray(data?.nodes));
  const value=oldImport(data);
  if(!hasEditor){
   scene._aiLineGuides=normalizeAiLineGuides(data?.aiLineGuides).points;
   scene._aiGuideSelectedId=null;scene._aiGuideDown=null;
   scene._redrawEditor();scene._updatePanel();
  }
  return value;
 };
 const oldNew=scene._newProject.bind(scene);
 scene._newProject=(...args)=>{
  const value=oldNew(...args);
  scene._aiLineGuides=[];scene._aiGuideSelectedId=null;scene._aiGuideDown=null;
  scene._redrawEditor();scene._updatePanel();
  return value;
 };
 const oldRedraw=scene._redrawEditor.bind(scene);
 scene._redrawEditor=(...args)=>{
  const value=oldRedraw(...args);
  render(scene);
  return value;
 };
 const selected=()=>scene._aiLineGuides.find(p=>p.id===scene._aiGuideSelectedId)||null;
 scene._aiGuideSelected=selected;
 scene._aiGuideToggle=()=>{
  const active=scene._tool==='aiGuide';
  scene._cancelPenGesture?.();
  scene._tool=active?'edit':'aiGuide';
  scene._shapeEditing=false;scene._shapeSelected=null;
  scene._selectedNode=-1;scene._selectedPart=null;scene._selectedPiano=-1;
  scene._aiGuideDown=null;
  scene._updateToolButtons();scene._redrawEditor();scene._updatePanel();
  scene._flashMessage(active?'Guías IA cerradas; asfalto intacto':
   'GUÍAS IA · toca para crear; selecciona una y luego arrástrala');
 };
 scene._aiGuideAdjustSelected=(field,delta)=>{
  const p=selected();
  if(!p||!['strength','radiusPx'].includes(field))return;
  scene._pushHistory();
  const next=field==='strength'
   ?Math.round(clamp(p.strength+delta,.05,1)*100)/100
   :Math.round(clamp(p.radiusPx+delta,8,300));
  scene._aiLineGuides=modifyAiLineGuide(scene._aiLineGuides,p.id,{[field]:next}).points;
  scene._redrawEditor();scene._updatePanel();scene._autosaveRecovery();
 };
 scene._aiGuideDeleteSelected=()=>{
  const p=selected();if(!p)return;
  scene._pushHistory();
  scene._aiLineGuides=scene._aiLineGuides.filter(g=>g.id!==p.id);
  scene._aiGuideSelectedId=null;
  scene._redrawEditor();scene._updatePanel();scene._autosaveRecovery();
  scene._flashMessage('Guía IA eliminada; el circuito no cambia');
 };
 const pick=world=>{
  const zoom=Math.max(.02,scene._editCam?.zoom||1);
  let best=null,bestDistance=Infinity;
  for(const p of scene._aiLineGuides){
   const d=Math.hypot(p.x-world.x,p.y-world.y);
   if(d<Math.max(22/zoom,p.radiusPx*.24)&&d<bestDistance){
    best=p;bestDistance=d;
   }
  }
  return best;
 };
 scene._aiGuidePointerDown=pointer=>{
  const active=scene.input.manager.pointers.filter(p=>p.isDown&&scene._isPointerInViewport(p));
  if(active.length!==1){
   // Consume the second pointer DOWN so it cannot select or move an
   // underlying centerline node; pointermove still runs native pinch-to-zoom.
   scene._aiGuideDown=null;scene._gestureWasMultiTouch=true;
   scene._tapCandidate=false;scene._draggingPart=false;scene._panLast=null;
   return true;
  }
  const world=scene._screenToWorld(pointer.x,pointer.y);
  const hit=pick(world);
  scene._aiGuideDown={
   id:pointer.id,start:{x:pointer.x,y:pointer.y},
   last:{x:pointer.x,y:pointer.y},world,
   hitId:hit?.id||null,moveSelected:hit?.id===scene._aiGuideSelectedId,
   moved:false,changed:false
  };
  if(hit)scene._aiGuideSelectedId=hit.id;
  scene._tapCandidate=false;scene._draggingPart=false;
  scene._panLast=null;scene._gestureWasMultiTouch=false;
  scene._redrawEditor();scene._updatePanel();
  return true;
 };
 scene._aiGuidePointerMove=down=>{
  const g=scene._aiGuideDown;
  if(down.length>1){
   if(g?.changed)scene._autosaveRecovery();
   scene._aiGuideDown=null;scene._gestureWasMultiTouch=true;
   return false;
  }
  if(!g||down.length!==1||down[0].id!==g.id)return false;
  const p=down[0],travel=Math.hypot(p.x-g.start.x,p.y-g.start.y);
  if(travel>9)g.moved=true;
  if(g.hitId&&g.moveSelected&&g.moved){
   const point=selected();
   if(point){
    if(!g.changed){scene._pushHistory();g.changed=true;}
    const world=scene._screenToWorld(p.x,p.y);
    scene._aiLineGuides=modifyAiLineGuide(scene._aiLineGuides,point.id,{
     x:clamp(point.x+world.x-g.world.x,0,Math.min(8192,scene._editorWorldW)),
     y:clamp(point.y+world.y-g.world.y,0,Math.min(8192,scene._editorWorldH))
    }).points;
    g.world=world;
    scene._redrawEditor();scene._updatePanel();
   }
  }else if(!g.hitId&&g.moved){
   scene._editCam.scrollX-=(p.x-g.last.x)/scene._editCam.zoom;
   scene._editCam.scrollY-=(p.y-g.last.y)/scene._editCam.zoom;
  }
  g.last={x:p.x,y:p.y};
  return true;
 };
 scene._aiGuidePointerUp=(pointer,stillDown)=>{
  const g=scene._aiGuideDown;
  if(!g||g.id!==pointer.id)return false;
  scene._aiGuideDown=null;
  if(!scene._gestureWasMultiTouch&&!g.hitId&&!g.moved&&
     scene._isPointerInViewport(pointer)){
   if(scene._nodes.length<2){
    scene._flashMessage('Primero dibuja el eje central de la pista');
   }else{
    try{
     const p=scene._screenToWorld(pointer.x,pointer.y);
     if(p.x>scene._editorWorldW||p.y>scene._editorWorldH)
      throw Error('Guía fuera de la imagen del circuito');
     const newPoint=makeAiLineGuide(scene._aiLineGuides,p.x,p.y,scene._trackWidth);
     scene._pushHistory();
     scene._aiLineGuides.push(newPoint);
     scene._aiGuideSelectedId=newPoint.id;
     scene._autosaveRecovery();
     scene._flashMessage('Guía IA creada · ajusta FUERZA y RADIO a la derecha');
    }catch(error){scene._flashMessage(error.message||'Guía no válida');}
   }
  }else if(g.changed)scene._autosaveRecovery();
  scene._redrawEditor();scene._updatePanel();
  if(stillDown===0){scene._gestureWasMultiTouch=false;scene._tapCandidate=false;scene._panLast=null;scene._mapGesture=null;}
  return true;
 };
 scene._aiGuidePointerCancel=()=>{
  if(scene._aiGuideDown?.changed)scene._autosaveRecovery();
  scene._aiGuideDown=null;
 };
 scene.events.once('shutdown',()=>{
  scene._aiGuideGfx?.destroy();
  scene._aiGuideGfx=null;
 });
 return{max:AI_LINE_GUIDE_MAX};
}
