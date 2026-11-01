import { expectedCompactTileSize } from './iosPhotoTileBudget.js';

// Read-only, DEV diagnostics for a single, user-triggered snapshot.
// Phaser Camera.renderList describes the Game Objects rendered in the last
// camera frame. It is NOT a GPU draw-call count, a memory measurement or a
// guarantee that every listed object contributed visible pixels.
const natural=(n)=>Number.isFinite(Number(n))&&Number(n)>=0?Number(n):0;
const unique=list=>new Set(Array.isArray(list)?list:[]);
const formatMb=bytes=>(bytes/1048576).toFixed(1);


const isWorldSpaceObject=(o)=>{
  const x=Number(o?.scrollFactorX),y=Number(o?.scrollFactorY);
  return Number.isFinite(x)&&Number.isFinite(y)&&(Math.abs(x)>0.00001||Math.abs(y)>0.00001);
};
const objectLabel=(obj,alias='')=>{
  const type=String(obj?.type||obj?.constructor?.name||'GameObject').slice(0,24);
  const texture=String(obj?.texture?.key||'').slice(0,42);
  const depth=Number(obj?.depth);
  return [alias||type,texture?'tex='+texture:null,Number.isFinite(depth)?'z='+depth:null].filter(Boolean).join(' ');
};
const namedWorldObjects=(scene)=>{
  const names=['_shoulderLeft','_shoulderRight','_curbOuter','_curbInner','_borderLeft','_borderRight','finishLineDebug','gridDebug','finishGfx','cpGfx','carRig'];
  const out=[];
  for(const key of names){
    const obj=scene?.[key];
    if(obj)out.push({alias:key,obj});
  }
  for(const [i,entry] of (scene?.gridCars||[]).entries()){
    if(entry?.rig)out.push({alias:'gridCars['+i+'].rig',obj:entry.rig});
  }
  return out;
};

export function captureIosRenderAuditSnapshot(scene){
  const game=scene?.game;
  const canvas=game?.canvas;
  const gl=game?.renderer?.gl;
  const cameras=scene?.cameras?.cameras||[];
  const main=scene?.cameras?.main;
  const ui=scene?.uiCam;
  const activeScenes=game?.scene?.getScenes?.(true)||[];
  const sceneSummaries=Array.isArray(activeScenes)?activeScenes.slice(0,12).map(sc=>({
    key:String(sc?.sys?.settings?.key||sc?.scene?.key||'?').slice(0,35),
    visibleCameras:(sc?.cameras?.cameras||[]).filter(c=>c?.visible!==false&&Number(c?.alpha??1)>0).length
  })):[];
  const visibleCameras=cameras.filter(c=>c?.visible!==false&&Number(c?.alpha??1)>0);
  const uiCameraVisible=!!ui&&ui.visible!==false&&Number(ui.alpha??1)>0;
  const mainList=unique(main?.renderList);
  const uiList=unique(ui?.renderList);
  let overlap=0;
  for(const object of mainList)if(uiList.has(object))overlap++;
  const sharedWorld=[...mainList].filter(obj=>uiList.has(obj)&&isWorldSpaceObject(obj));
  const uiWorld=[...uiList].filter(isWorldSpaceObject);
  // For named scene objects, cameraFilter is a camera bitmask. A named
  // object can be eligible for UI camera even when outside its viewport.
  // These checks do not change cameraFilter or any other game property.
  const uiCameraId=Number(ui?.id)||0;
  const namedWorld=namedWorldObjects(scene).map(({alias,obj})=>({
    alias,
    label:objectLabel(obj,alias),
    uiIgnored:uiCameraId>0&&(Number(obj.cameraFilter||0)&uiCameraId)!==0,
    inMain:mainList.has(obj),
    inUi:uiList.has(obj),
    visible:obj?.visible!==false,
  }));
  const unfilteredNamed=namedWorld.filter(v=>!v.uiIgnored&&v.visible);
  const photos=Array.isArray(scene?._trackBeautyTiles)?scene._trackBeautyTiles:[];
  let estimatedRgbaBytes=0;
  let photoInMain=0;
  let photoInUi=0;
  let photoSourceCount=0;
  let photoCompactCount=0;
  let photoFullSizeCount=0;
  let photoUnmatchedCount=0;
  const photoSizeExamples=[];
  const descriptor=scene?._imageNativePrepared||{};
  const authoredTiles=Array.isArray(descriptor?.tiles)?descriptor.tiles:[];
  const authoredByKey=new Map(authoredTiles.map(t=>[
    'native:'+descriptor.trackKey+':'+Number(t.x)+':'+Number(t.y),t
  ]));
  const keys=new Set();
  for(const sprite of photos){
    if(mainList.has(sprite))photoInMain++;
    if(uiList.has(sprite))photoInUi++;
    const texture=sprite?.texture;
    const key=texture?.key;
    if(!key||keys.has(key))continue;
    keys.add(key);
    const source=texture?.source?.[0]||null;
    const w=natural(source?.width),h=natural(source?.height);
    if(w>0&&h>0){
      photoSourceCount++;
      estimatedRgbaBytes+=w*h*4;
      const expected=authoredByKey.get(key);
      const fullW=natural(expected?.width),fullH=natural(expected?.height);
      const [smallW,smallH]=expectedCompactTileSize(fullW,fullH);
      let mode='SIN METADATOS';
      if(fullW>0&&fullH>0){
        if(w===smallW&&h===smallH){mode='COMPACTA';photoCompactCount++;}
        else if(w===fullW&&h===fullH){mode='ORIGINAL';photoFullSizeCount++;}
        else{mode='INESPERADA';photoUnmatchedCount++;}
      }else photoUnmatchedCount++;
      if(photoSizeExamples.length<9)photoSizeExamples.push(
        String(key).slice(0,42)+' '+w+'x'+h+' ['+mode+']'
      );
    }
  }
  const backingWidth=natural(canvas?.width);
  const backingHeight=natural(canvas?.height);
  const result={
    canvasWidth:backingWidth,
    canvasHeight:backingHeight,
    canvasMegapixels:backingWidth*backingHeight/1e6,
    glWidth:natural(gl?.drawingBufferWidth),
    glHeight:natural(gl?.drawingBufferHeight),
    cameraCount:cameras.length,
    visibleCameraCount:visibleCameras.length,
    uiCameraVisible,
    activeSceneCount:sceneSummaries.length,
    activeScenes:sceneSummaries,
    mainObjects:mainList.size,
    uiObjects:uiList.size,
    sharedObjects:overlap,
    uiWorldObjects:uiWorld.length,
    sharedWorldObjects:sharedWorld.length,
    sharedWorldExamples:sharedWorld.slice(0,12).map(obj=>objectLabel(obj)),
    uiWorldExamples:uiWorld.slice(0,12).map(obj=>objectLabel(obj)),
    namedWorldCount:namedWorld.length,
    namedWorldUnfiltered:unfilteredNamed.length,
    namedWorldUnfilteredExamples:unfilteredNamed.slice(0,14).map(v=>v.label+(v.inUi?' [EN UI]': ' [NO RENDER UI]')),
    namedWorldActuallyInUi:namedWorld.filter(v=>v.inUi).length,
    photoTiles:photos.length,
    photoInMain,
    photoInUi,
    photoSourceCount,
    photoCompactCount,
    photoFullSizeCount,
    photoUnmatchedCount,
    photoSizeExamples,
    photoRgbaEstimateMiB:Number(formatMb(estimatedRgbaBytes)),
    // Never identify this number as all GPU allocations: it is just the
    // estimated uncompressed RGBA8 pixel budget of native photo textures.
  };
  return result;
}

