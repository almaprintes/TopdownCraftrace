// Authoritative native-photo loading boundary for TrackStudio and installed tracks.
// An authored photograph replaces ground art; the published Canarias world
// may enlarge geometry and tiled sprites together without upscaling source files.
import {isImageNativeTrackMeta} from './imageNativeTrackContract.js';
import {getLocalKartingPreview,LOCAL_KARTING_PREVIEW_KEY,makeKartingShapeMask,clearImageNativeTrackOverlays} from './localKartingPreview.js';
import {readCanvasImage,saveCanvasImage,normalizeCanvasImageBlob,looksLikeImageProject,unpackImageProject} from '../studio/imageCanvasProject.js';
import {shapeIsValid} from '../studio/trackShapeGeometry.js';
import {makeOpenStagePhotoMask} from './openStagePhotoMask.js';
import {KARTING_CANARIAS_WORLD_SCALE} from './kartingCanariasWorldScale.js';
import {useCompactIosPhotoTiles,compactIosPhotoTilePath,expectedCompactTileSize,photoTileWorldScale} from '../performance/iosPhotoTileBudget.js';

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
  return {type:'published',trackKey,track,width:Number(source.width),height:Number(source.height),path,tiles:Array.isArray(source.tiles)?source.tiles:null,worldScale:Number(source.worldScale)||1};
}

export function validateImageNativeRaceDescriptor(desc){
  const {track,width,height}=desc||{};
  const scale=Number(desc?.worldScale??1);
  // This published circuit intentionally uses a larger *world*, not larger
  // textures: the four source WebP tiles stay at their original resolutions.
  const scaledCanarias=desc?.type==='published'&&desc.trackKey==='karting-canarias'&&
    Array.isArray(desc.tiles)&&desc.tiles.length===4&&
    scale===KARTING_CANARIAS_WORLD_SCALE;
  if(!dimension(width)||!dimension(height)||width*height>32000000||
    !(scale===1||scaledCanarias)||
    Number(track?.worldW)!==Number(width)*scale||
    Number(track?.worldH)!==Number(height)*scale||
    !dimension(Number(track?.worldW))||!dimension(Number(track?.worldH)))
    throw Error('La escala del mundo y la fotografía no coinciden: se requiere 1:1 salvo la ampliación publicada de Karting Canarias');
  if(!shapeIsValid(track?.trackShape))throw Error('Faltan bordes Bézier válidos');
  // Accept both topology types, but never turn an open rally into a ring:
  // its road mask is assembled from adjacent Bézier strips only.
  if((track.closed===false)!==(track.trackShape.closed===false))
    throw Error('La topología de carretera no coincide con la modalidad A→B/circuito');
  if(!Array.isArray(track.centerline)||track.centerline.length<3)
    throw Error('Centerline incompleta');
  if(!track.finishLine?.a||!track.finishLine?.b)throw Error('Falta la meta');
  return desc;
}

