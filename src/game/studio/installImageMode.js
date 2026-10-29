import { saveCanvasImage, readCanvasImage, packImageProject, unpackImageProject, normalizeCanvasImageBlob } from './imageCanvasProject.js';
import { attachImageNativeTrackContract } from '../tracks/imageNativeTrackContract.js';
import { trackStudioWidthMaximum, CLASSIC_TRACK_WIDTH_MAX } from './trackStudioWidthRange.js';
import { imageTrackResizePlan, rescaleImageTrackEditor } from './trackStudioImageScale.js';

const TILE = 2048;
const limit = (w,h) => w > 0 && h > 0 && w <= 8192 && h <= 8192 && w*h <= 32000000;
const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'img-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function resetTiles(s){s._imageCanvasToken=(s._imageCanvasToken||0)+1;for(const t of s._imageCanvasTiles||[]){try{t.sprite.destroy()}catch{}try{s.textures.remove(t.key)}catch{}}s._imageCanvasTiles=[];s._imageCanvas=null;s._trackWidthMax=CLASSIC_TRACK_WIDTH_MAX;s._gridGfx?.setVisible(true);s._centerMark?.setVisible(true)}
async function mount(s,blob,meta){
  const token=++s._imageCanvasToken,url=URL.createObjectURL(blob),img=new Image();
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Imagen dañada o no compatible'));img.src=url});
    const w=img.naturalWidth,h=img.naturalHeight;
    if(!limit(w,h))throw Error('Límite del editor: máximo 8192 px por lado y 32 megapíxeles');
    if(meta.width&&(meta.width!==w||meta.height!==h))throw Error('Dimensiones distintas a las del proyecto');
    if(token!==s._imageCanvasToken)return;
    for(const t of s._imageCanvasTiles||[]){t.sprite.destroy();s.textures.remove(t.key)}
    s._imageCanvasTiles=[];
    try{
      for(let y=0;y<h;y+=TILE)for(let x=0;x<w;x+=TILE){
        const tw=Math.min(TILE,w-x),th=Math.min(TILE,h-y),c=document.createElement('canvas');
        c.width=tw;c.height=th;
        const ctx=c.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas 2D no disponible');
        ctx.drawImage(img,x,y,tw,th,0,0,tw,th);
        const key='ts-image-'+token+'-'+x+'-'+y;
        s.textures.addCanvas(key,c);
        const sprite=s.add.image(x,y,key).setOrigin(0,0).setDepth(.5);
        s.cameras.main.ignore(sprite);
        s._imageCanvasTiles.push({key,sprite});
      }
    }catch(err){resetTiles(s);throw err}
    s._guideImage?.setVisible(false);
    s._imageCanvas={...meta,width:w,height:h,mode:'image'};
    s._trackWidthMax=trackStudioWidthMaximum(s._imageCanvas,s._trackWidth);
    s._editorWorldW=w;s._editorWorldH=h;
    s._editCam.setBounds(0,0,w,h);
    const fit=Math.min(s._editCam.width/w,s._editCam.height/h);
    s._editZoomMin=Math.min(.12,Math.max(.02,fit*.6));
    s._editCam.setZoom(Math.max(s._editZoomMin,fit*.95));
    s._editCam.centerOn(w/2,h/2);
    s._gridGfx?.setVisible(false);s._centerMark?.setVisible(false);
    s._redrawEditor();s._updatePanel();
  }finally{URL.revokeObjectURL(url);img.onload=null;img.onerror=null;img.src=''}
}
async function restore(s,meta){
  const token=++s._imageCanvasToken;
  if(!meta){resetTiles(s);return}
  try{
    const row=await readCanvasImage(meta.imageId);
    if(token!==s._imageCanvasToken)return;
    if(!row?.blob)throw Error('No está en este dispositivo; importa su paquete .tdrtrack');
    await mount(s,row.blob,meta);
  }catch(e){console.error('[TDR TrackStudio] image restore',e);s._flashMessage('Falta la imagen: importa el archivo .tdrtrack')}
}
async function createFromFile(s,file){
  if(!file?.size || !/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Usa PNG, JPEG o WebP');
  const preview=URL.createObjectURL(file),check=new Image();
  try{
    await new Promise((resolve,reject)=>{check.onload=resolve;check.onerror=()=>reject(Error('No se puede abrir la imagen'));check.src=preview});
    if(!limit(check.naturalWidth,check.naturalHeight))throw Error('Límite: 8192 px por lado y 32 MP');
  }finally{URL.revokeObjectURL(preview);check.onload=null;check.onerror=null;check.src=''}
  const meta={imageId:makeId(),name:file.name,type:file.type,size:file.size};
  // Persist before resetting project; quota failures must not discard editing.
  await saveCanvasImage(meta.imageId,file,meta);
  s._newProject();
  await mount(s,file,meta);
  s._autosaveRecovery();
  s._flashMessage('Imagen como lienzo · píxeles y coordenadas 1:1');
}

const IMAGE_TYPES=/^image\/(png|jpeg|webp)$/;
async function decodePhoto(file){
  if(!file?.size||!IMAGE_TYPES.test(file.type))throw Error('Usa una fotografía PNG, JPEG o WebP');
  const url=URL.createObjectURL(file),img=new Image();
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se puede abrir la imagen'));img.src=url});
    const width=img.naturalWidth,height=img.naturalHeight;
    if(!limit(width,height))throw Error('Límite de imagen: 8192 px por lado y 32 MP');
    return {width,height};
  }finally{URL.revokeObjectURL(url);img.onload=null;img.onerror=null;img.src=''}
}
async function replaceCanvasImage(s,file,{confirmed=false}={}){
  const current=s._getProjectData();
  if(!current.imageCanvas?.imageId)throw Error('Carga primero la imagen maestra con MAP');
  const size=await decodePhoto(file);
  const plan=imageTrackResizePlan(current,size.width,size.height);
  const factor=plan.sameSize?'sin cambiar la geometría':
    'escalando pista, curvas, bordes, meta y checkpoints x'+plan.scale.toFixed(3);
  if(!confirmed&&!window.confirm(
    'SUSTITUIR IMAGEN DE TRACK STUDIO\n\n'+
    plan.oldWidth+' × '+plan.oldHeight+' → '+plan.width+' × '+plan.height+' píxeles\n'+
    factor+'\n\nEl coche conserva su tamaño. La fotografía debe tener el mismo encuadre.\n'+
    'Este cambio conservará el proyecto anterior en el historial; guarda antes una copia .tdrtrack cuando sea importante.'
  ))return false;
  const meta={imageId:makeId(),name:file.name||'mapa-reescalado.png',
    type:file.type,size:file.size,width:plan.width,height:plan.height};
  // Persist source bytes BEFORE touching current geometry. Undo keeps its old imageId.
  await saveCanvasImage(meta.imageId,file,meta);
  const next={...rescaleImageTrackEditor(current,plan.width,plan.height),imageCanvas:meta};
  s._pushHistory?.();
  // Apply and mount as one controlled operation. An asynchronous restore from
  // _applyProjectData must not race with our new master-image decode.
  s._suspendImageRestore=true;
  try{
    s._applyProjectData(next);
    await mount(s,file,meta);
    s._autosaveRecovery();
    s._flashMessage('Mapa '+plan.width+' × '+plan.height+
      ' · geometría '+(plan.sameSize?'conservada':'ajustada x'+plan.scale.toFixed(2))+
      ' · coches sin cambios');
    return true;
  }catch(error){
    // A failed WebGL/canvas mount must not leave a half-rescaled track.
    s._applyProjectData(current);
    throw error;
  }finally{
    s._suspendImageRestore=false;
    if(s._imageCanvas?.imageId===current.imageCanvas.imageId)restore(s,current.imageCanvas);
  }
}
async function upscaleCanvasImage(s,factor){
  const current=s._getProjectData();
  const {width,height}=imageTrackResizePlan(current,
    current.imageCanvas.width*factor,current.imageCanvas.height*factor);
  if(!window.confirm('AMPLIAR PROYECTO x'+factor+'\n\n'+
    current.imageCanvas.width+' × '+current.imageCanvas.height+
    ' → '+width+' × '+height+' píxeles.\n\n'+
    'Ampliará la imagen, centerline, bordes, colisiones de pista, meta y checkpoints.\n'+
    'Los coches NO cambian. La interpolación mejora la resolución de salida, pero no inventa detalle fotográfico.\n\n¿Continuar?'))return false;
  const row=await readCanvasImage(current.imageCanvas.imageId);
  if(!row?.blob)throw Error('Falta la imagen maestra: vuelve a importar el .tdrtrack');
  const normalized=await normalizeCanvasImageBlob(row.blob,current.imageCanvas);
  const url=URL.createObjectURL(normalized.blob),img=new Image();
  let canvas;
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se puede decodificar el mapa'));img.src=url});
    if(img.naturalWidth!==current.imageCanvas.width||img.naturalHeight!==current.imageCanvas.height)
      throw Error('La imagen maestra no coincide con las dimensiones del proyecto');
    canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw Error('Canvas 2D no disponible');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,0,0,width,height);
    const desiredType=/^image\/(png|jpeg|webp)$/.test(normalized.blob.type)
      ?normalized.blob.type:'image/png';
    const blob=await new Promise((resolve,reject)=>
      canvas.toBlob(value=>value?resolve(value):reject(Error('No se pudo crear la imagen ampliada')),
        desiredType,.96));
    const ext=blob.type==='image/webp'?'webp':blob.type==='image/jpeg'?'jpg':'png';
    const file=new File([blob],'mapa-'+width+'x'+height+'.'+ext,{type:blob.type});
    return await replaceCanvasImage(s,file,{confirmed:true});
  }finally{
    if(canvas){canvas.width=0;canvas.height=0}
    URL.revokeObjectURL(url);img.onload=null;img.onerror=null;img.src='';
  }
}
function showCanvasScaleMenu(s,{onNew,onReplace,onUpscale}){
  s._closeCanvasScaleMenu?.();
  const meta=s._imageCanvas;
  const root=document.createElement('div');
  root.id='tdr-trackstudio-map-tools';
  root.style.cssText='position:fixed;inset:0;z-index:2147483601;display:grid;place-items:center;padding:12px;box-sizing:border-box;background:rgba(0,6,15,.94);font:600 13px system-ui,-apple-system,sans-serif;color:#e9faff';
  const panel=document.createElement('div');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label','MAP: escala y fotografía');
  panel.style.cssText='width:min(540px,96vw);max-height:92dvh;overflow:auto;padding:clamp(12px,3vw,20px);box-sizing:border-box;background:#091e2c;border:1px solid #329d9c;border-radius:15px;box-shadow:0 20px 60px #0009';
  const title=document.createElement('h2');
  title.textContent='MAP · TALLER DE ESCALA';
  title.style.cssText='font:800 clamp(16px,3vw,21px) system-ui;margin:0 0 10px;color:#73f0d4;letter-spacing:.05em';
  const info=document.createElement('p');
  info.textContent='Imagen / mundo: '+meta.width+' × '+meta.height+' px · pista: '+(Number(s._trackWidth)||0).toFixed(0)+' px';
  info.style.cssText='margin:0 0 12px;color:#b9d9e1;font-size:12px';
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px';
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
  const close=()=>{
    root.remove();document.removeEventListener('keydown',onKey);
    s.events?.off?.('shutdown',close);
    if(s._closeCanvasScaleMenu===close)s._closeCanvasScaleMenu=null;
  };
  const add=(label,desc,action,enabled=true)=>{
    const b=document.createElement('button');b.type='button';b.disabled=!enabled;
    b.style.cssText='min-width:0;min-height:73px;display:flex;flex-direction:column;gap:5px;padding:12px;text-align:left;border-radius:10px;background:#153347;border:1px solid #397d85;color:#f0fdff;font:700 13px system-ui;touch-action:manipulation;cursor:pointer';
    if(!enabled)b.style.opacity='.42';
    const strong=document.createElement('strong');strong.textContent=label;
    const small=document.createElement('small');small.textContent=desc;
    small.style.cssText='font:500 10px system-ui;color:#bbd6dd;line-height:1.35';
    b.append(strong,small);b.addEventListener('click',()=>{close();action()});grid.append(b);
  };
  add('SUSTITUIR FOTO','Mismo encuadre · reescala toda la geometría automáticamente',onReplace);
  for(const factor of [2,3]){
    const allowed=limit(meta.width*factor,meta.height*factor);
    add('AMPLIAR TODO ×'+factor,allowed
      ?(meta.width*factor)+' × '+(meta.height*factor)+' px · foto y geometría'
      :'Supera el límite de 8192 px / 32 MP',
      ()=>onUpscale(factor),allowed);
  }
  add('NUEVO MAPA','Crea un proyecto vacío. Conserva antes tu .tdrtrack',onNew);
  const note=document.createElement('p');
  note.textContent='La escala del coche y la cámara de carrera no se modifican. Al sustituir la foto, utiliza el mismo encuadre.';
  note.style.cssText='font:500 11px system-ui;line-height:1.5;color:#d1dce4;margin:14px 0 0';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='CANCELAR';
  cancel.style.cssText='display:block;margin:13px auto 0;min-height:40px;padding:7px 26px;background:#1b3646;border:1px solid #6f9eaa;border-radius:9px;color:white;touch-action:manipulation';
  cancel.addEventListener('click',close);
  panel.append(title,info,grid,note,cancel);root.append(panel);document.body.append(root);
  document.addEventListener('keydown',onKey);s.events?.once?.('shutdown',close);
  s._closeCanvasScaleMenu=close;cancel.focus?.();
}