export function formatIosRenderAuditSnapshot(value){
  const s=value||{};
  const canvas=`${s.canvasWidth||0}×${s.canvasHeight||0}`;
  const gl=s.glWidth&&s.glHeight?`${s.glWidth}×${s.glHeight}`:'NO DISPONIBLE';
  return [
    'AUDITORÍA RENDER (captura puntual; sin sensor GPU)',
    `CANVAS ${canvas} (${Number(s.canvasMegapixels||0).toFixed(2)} Mpx) · GL ${gl}`,
    `CÁMARAS ${s.cameraCount??'?'} · renderList MAIN ${s.mainObjects??'?'} · UI ${s.uiObjects??'?'} · COMPARTIDOS ${s.sharedObjects??'?'}`,
    `CÁMARAS VISIBLES ${s.visibleCameraCount??'?'} · UI ${s.uiCameraVisible?'ACTIVA':'INACTIVA'} · ESCENAS ACTIVAS ${s.activeSceneCount??'?'}`,
    ...((s.activeScenes||[]).length?['ESCENAS '+s.activeScenes.map(v=>v.key+' ('+v.visibleCameras+' cam)').join(' | ')]:[]),
    `FOTO ${s.photoTiles??0} mosaicos · MAIN ${s.photoInMain??0} · UI ${s.photoInUi??0} · RGBA8 teórico ${s.photoRgbaEstimateMiB??0} MiB (${s.photoSourceCount??0} fuentes)`,
    `FOTO IOS CATEGORIAS COMPACTA ${s.photoCompactCount??0} · ORIGINAL ${s.photoFullSizeCount??0} · INESPERADA/SIN META ${s.photoUnmatchedCount??0}`,
    ...((s.photoSizeExamples||[]).length?['MOSAICOS '+s.photoSizeExamples.join(' | ')]:[]),
    `UI MUNDO ${s.uiWorldObjects??0} · COMPARTIDOS MUNDO ${s.sharedWorldObjects??0}`,
    `NOMBRADOS MUNDO ${s.namedWorldCount??0} · NO EXCLUIDOS DE UI ${s.namedWorldUnfiltered??0} · PRESENTES UI ${s.namedWorldActuallyInUi??0}`,
    ...((s.namedWorldUnfilteredExamples||[]).length?['EJEMPLOS SIN EXCLUIR: '+s.namedWorldUnfilteredExamples.join(' | ')]:[]),
    ...((s.sharedWorldExamples||[]).length?['COMPARTIDOS EN AMBAS: '+s.sharedWorldExamples.join(' | ')]:[]),
    ...((s.uiWorldExamples||[]).length?['EJEMPLOS MUNDO EN UI: '+s.uiWorldExamples.join(' | ')]:[]),

    'RENDERLIST de cámara INACTIVA no demuestra doble render; NO draw calls ni tiempo GPU',
    'NO EXCLUIDO = elegible para cámara UI, NO prueba de dibujo si no aparece en renderList',
    'RGBA8 = estimación de píxeles fotográficos, NO memoria total GPU'
  ].join('\n');
}
