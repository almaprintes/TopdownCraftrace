import { saveCanvasImage, readCanvasImage, packImageProject, unpackImageProject } from './imageCanvasProject.js';

const TILE = 2048;
const limit = (w,h) => w > 0 && h > 0 && w <= 8192 && h <= 8192 && w*h <= 32000000;
const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'img-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function resetTiles(s){s._imageCanvasToken=(s._imageCanvasToken||0)+1;for(const t of s._imageCanvasTiles||[]){try{t.sprite.destroy()}catch{}try{s.textures.remove(t.key)}catch{}}s._imageCanvasTiles=[];s._imageCanvas=null;s._gridGfx?.setVisible(true);s._centerMark?.setVisible(true)}
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
export async function importImageProjectFile(s,file){
  const {project,image}=await unpackImageProject(file);
  const meta=project.editor.imageCanvas;
  if(!limit(meta.width,meta.height)||!meta.imageId)throw Error('Dimensiones/identificador inválidos');
  await saveCanvasImage(meta.imageId,image,meta);
  s._importProjectOrTrack(project);
  s._autosaveRecovery();
}
export function installTrackStudioImageMode(s){
  s._imageCanvas=null;s._imageCanvasTiles=[];s._imageCanvasToken=0;
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
    restore(s,data?.imageCanvas||null);
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
      const json=JSON.stringify(data);
      localStorage.setItem('trackstudio_project',json);
      localStorage.setItem('trackstudio_recovery',json);
      const blob=packImageProject(data,row.blob,s._imageCanvas);
      download(blob,'trackstudio-image-'+Date.now()+'.tdrtrack');
      s._flashMessage('Guardado: proyecto + imagen en .tdrtrack');
    }catch(e){console.error('[TrackStudio] save failed',e);s._flashMessage('Error al guardar: '+(e.message||'desconocido'))}
  };
  const input=document.createElement('input');
  input.type='file';input.accept='image/png,image/jpeg,image/webp';
  input.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0';
  input.addEventListener('change',async()=>{const f=input.files?.[0];input.value='';if(!f)return;try{await createFromFile(s,f)}catch(e){console.error(e);s._flashMessage('Error de imagen: '+(e.message||'desconocido'))}});
  document.body.appendChild(input);
  const x=Math.floor(s._leftBarW/2),y=s._topBarH+278;
  s._canvasModeBtn=s._makeIconButton(x,y,'MAP',()=>{
    if(!window.confirm('¿Crear un proyecto desde una imagen? Guarda antes el actual si lo necesitas.'))return;
    input.click();
  },'11px');
  s.events.once('shutdown',()=>{input.remove();resetTiles(s)});
}
