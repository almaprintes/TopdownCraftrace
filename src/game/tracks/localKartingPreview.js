// Karting Tenerife Image Mode, PRIVATE DEV PREVIEW (this browser only).
// Never replace the public track or send its new geometry to public leaderboards.
import { readCanvasImage, normalizeCanvasImageBlob } from '../studio/imageCanvasProject.js';
import { shapeIsValid, sampleShapeEdge } from '../studio/trackShapeGeometry.js';
import { spawnUpstreamOfFinish } from './imageNativeDriving.js';

export const LOCAL_KARTING_PREVIEW_KEY='karting-tenerife-studio';
const STORAGE_KEY='tdr:trackstudio:karting-tenerife-preview-v1';
const bounded=(n,max)=>Number.isFinite(Number(n))&&Number(n)>0&&Number(n)<=max;
const jsonCopy=value=>JSON.parse(JSON.stringify(value));
/**
 * DEV 1.2.111–1.2.112 temporarily stored a THREE-times larger runtime world.
 * Roll those ephemeral previews back to the original image pixel coordinates
 * in memory, preserving the user's saved .tdrtrack and IndexedDB photograph.
 * The next ▶ PROBAR JUEGO save writes native (v1) coordinates again.
 */
function restoreNativePixels(record){
  if(record?.version!==2)return record;
  const track=record.track,scale=Number(record.worldScale||track?.imageWorldScale);
  const master=record.imageMeta;
  if(scale!==3||!master||track?.worldW!==master.width*scale||
     track?.worldH!==master.height*scale)return null;
  const t=jsonCopy(track),div=v=>Number.isFinite(v)?v/scale:v;
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
    ? {...p,x:div(p.x),y:div(p.y)}:p;
  const gate=g=>g?{...g,a:point(g.a),b:point(g.b)}:g;
  t.worldW=master.width;t.worldH=master.height;
  for(const key of ['trackWidth','grassMargin','sampleStepPx','cellSize','shoulderPx']){
    if(Number.isFinite(t[key]))t[key]=div(t[key]);
  }
  t.centerline=t.centerline.map(p=>Array.isArray(p)
    ?p.map((v,i)=>i<=2&&Number.isFinite(v)?div(v):v)
    :{...point(p),...(Number.isFinite(p.width)?{width:div(p.width)}:{})});
  for(const side of ['leftEdge','rightEdge']){
    t.trackShape[side]=t.trackShape[side].map(p=>({
      ...point(p),handleIn:point(p.handleIn),handleOut:point(p.handleOut)
    }));
  }
  t.start=point(t.start);
  if(t.startLine)t.startLine=gate(t.startLine);
  if(t.finishLine)t.finishLine=gate(t.finishLine);
  if(t.finish)t.finish=gate(t.finish);
  if(Array.isArray(t.checkpoints))t.checkpoints=t.checkpoints.map(gate);
  if(t.grid){
    for(const key of ['rowSpacing','colOffset','backOffset'])
      if(Number.isFinite(t.grid[key]))t.grid[key]=div(t.grid[key]);
    if(Array.isArray(t.grid.slots))t.grid.slots=t.grid.slots.map(point);
  }
  delete t.imageWorldScale;
  if(t.meta)delete t.meta.imageWorldScale;
  return {version:1,imageId:record.imageId,imageMeta:jsonCopy(master),track:t};
}


export function getLocalKartingPreview(trackKey=LOCAL_KARTING_PREVIEW_KEY){
  if(trackKey!==LOCAL_KARTING_PREVIEW_KEY)return null;
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return null;
    const stored=JSON.parse(raw);
    const p=restoreNativePixels(stored),track=p?.track;
    if(!track||!Array.isArray(track.centerline)||track.centerline.length<20||
       !shapeIsValid(track.trackShape)||!bounded(track.worldW,8192)||
       !bounded(track.worldH,8192)||!p?.imageId||
       track.worldW!==p.imageMeta?.width||track.worldH!==p.imageMeta?.height)return null;
    return p;
  }catch{return null;}
}