async function decodePhoto(desc){
  // Published high-resolution photo tiles avoid decoding or uploading one
  // 3072×4608 texture on mobile. Legacy/local photos retain their own path.
  if(desc.type==='published'&&Array.isArray(desc.tiles)&&desc.tiles.length){
    const result=[];
    for(const tile of desc.tiles){
      const path=String(tile?.assetPath||'');
      const x=Number(tile?.x),y=Number(tile?.y),w=Number(tile?.width),h=Number(tile?.height);
      if(!/^assets\/[a-z0-9_./-]+\.webp$/i.test(path)||path.includes('..')||
         ![x,y,w,h].every(Number.isSafeInteger)||x<0||y<0||w<1||h<1||
         w>2048||h>2048||x+w>desc.width||y+h>desc.height)
        throw Error('Bloque de fotografía Santa Cruz inválido');
      const img=new Image();
      img.decoding='async';
      const root=import.meta.env?.BASE_URL||'/';
      const compact=useCompactIosPhotoTiles(navigator?.userAgent||'');
      const compactPath=compact?compactIosPhotoTilePath(path):null;
      // If a tile was not generated in a local preview, use the exact
      // original file rather than failing the race or downscaling canvas
      // dynamically. Never decode both variants at the same time.
      let fallback=!compactPath;
      let timer;
      try{
        await Promise.race([
          new Promise((ok,fail)=>{
            img.onload=ok;
            img.onerror=()=>{
              if(!fallback){
                fallback=true;
                img.src=root+path;
              }else fail(Error('No se pudo abrir un bloque de la fotografía'));
            };
            img.src=root+(compactPath||path);
          }),
          new Promise((_,fail)=>{timer=setTimeout(()=>fail(Error('Tiempo agotado cargando el circuito')),25000);})
        ]);
      }finally{clearTimeout(timer);img.onload=null;img.onerror=null;}
      const expectedCompact=expectedCompactTileSize(w,h);
      const fullSize=img.naturalWidth===w&&img.naturalHeight===h;
      const compactSize=compact&&!fallback&&
        img.naturalWidth===expectedCompact[0]&&img.naturalHeight===expectedCompact[1];
      if(!fullSize&&!compactSize)throw Error('Bloque de fotografía desalineado');
      result.push({image:img,x,y,tileWorldScale:photoTileWorldScale(w,img.naturalWidth)});
    }
    return result;
  }
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
    // An interrupted iOS image decode must never leave the race indefinitely
    // waiting on the resource loader at 60 percent.
    let timeoutId;
    try {
      await Promise.race([
        new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('No se pudo decodificar la fotografía'));img.src=url;}),
        new Promise((_,fail)=>{timeoutId=setTimeout(()=>fail(Error('La fotografía tarda demasiado en cargarse. Vuelve a importarla o usa una WebP más ligera')),25000);})
      ]);
    } finally { clearTimeout(timeoutId); }
    if(img.naturalWidth!==desc.width||img.naturalHeight!==desc.height)
      throw Error('La fotografía no coincide con el tamaño del circuito');
    return img;
  }finally{
    if(desc.type==='local'&&url)URL.revokeObjectURL(url);
  }
}

// Repair only the IMAGE stored under the same imageId. Never import the
// selected package's geometry into the running TrackStudio project.
export async function repairImageNativePhoto(desc,file){
  if(desc?.type!=='local'||!file?.size)throw Error('Selecciona la fotografía original o su .tdrtrack');
  const image=(await looksLikeImageProject(file))?(await unpackImageProject(file)).image:file;
  const normalized=await normalizeCanvasImageBlob(image,desc.imageMeta);
  const blob=normalized.blob;
  const url=URL.createObjectURL(blob),img=new Image();
  try{
    await new Promise((resolve,reject)=>{
      img.onload=resolve;
      img.onerror=()=>reject(Error('No se puede abrir la imagen seleccionada'));
      img.src=url;
    });
    if(img.naturalWidth!==desc.width||img.naturalHeight!==desc.height)
      throw Error('La imagen no coincide con el trazado: selecciona la fotografía original de este circuito');
  }finally{
    URL.revokeObjectURL(url);
    img.onload=null;
    img.onerror=null;
  }
  // Writing is the LAST operation, after validating format, size and pixels.
  // Browser keeps geometry, gates, selected car and .tdrtrack unchanged.
  await saveCanvasImage(desc.imageId,blob,desc.imageMeta);
  const restored=await readCanvasImage(desc.imageId);
  if(!restored?.blob||restored.blob.size!==blob.size)
    throw Error('No se pudo verificar la fotografía recuperada en este dispositivo');
  return true;
}

export function applyImageNativeTrackPhysics(scene,desc){
  const {track}=validateImageNativeRaceDescriptor(desc);
  const mask=track.closed===false
    ?makeOpenStagePhotoMask(track.trackShape,track.worldW,track.worldH)
    :makeKartingShapeMask(track.trackShape,track.worldW,track.worldH);
  scene._tdrStudioMask=mask;
  scene._isOnTrack=(x,y)=>mask.isOnTrack(x,y);
  const original=scene._isInBand;
  scene._isInBand=(band,x,y)=>band===scene.track?.geom?.grass
    ?mask.isGrass(x,y)
    :typeof original==='function'&&original.call(scene,band,x,y);
}

