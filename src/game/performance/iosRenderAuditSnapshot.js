// Read-only, DEV diagnostics for a single, user-triggered snapshot.
// Phaser Camera.renderList describes the Game Objects rendered in the last
// camera frame. It is NOT a GPU draw-call count, a memory measurement or a
// guarantee that every listed object contributed visible pixels.
const natural=(n)=>Number.isFinite(Number(n))&&Number(n)>=0?Number(n):0;
const unique=list=>new Set(Array.isArray(list)?list:[]);
const formatMb=bytes=>(bytes/1048576).toFixed(1);

export function captureIosRenderAuditSnapshot(scene){
  const game=scene?.game;
  const canvas=game?.canvas;
  const gl=game?.renderer?.gl;
  const cameras=scene?.cameras?.cameras||[];
  const main=scene?.cameras?.main;
  const ui=scene?.uiCam;
  const mainList=unique(main?.renderList);
  const uiList=unique(ui?.renderList);
  let overlap=0;
  for(const object of mainList)if(uiList.has(object))overlap++;
  const photos=Array.isArray(scene?._trackBeautyTiles)?scene._trackBeautyTiles:[];
  let estimatedRgbaBytes=0;
  let photoInMain=0;
  let photoInUi=0;
  let photoSourceCount=0;
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
    mainObjects:mainList.size,
    uiObjects:uiList.size,
    sharedObjects:overlap,
    photoTiles:photos.length,
    photoInMain,
    photoInUi,
    photoSourceCount,
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
    `FOTO ${s.photoTiles??0} mosaicos · MAIN ${s.photoInMain??0} · UI ${s.photoInUi??0} · RGBA8 teórico ${s.photoRgbaEstimateMiB??0} MiB (${s.photoSourceCount??0} fuentes)`,
    'RENDERLIST = objetos reportados por Phaser; NO draw calls ni tiempo GPU',
    'RGBA8 = estimación de píxeles fotográficos, NO memoria total GPU'
  ].join('\n');
}
