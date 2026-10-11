// Authoritative native-photo loading boundary for TrackStudio and installed tracks.
// An authored photograph replaces ground art; metadata/physics stay at image pixels 1:1.
import {isImageNativeTrackMeta} from './imageNativeTrackContract.js';
import {getLocalKartingPreview,LOCAL_KARTING_PREVIEW_KEY,makeKartingShapeMask,clearImageNativeTrackOverlays} from './localKartingPreview.js';
import {readCanvasImage,normalizeCanvasImageBlob} from '../studio/imageCanvasProject.js';
import {shapeIsValid} from '../studio/trackShapeGeometry.js';

const TILE_MAX=2048;
const dimension=n=>Number.isSafeInteger(Number(n))&&Number(n)>0&&Number(n)<=8192;

// Null means classic track; an invalid native track throws (never fallback).
export function describeImageNativeRace(trackKey,resolveTrack=()=>null){
  if(trackKey===LOCAL_KARTING_PREVIEW_KEY){
    const record=getLocalKartingPreview(trackKey);
    if(!record)throw Error('Falta la prueba local. Importa el .tdrtrack y pulsa PROBAR JUEGO');
    return {type:'local',trackKey,track:record.track,imageId:record.imageId,
      width:record.track.worldW,height:record.track.worldH,imageMeta:record.imageMeta};
  }
  const track=resolveTrack(trackKey);
  if(!track)return null;
  const meta=track.meta;
  if(meta?.renderMode!=='image-native')return null;
  if(!isImageNativeTrackMeta(track))throw Error('Versión de fotografía incompatible');
  const source=meta.imageNative;
  if(source?.availability!=='published')
    throw Error('La fotografía solo está en TrackStudio; aún no está instalada');
  const path=String(source.assetPath||'');
  if(!/^assets\/[a-z0-9_./-]+\.(?:png|webp|jpe?g)$/i.test(path)||path.includes('..'))
    throw Error('Ruta publicada de imagen inválida');
  return {type:'published',trackKey,track,width:Number(source.width),height:Number(source.height),path};
}

export function validateImageNativeRaceDescriptor(desc){
  const {track,width,height}=desc||{};
  if(!dimension(width)||!dimension(height)||width*height>32000000||
    Number(track?.worldW)!==Number(width)||Number(track?.worldH)!==Number(height))
    throw Error('Imagen y geometría deben tener exactamente la misma resolución 1:1');
  if(!shapeIsValid(track?.trackShape))throw Error('Faltan bordes Bézier válidos');
  if(track.closed===false||track.trackShape.closed!==true)
    throw Error('Rally A→B con máscara abierta pendiente de una fase posterior');
  if(!Array.isArray(track.centerline)||track.centerline.length<3)
    throw Error('Centerline incompleta');
  if(!track.finishLine?.a||!track.finishLine?.b)throw Error('Falta la meta');
  return desc;
}

async function decodePhoto(desc){
  let url=null;
  try{
    if(desc.type==='local'){
      const saved=await readCanvasImage(desc.imageId);
      if(!saved?.blob)throw Error('Imagen ausente en este navegador. Reimporta el .tdrtrack');
      const normalized=await normalizeCanvasImageBlob(saved.blob,desc.imageMeta);
      url=URL.createObjectURL(normalized.blob);
    }else{
      url=(import.meta.env?.BASE_URL||'/')+desc.path;
    }
    const img=new Image();
    img.decoding='async';
    await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('No se pudo decodificar la fotografía'));img.src=url;});
    if(img.naturalWidth!==desc.width||img.naturalHeight!==desc.height)
      throw Error('La fotografía no coincide con el tamaño del circuito');
    return img;
  }finally{
    if(desc.type==='local'&&url)URL.revokeObjectURL(url);
  }
}

export function applyImageNativeTrackPhysics(scene,desc){
  const {track}=validateImageNativeRaceDescriptor(desc);
  const mask=makeKartingShapeMask(track.trackShape,track.worldW,track.worldH);
  scene._tdrStudioMask=mask;
  scene._isOnTrack=(x,y)=>mask.isOnTrack(x,y);
  const original=scene._isInBand;
  scene._isInBand=(band,x,y)=>band===scene.track?.geom?.grass
    ?mask.isGrass(x,y)
    :typeof original==='function'&&original.call(scene,band,x,y);
}