export async function importImageProjectFile(s,file){
  const {project,image,repairedNested}=await unpackImageProject(file);
  const meta=project.editor.imageCanvas;
  if(!limit(meta.width,meta.height)||!meta.imageId)throw Error('Dimensiones/identificador inválidos');
  // Always store the real PNG/JPEG/WebP, never an accidentally nested .tdrtrack.
  await saveCanvasImage(meta.imageId,image,meta);
  s._importProjectOrTrack(project);
  s._autosaveRecovery();
  return {repairedNested};
}
export function installTrackStudioImageMode(s){
  s._imageCanvas=null;s._imageCanvasTiles=[];s._imageCanvasToken=0;
  // A single authoritative authored-image contract, shared by all future
  // circuits. The binary .tdrtrack envelope and its payload stay unchanged.
  const originalGameExport=s._exportToGameTrack.bind(s);
  s._exportToGameTrack=()=>{
    const track=originalGameExport();
    return s._imageCanvas ? attachImageNativeTrackContract(track,s._imageCanvas) : track;
  };
  const originalProject=s._getProjectData.bind(s);
  s._getProjectData=()=>({...originalProject(),version:2,imageCanvas:s._imageCanvas?{...s._imageCanvas}:null});
  const originalApply=s._applyProjectData.bind(s);
  s._applyProjectData=(data)=>{
    if(data?.imageCanvas){
      s._imageCanvas={...data.imageCanvas};
      s._editorWorldW=data.imageCanvas.width;s._editorWorldH=data.imageCanvas.height;
      s._editCam.setBounds(0,0,s._editorWorldW,s._editorWorldH);
    }
    originalApply(data);
    s._trackWidthMax=trackStudioWidthMaximum(data?.imageCanvas,s._trackWidth);
    if(!s._suspendImageRestore)restore(s,data?.imageCanvas||null);
  };
  const originalNew=s._newProject.bind(s);
  s._newProject=()=>{
    resetTiles(s);s._editorWorldW=8000;s._editorWorldH=5000;s._editZoomMin=.12;
    s._editCam.setBounds(0,0,8000,5000);
    originalNew();
  };
  const originalImport=s._importProjectOrTrack.bind(s);
  s._importProjectOrTrack=data=>{
    if(!data?.editor?.imageCanvas&&!data?.imageCanvas)resetTiles(s);
    return originalImport(data);
  };
  const originalSave=s._saveProject.bind(s);
  s._saveProject=async()=>{
    if(!s._imageCanvas)return originalSave();
    try{
      const data={editor:s._getProjectData(),gameTrack:s._exportToGameTrack()},row=await readCanvasImage(s._imageCanvas.imageId);
      if(!row?.blob)throw Error('No se encuentra la imagen maestra');
      // Older saves may have placed a whole .tdrtrack where an image belonged.
      // Normalize before packaging and repair the IndexedDB copy if necessary.
      const image=await normalizeCanvasImageBlob(row.blob,s._imageCanvas);
      if(image.nested) await saveCanvasImage(s._imageCanvas.imageId,image.blob,s._imageCanvas);
      const json=JSON.stringify(data);
      localStorage.setItem('trackstudio_project',json);
      localStorage.setItem('trackstudio_recovery',json);
      const blob=packImageProject(data,image.blob,s._imageCanvas);
      download(blob,'trackstudio-image-'+Date.now()+'.tdrtrack');
      s._flashMessage('Guardado: proyecto + imagen en .tdrtrack');
    }catch(e){console.error('[TrackStudio] save failed',e);s._flashMessage('Error al guardar: '+(e.message||'desconocido'))}
  };
  const input=document.createElement('input'),replaceInput=document.createElement('input');
  for(const el of [input,replaceInput]){
    el.type='file';el.accept='image/png,image/jpeg,image/webp';
    el.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(el);
  }
  const reportError=error=>{console.error('[TrackStudio] MAP',error);
    s._flashMessage('Error de MAP: '+(error?.message||'desconocido'));};
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];input.value='';if(!file)return;
    try{await createFromFile(s,file)}catch(error){reportError(error)}
  });
  replaceInput.addEventListener('change',async()=>{
    const file=replaceInput.files?.[0];replaceInput.value='';if(!file)return;
    try{await replaceCanvasImage(s,file)}catch(error){reportError(error)}
  });
  const newMap=()=>{
    if(!window.confirm('¿Crear un NUEVO mapa? Guarda antes el circuito actual en .tdrtrack.'))return;
    input.click();
  };
  // MAP becomes the self-service image/geometry workbench on existing projects.
  s._openCanvasImagePicker=()=>{
    if(!s._imageCanvas?.imageId)return newMap();
    showCanvasScaleMenu(s,{
      onNew:newMap,
      onReplace:()=>replaceInput.click(),
      onUpscale:async factor=>{try{await upscaleCanvasImage(s,factor)}catch(error){reportError(error)}}
    });
  };
  s._replaceCanvasImagePicker=()=>replaceInput.click();
  s._upscaleCanvasImage=async factor=>upscaleCanvasImage(s,factor);
  const x=Math.floor(s._leftBarW/2),y=s._topBarH+278;
  s._canvasModeBtn=s._makeIconButton(x,y,'MAP',()=>s._openCanvasImagePicker(),'11px');
  s.events.once('shutdown',()=>{
    s._closeCanvasScaleMenu?.();
    s._openCanvasImagePicker=null;s._replaceCanvasImagePicker=null;s._upscaleCanvasImage=null;
    input.remove();replaceInput.remove();resetTiles(s);
  });
}