export function makeKartingPreviewRecord(editor,gameTrack){
  if(!editor?.imageCanvas?.imageId)throw Error('El proyecto no tiene imagen maestra');
  if(!shapeIsValid(editor.trackShape) || !shapeIsValid(gameTrack?.trackShape))
    throw Error('Primero convierte la centerline en pista editable');
  if(!editor.isClosed || !gameTrack.closed)throw Error('Este modo es para Karting Tenerife cerrado');
  if(!bounded(gameTrack.worldW,8192)||!bounded(gameTrack.worldH,8192)||
     gameTrack.worldW!==editor.imageCanvas.width || gameTrack.worldH!==editor.imageCanvas.height)
    throw Error('Las dimensiones de pista e imagen no coinciden');
  if(!Array.isArray(gameTrack.centerline)||gameTrack.centerline.length<20)
    throw Error('La centerline no está completa');
  if(!gameTrack.finishLine?.a||!gameTrack.finishLine?.b)
    throw Error('Configura la meta antes de probar el circuito');
  // The editor's first centerline node is not necessarily near the finish
  // (this Karting project starts ~209px before the gate). Keep the original
  // centerline untouched and calculate a temporary race spawn ~65px upstream.
  const first=gameTrack.centerline[0],next=gameTrack.centerline[1],
        theta=Math.atan2(next.y-first.y,next.x-first.x);
  if(!Number.isFinite(theta))throw Error('El punto inicial de la pista es inválido');
  const beforeFinish=spawnUpstreamOfFinish(gameTrack.centerline,gameTrack.finishLine,65);
  const start=beforeFinish||{x:first.x,y:first.y,r:theta};
  const imageId=editor.imageCanvas.imageId;
  const track={
    ...jsonCopy(gameTrack),
    id:LOCAL_KARTING_PREVIEW_KEY,
    key:LOCAL_KARTING_PREVIEW_KEY,
    name:'KARTING TENERIFE · TRACKSTUDIO DEV',
    category:'Karting / DEV local',
    carScale:.65,
    start:{x:start.x,y:start.y,r:start.r},
    closed:true,raceType:'circuit',raceDirection:'forward',
    grid:null,
    checkpointMode:'authored',
    meta:{...(gameTrack.meta||{}),localPreview:true,carScale:.65,source:'trackstudio-image-native'}
  };
  return {version:1,imageId,imageMeta:jsonCopy(editor.imageCanvas),track};
}

export async function installKartingPreview(scene){
  const editor=scene._getProjectData(),meta=scene._exportToGameTrack();
  const record=makeKartingPreviewRecord(editor,meta);
  const stored=await readCanvasImage(record.imageId);
  if(!stored?.blob)throw Error('Imagen no encontrada: vuelve a importar el .tdrtrack');
  const img=await normalizeCanvasImageBlob(stored.blob,record.imageMeta);
  if(img.nested) {
    const {saveCanvasImage}=await import('../studio/imageCanvasProject.js');
    await saveCanvasImage(record.imageId,img.blob,record.imageMeta);
  }
  // Last mutating step. Never overwrite a working local preview on failure.
  localStorage.setItem(STORAGE_KEY,JSON.stringify(record));
  return record;
}