function mountPhoto(scene,desc,img){
  const sprites=[],keys=[];
  const add=(key,source,x,y)=>{
    if(scene.textures.exists(key))scene.textures.remove(key);
    if(source instanceof HTMLCanvasElement)scene.textures.addCanvas(key,source);
    else scene.textures.addImage(key,source);
    keys.push(key);
    const sprite=scene.add.image(x,y,key).setOrigin(0,0).setDepth(9).setScrollFactor(1);
    scene.uiCam?.ignore?.(sprite);
    sprites.push(sprite);
  };
  try{
    if(desc.width<=TILE_MAX&&desc.height<=TILE_MAX){
      add('native:'+desc.trackKey+':0:0',img,0,0);
    }else{
      for(let y=0;y<desc.height;y+=TILE_MAX)for(let x=0;x<desc.width;x+=TILE_MAX){
        const w=Math.min(TILE_MAX,desc.width-x),h=Math.min(TILE_MAX,desc.height-y);
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d',{alpha:false});
        if(!ctx)throw Error('No se puede preparar la fotografía por bloques');
        ctx.drawImage(img,x,y,w,h,0,0,w,h);
        add('native:'+desc.trackKey+':'+x+':'+y,canvas,x,y);
      }
    }
    scene._destroyLegacyGroundRender?.();
    clearImageNativeTrackOverlays(scene);
    scene._trackBeautyTiles=sprites;
    scene._beautyLayerActive=true;
    scene._bakedAsphaltPilot=false;
    scene._bakedAsphaltDone=true;
    scene.events.once('shutdown',()=>{
      for(const s of sprites)try{s.destroy()}catch{}
      for(const key of keys)try{scene.textures.remove(key)}catch{}
    });
  }catch(error){
    for(const s of sprites)try{s.destroy()}catch{}
    for(const key of keys)try{scene.textures.remove(key)}catch{}
    throw error;
  }
}

function createGate(scene,key){
  if(typeof document==='undefined')return {close(){},error(e){console.error(e)}};
  document.getElementById('tdr-native-gate')?.remove();
  const root=document.createElement('div');root.id='tdr-native-gate';
  root.style.cssText='position:fixed;inset:0;z-index:9999999;display:flex;align-items:center;justify-content:center;background:#07101b;color:#fff;padding:20px;text-align:center;font:700 16px system-ui,-apple-system,sans-serif';
  const panel=document.createElement('div');panel.style.cssText='max-width:470px;line-height:1.6';
  const title=document.createElement('div');title.textContent='CARGANDO FOTOGRAFÍA';
  const detail=document.createElement('div');detail.style.cssText='margin-top:12px;font-size:13px;font-weight:400';
  const back=document.createElement('button');back.textContent='VOLVER SIN CAMBIAR EL CIRCUITO';
  back.style.cssText='display:none;margin:24px auto 0;padding:13px 18px;background:#19477a;color:#fff;border:1px solid #6bbcff;border-radius:8px';
  back.onclick=()=>scene.scene.start(key===LOCAL_KARTING_PREVIEW_KEY?'TrackStudioScene':'menu');
  panel.append(title,detail,back);root.append(panel);document.body.append(root);
  return {close(){root.remove()},error(e){
    title.textContent='NO SE PUEDE INICIAR ESTE CIRCUITO';
    detail.textContent=String(e?.message||e||'Falta la fotografía');
    back.style.display='block';
  }};
}

// Outer wrapper: no RaceScene.create, timers, graphics or game updates before
// the required image has been checked and decoded. Classics are unchanged.
export function installImageNativeRaceLoader(RaceSceneClass,resolveTrack=()=>null){
  const proto=RaceSceneClass?.prototype;
  if(!proto||proto.__tdrImageNativeLoaderInstalled)return;
  const create=proto.create,update=proto.update;
  proto.create=function nativeRaceCreate(data){
    let desc;
    try{desc=describeImageNativeRace(this.trackKey,resolveTrack)}
    catch(error){desc={error}}
    if(!desc)return create?.call(this,data);
    this._imageNativeLoading=true;
    const gate=createGate(this,this.trackKey);
    let alive=true;
    this.events.once('shutdown',()=>{alive=false;gate.close()});
    void Promise.resolve().then(async()=>{
      if(desc.error)throw desc.error;
      validateImageNativeRaceDescriptor(desc);
      const img=await decodePhoto(desc);
      if(!alive)return;
      this._imageNativePrepared=desc;
      create?.call(this,data);
      if(!alive)return;
      mountPhoto(this,desc,img);
      this._imageNativeLoading=false;
      gate.close();
    }).catch(error=>{
      if(!alive)return;
      console.error('[image-native] required photo failed; refusing fallback',error);
      this._imageNativeLoadError=error;
      gate.error(error);
    });
  };
  proto.update=function nativeRaceUpdate(...args){
    if(this._imageNativeLoading||this._imageNativeLoadError)return;
    return update?.apply(this,args);
  };
  proto.__tdrImageNativeLoaderInstalled=true;
}
