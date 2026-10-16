// DEV 1.2.217 — Import Karting Américas x2.5 directly for collision editing.
// The original .tdrtrack remains on the user's device; its PNG is stored as
// self-contained bytes in IndexedDB. No public circuit/rankings are created.
import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderSafeWorkflowScene.js';
import {unpackImageProject,saveCanvasImage,readCanvasImage} from '../studio/imageCanvasProject.js';
import {AMERICAS,readDraft,writeDraft} from '../tracks/environmentDraftTrack.js';
export class EnvironmentBuilderScene extends Current{
 create(){
  super.create();this._installAmericasImport();
  this.events.once('shutdown',()=>{this._filePicker?.remove();this._photoToken=(this._photoToken||0)+1;});
 }
 _installAmericasImport(){
  const parent=this._workflowUi;if(!parent)return;
  const button=document.createElement('button');
  button.textContent='📂 IMPORTAR KARTING AMÉRICAS .TDRTRACK';
  button.style.cssText='width:100%;min-height:44px;margin-top:8px;font-size:10px;border:1px solid #d8bc53;background:#263b45';
  const picker=document.createElement('input');picker.type='file';picker.accept='.tdrtrack,application/octet-stream';picker.hidden=true;
  document.body.appendChild(picker);this._filePicker=picker;parent.appendChild(button);
  button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();picker.click();});
  picker.addEventListener('change',async()=>{
   const file=picker.files?.[0];picker.value='';if(!file)return;
   button.disabled=true;button.textContent='IMPORTANDO PISTA…';
   try{
    const {project,image}=await unpackImageProject(file);
    const a=project?.imageAsset,g=project?.gameTrack;
    if(a?.width!==2862||a?.height!==3435||g?.worldW!==2862||g?.worldH!==3435)
     throw Error('Es necesario el proyecto Karting Américas x2.5 de 2862 × 3435');
    if(!g?.trackShape?.leftEdge?.length||!g?.trackShape?.rightEdge?.length||g?.centerline?.length<3)
     throw Error('Falta la geometría de Track Studio');
    if(this._trackId!==AMERICAS&&((this._objects?.length||0)||(this._collisionLines?.length||0)||(this._collisionZones?.length||0))){
     if(window.confirm('¿Guardar el circuito actual antes de abrir Karting Américas?')!==true)return;
     this._save();
    }
    await saveCanvasImage(a.imageId,image,a);
    writeDraft(project);
    if(!this._trackKeys?.includes(AMERICAS))this._trackKeys.push(AMERICAS);
    this._closeTrackPicker?.();this._openRealTrack(AMERICAS,true);
    this._builderToast?.('KARTING AMÉRICAS IMPORTADO · COLOCA LAS COLISIONES');
   }catch(error){
    console.error('[Environment Studio] importación de Karting Américas',error);
    this._builderToast?.('NO SE IMPORTÓ: '+(error?.message||'Archivo no válido'));
   }finally{button.disabled=false;button.textContent='📂 IMPORTAR KARTING AMÉRICAS .TDRTRACK';}
  });
 }
 _drawRealTrack(){
  super._drawRealTrack?.();
  if(this._trackId===AMERICAS&&this._photoLoaded){
   this._realTrackG?.setVisible(false);this._realTrackMarkG?.setVisible(false);
  }
 }
 _clearBeautyReference(){
  const keys=this._photoTileKeys||[];
  super._clearBeautyReference?.();
  this._photoTileKeys=[];
  for(const key of keys)try{this.textures.remove(key)}catch{}
 }
 _syncBeautyReference(){
  const info=this._realTrack?.meta?.imageNative;
  if(this._trackId!==AMERICAS||info?.availability!=='local'){
   this._photoToken=(this._photoToken||0)+1;this._photoLoaded=false;
   return super._syncBeautyReference?.();
  }
  const token=(this._photoToken||0)+1;this._photoToken=token;
  this._photoLoaded=false;this._clearBeautyReference();this._drawRealTrack();
  (async()=>{
   const row=await readCanvasImage(info.imageId);
   if(!row?.blob)throw Error('Imagen ausente. Vuelve a importar el .tdrtrack.');
   const url=URL.createObjectURL(row.blob),img=new Image();
   try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se puede leer la imagen'));img.src=url;});
    if(this._photoToken!==token||this._trackId!==AMERICAS)return;
    if(img.naturalWidth!==info.width||img.naturalHeight!==info.height)throw Error('Imagen y pista no coinciden');
    const tiles=[],keys=[],tile=1024;
    for(let y=0;y<img.naturalHeight;y+=tile)for(let x=0;x<img.naturalWidth;x+=tile){
     const w=Math.min(tile,img.naturalWidth-x),h=Math.min(tile,img.naturalHeight-y);
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas no disponible');
     ctx.drawImage(img,x,y,w,h,0,0,w,h);
     const key='env-americas:'+token+':'+x+':'+y;
     this.textures.addCanvas(key,canvas);
     const sprite=this.add.image(x,y,key).setOrigin(0).setDepth(2.05);
     this.cameras.main.ignore(sprite);keys.push(key);tiles.push(sprite);
    }
    if(this._photoToken!==token||this._trackId!==AMERICAS){
     for(const sprite of tiles)sprite.destroy();
     for(const key of keys)this.textures.remove(key);
     return;
    }
    this._beautyReference=tiles;this._photoTileKeys=keys;this._photoLoaded=true;
    this._drawRealTrack();
    this._builderToast?.('FOTOGRAFÍA KARTING AMÉRICAS · LISTA PARA COLISIONES');
   }finally{img.src='';URL.revokeObjectURL(url);}
  })().catch(error=>{
   console.error('[Environment Studio] fotografía local',error);
   if(this._photoToken===token)this._builderToast?.('FOTO AUSENTE · REIMPORTA EL ARCHIVO .TDRTRACK');
  });
 }
}
