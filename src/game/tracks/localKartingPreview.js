// Karting Tenerife Image Mode, PRIVATE DEV PREVIEW (this browser only).
// Never replace the public track or send its new geometry to public leaderboards.
import { readCanvasImage, normalizeCanvasImageBlob } from '../studio/imageCanvasProject.js';
import { shapeIsValid, sampleShapeEdge } from '../studio/trackShapeGeometry.js';

export const LOCAL_KARTING_PREVIEW_KEY='karting-tenerife-studio';
const STORAGE_KEY='tdr:trackstudio:karting-tenerife-preview-v1';
const bounded=(n,max)=>Number.isFinite(Number(n))&&Number(n)>0&&Number(n)<=max;
const jsonCopy=value=>JSON.parse(JSON.stringify(value));

export function getLocalKartingPreview(trackKey=LOCAL_KARTING_PREVIEW_KEY){
  if(trackKey!==LOCAL_KARTING_PREVIEW_KEY)return null;
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return null;
    const p=JSON.parse(raw),track=p?.track;
    if(!track||!Array.isArray(track.centerline)||track.centerline.length<20||
       !shapeIsValid(track.trackShape)||!bounded(track.worldW,8192)||
       !bounded(track.worldH,8192)||!p?.imageId)return null;
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
  const start=gameTrack.centerline[0],next=gameTrack.centerline[1],
        theta=Math.atan2(next.y-start.y,next.x-start.x);
  if(!Number.isFinite(theta))throw Error('El punto inicial de la pista es inválido');
  const imageId=editor.imageCanvas.imageId;
  const track={
    ...jsonCopy(gameTrack),
    id:LOCAL_KARTING_PREVIEW_KEY,
    key:LOCAL_KARTING_PREVIEW_KEY,
    name:'KARTING TENERIFE · TRACKSTUDIO DEV',
    category:'Karting / DEV local',
    carScale:.65,
    start:{x:start.x,y:start.y,r:theta},
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
export async function activateKartingPreviewImage(scene){
  const saved=getLocalKartingPreview(scene.trackKey);
  if(!saved)return false;
  const row=await readCanvasImage(saved.imageId);
  if(!row?.blob)throw Error('La imagen no está en este navegador: impórtala otra vez');
  const normalized=await normalizeCanvasImageBlob(row.blob,saved.imageMeta);
  const url=URL.createObjectURL(normalized.blob),img=new Image();
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se pudo abrir imagen Karting'));img.src=url;});
    if(img.naturalWidth!==saved.track.worldW||img.naturalHeight!==saved.track.worldH)
      throw Error('Desajuste de píxeles y geometría del circuito');
    if(!scene.sys?.isActive?.())return false;
    const key='tdr-karting-studio-image';
    if(scene.textures.exists(key))scene.textures.remove(key);
    scene.textures.addImage(key,img);
    const sprite=scene.add.image(0,0,key).setOrigin(0,0).setDepth(9).setScrollFactor(1);
    scene.uiCam?.ignore?.(sprite);
    // Only destroy legacy graphics after the new texture has been decoded.
    scene._destroyLegacyGroundRender?.();
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
    for(const name of ['_shoulderLeft','_shoulderRight','_curbOuter','_curbInner',
                        '_borderLeft','_borderRight','_iosStageAsphalt']){
      try{scene[name]?.destroy?.()}catch{}
      scene[name]=null;
    }
    scene._trackBeautyTiles=[sprite];
    scene._beautyLayerActive=true;
    scene._bakedAsphaltPilot=false;
    scene._bakedAsphaltDone=true;
    scene.events.once('shutdown',()=>{
      try{sprite.destroy()}catch{}
      try{scene.textures.remove(key)}catch{}
    });
    return true;
  }finally{img.onload=null;img.onerror=null;img.src='';URL.revokeObjectURL(url);}
}