function toRowSpans(edge,worldH){
  const pts=sampleShapeEdge(edge,true,14);
  const rowCount=Math.ceil(worldH)+1;
  const buckets=Array.from({length:rowCount},()=>[]);
  for(let i=0;i<pts.length;i++){
    const p=pts[i],q=pts[(i+1)%pts.length];
    if(!Number.isFinite(p.x)||!Number.isFinite(q.x)||!Number.isFinite(p.y)||!Number.isFinite(q.y)||
       Math.abs(p.y-q.y)<1e-6)continue;
    const lo=Math.max(0,Math.ceil(Math.min(p.y,q.y)-.5)),
          hi=Math.min(rowCount-1,Math.ceil(Math.max(p.y,q.y)-.5)-1);
    for(let y=lo;y<=hi;y++){
      const at=y+.5;
      if(at>=Math.min(p.y,q.y)&&at<Math.max(p.y,q.y))
        buckets[y].push(p.x+(at-p.y)*(q.x-p.x)/(q.y-p.y));
    }
  }
  buckets.forEach(b=>b.sort((a,b)=>a-b));
  return buckets;
}
function inside(row,x){
  let lo=0,hi=row?.length||0;
  while(lo<hi){const mid=(lo+hi)>>1;if(row[mid]<x)lo=mid+1;else hi=mid;}
  return !!(lo%2);
}
export function makeKartingShapeMask(shape,worldW,worldH){
  if(!shapeIsValid(shape)||!shape.closed)throw Error('Se requiere forma cerrada válida');
  const a=toRowSpans(shape.leftEdge,worldH),b=toRowSpans(shape.rightEdge,worldH);
  return {
    isOnTrack(x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>=worldW||y<0||y>=worldH)return false;
      const row=Math.max(0,Math.min(a.length-1,Math.floor(y)));
      return inside(a[row],x)!==inside(b[row],x);
    },
    isGrass(x,y){
      return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&y>=0&&x<worldW&&y<worldH&&
        !this.isOnTrack(x,y);
    }
  };
}

export function applyKartingPreviewPhysics(scene){
  const saved=getLocalKartingPreview(scene.trackKey);
  if(!saved)return false;
  const mask=makeKartingShapeMask(saved.track.trackShape,saved.track.worldW,saved.track.worldH);
  scene._tdrStudioMask=mask;
  scene._isOnTrack=(x,y)=>mask.isOnTrack(x,y);
  const original=scene._isInBand;
  scene._isInBand=(band,x,y)=>band===scene.track?.geom?.grass
    ?mask.isGrass(x,y)
    :typeof original==='function'&&original.call(scene,band,x,y);
  return true;
}
// The master image is the entire visual environment. The only retained
// race objects are logical gates, physics and the player's car/HUD.
export function clearImageNativeTrackOverlays(scene) {
  // Defensive cleanup: old Karting-specific layers could already have
  // placed sprites during a prior async load. The user PNG is the full scene.
  for (const layer of [
    '_ktPaddock', '_ktStructures', '_ktDenseVegetation',
    '_circuitEnvironment', '_authoredEnvironmentObjects'
  ]) {
    const objects=scene[layer];
    if (Array.isArray(objects)) for (const obj of objects) {
      try { obj?.destroy?.(); } catch {}
    }
    scene[layer]=[];
  }
  scene._authoredSurfaceZones=[];
  // No procedural track graphics may survive above the baked photo.
  // Their geometry is used by race timing/physics, not by these GameObjects.
  // The authored image already includes kerbs, finish paint and road edges.
  for (const name of [
    '_shoulderLeft','_shoulderRight','_curbOuter','_curbInner',
    '_borderLeft','_borderRight','_iosStageAsphalt',
    // Premium longitudinal paint is a separate pass, unrelated to RaceScene's
    // legacy border/piano objects. Without these, kerbs stay doubled on iPhone.
    '_longitudinalAsphaltWear','_premiumShoulder','_edgeProbe','_cornerCurbs',
    'finishGfx','cpGfx','finishLineDebug','startLineDebug','gridDebug',
    'finishIntegratedGfx','cp1IntegratedGfx','cp2IntegratedGfx'
  ]) {
    try { scene[name]?.destroy?.(); } catch {}
    scene[name]=null;
  }
  // Sector UI remains active; its older paint-flash hook becomes a no-op.
  scene._flashSectorMarker=()=>{};
}