function mountPhoto(scene,desc,img){
  const sprites=[],keys=[];
  const worldScale=desc.type==='published'?(Number(desc.worldScale)||1):1;
  const add=(key,source,x,y,tileScale=1)=>{
    if(scene.textures.exists(key))scene.textures.remove(key);
    if(source instanceof HTMLCanvasElement)scene.textures.addCanvas(key,source);
    else scene.textures.addImage(key,source);
    keys.push(key);
    const sprite=scene.add.image(x*worldScale,y*worldScale,key).setOrigin(0,0).setDepth(9).setScrollFactor(1);
    const displayScale=worldScale*tileScale;
    if(displayScale!==1)sprite.setScale(displayScale);
    scene.uiCam?.ignore?.(sprite);
    sprites.push(sprite);
  };
  try{
    if(Array.isArray(img)){
      for(const tile of img)add('native:'+desc.trackKey+':'+tile.x+':'+tile.y,
        tile.image,tile.x,tile.y,tile.tileWorldScale||1);
    }else if(desc.width<=TILE_MAX&&desc.height<=TILE_MAX){
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

function createGate(scene,key,desc){
  if(typeof document==='undefined')return {close(){},error(e){console.error(e)}};
  document.getElementById('tdr-native-gate')?.remove();
  const root=document.createElement('div');root.id='tdr-native-gate';
  root.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#07101b;color:#fff;padding:20px;text-align:center;font:700 16px system-ui,-apple-system,sans-serif';
  const panel=document.createElement('div');panel.style.cssText='max-width:470px;line-height:1.6';
  const title=document.createElement('div');title.textContent='CARGANDO FOTOGRAFÍA';
  const detail=document.createElement('div');detail.style.cssText='margin-top:12px;font-size:13px;font-weight:400';
  const back=document.createElement('button');back.textContent='VOLVER SIN CAMBIAR EL CIRCUITO';
  back.style.cssText='display:none;margin:24px auto 0;padding:13px 18px;background:#19477a;color:#fff;border:1px solid #6bbcff;border-radius:8px';
  back.onclick=()=>scene.scene.start('menu');
  const repair=document.createElement('button');
  repair.type='button';repair.textContent='RECUPERAR FOTOGRAFÍA';
  repair.style.cssText='display:none;margin:22px auto 0;padding:13px 18px;background:#175c4d;color:#fff;border:1px solid #61e8bd;border-radius:8px';
  const picker=document.createElement('input');
  picker.type='file';picker.accept='.tdrtrack,image/webp,image/png,image/jpeg';
  picker.style.cssText='position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
  repair.onclick=()=>picker.click();
  picker.onchange=async()=>{
    const file=picker.files?.[0];picker.value='';
    if(!file)return;
    repair.disabled=true;
    detail.textContent='Verificando la fotografía original. El trazado no se modificará…';
    try{
      await repairImageNativePhoto(desc,file);
      root.remove();
      scene.scene.restart({trackKey:key});
    }catch(error){
      console.error('[image-native] Photo repair failed',error);
      repair.disabled=false;
      detail.textContent=String(error?.message||error);
    }
  };
  panel.append(title,detail,repair,back,picker);root.append(panel);document.body.append(root);
  return {close(){root.remove()},error(e){
    title.textContent='NO SE PUEDE INICIAR ESTE CIRCUITO';
    detail.textContent=String(e?.message||e||'Falta la fotografía');
    if(desc?.type==='local'){
      detail.textContent+=' Selecciona el WebP/PNG original o el .tdrtrack para recuperar SOLO la foto, sin borrar el trazado.';
      repair.style.display='block';
    }
    back.style.display='block';
  }};
}

// Outer wrapper: no RaceScene.create, timers, graphics or game updates before
// the required image has been checked and decoded. Classics are unchanged.
export function installImageNativeRaceLoader(RaceSceneClass,resolveTrack=()=>null){
  const proto=RaceSceneClass?.prototype;
  if(!proto||proto.__tdrImageNativeLoaderInstalled)return;
  const init=proto.init,create=proto.create,update=proto.update;
  // Every Phaser scene entry must reset photo-only state; instances are reused.
  proto.init=function nativeRaceInit(...args){
    this._imageNativePrepared=null;
    this._imageNativeLoading=false;
    this._imageNativeLoadError=null;
    return init?.apply(this,args);
  };
  proto.create=function nativeRaceCreate(data){
    let desc;
    try{desc=describeImageNativeRace(this.trackKey,resolveTrack)}
    catch(error){desc={error}}
    if(!desc)return create?.call(this,data);
    this._imageNativeLoading=true;
    const gate=createGate(this,this.trackKey,desc);
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
      // Remove the legacy loading progress overlay, which otherwise masks
      // the actual photo failure at 60 percent.
      try { document.getElementById('tdr-race-loading-experience')?.remove(); } catch {}
      try { this._destroyRaceLoadingUi?.(); } catch {}
      gate.error(error);
    });
  };
  proto.update=function nativeRaceUpdate(...args){
    if(this._imageNativeLoading||this._imageNativeLoadError)return;
    return update?.apply(this,args);
  };
  proto.__tdrImageNativeLoaderInstalled=true;
}
