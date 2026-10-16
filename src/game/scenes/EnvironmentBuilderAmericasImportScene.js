// DEV 1.2.217 — Import Karting Américas x2.5 directly for collision editing.
// The original .tdrtrack remains on the user's device; its PNG is stored as
// self-contained bytes in IndexedDB. No public circuit/rankings are created.
import {EnvironmentBuilderScene as Current} from './EnvironmentBuilderSafeWorkflowScene.js';
import {unpackImageProject,saveCanvasImage,readCanvasImage} from '../studio/imageCanvasProject.js';
import {AMERICAS,readDraft,writeDraft} from '../tracks/environmentDraftTrack.js';
import {hasTrack,createTrack} from '../tracks/trackRegistry.js';
import {paintOpenStageRoad,stageRasterTilePlan} from '../tracks/stageRasterRoad.js';
export class EnvironmentBuilderScene extends Current{
 create(){
  super.create();this._installAmericasImport();
  for(const scene of this.game?.scene?.getScenes?.(true)||[]){
   if(scene===this)continue;
   const key=scene?.sys?.settings?.key;
   if(['RaceScene','TrackEditorScene','TrackStudioScene'].includes(key)){
    console.warn('[Environment Studio] stopped overlapping background scene:',key);
    this.game.scene.stop(key);
   }
  }

  this.events.once('shutdown',()=>{this._clearStageRaster?.();this._filePicker?.remove();this._photoToken=(this._photoToken||0)+1;});
 }
 _installAmericasImport(){
  // Official published track always takes priority over browser-local imports.
  if(hasTrack(AMERICAS)&&createTrack(AMERICAS).meta?.imageNative?.availability==='published')return;
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
 _openRealTrack(trackId,resetProject=true){
  super._openRealTrack?.(trackId,resetProject);
  this._syncDomStatus?.();
 }
 _syncDomStatus(){
  super._syncDomStatus?.();
  const root=this._environmentDom;
  if(!root)return;
  let node=root.querySelector('[data-stage-render-state]');
  const open=this._realTrack?.closed===false||this._realTrack?.raceType==='stage';
  if(!open){node?.remove?.();return;}
  if(!node){
   node=document.createElement('div');
   node.dataset.stageRenderState='1';
   node.style.cssText='position:absolute;left:78px;top:104px;z-index:2;padding:5px 9px;border:1px solid #4ae8b1;background:rgba(4,23,20,.88);color:#b7ffdf;font:800 10px/1.2 monospace;pointer-events:none;max-width:65vw';
   root.appendChild(node);
  }
  const route=this._realTrack?.centerline||[];
  let maxEdge=0;
  for(let i=1;i<route.length;i++)maxEdge=Math.max(maxEdge,Math.hypot(Number(route[i].x)-Number(route[i-1].x),Number(route[i].y)-Number(route[i-1].y)));
  const layers=(this.game?.scene?.getScenes?.(true)||[]).map(scene=>scene?.sys?.settings?.key||'?').join(',');
  node.textContent='DEV 1.2.225 · A→B CANVAS 2D · '+route.length+
   ' puntos · salto máximo '+maxEdge.toFixed(1)+'px · mosaicos '+(this._stageRaster?.sprites?.length||0)+' · superficies '+(this._surfaces?.length||0)+' · escenas: '+layers;
 }
 _clearStageRaster(){
  const render=this._stageRaster;
  this._stageRaster=null;
  if(!render)return;
  for(const image of render.sprites||[])try{image.destroy();}catch{}
  for(const key of render.keys||[])try{this.textures.remove(key);}catch{}
 }
 _renderStageRaster(){
  const t=this._realTrack;
  if(!t||!(t.closed===false||t.raceType==='stage'))return;
  if(this._stageRaster?.track===t)return;
  this._clearStageRaster();
  const tiles=stageRasterTilePlan(t.centerline,t.trackWidth);
  if(!tiles.length)return;
  const sprites=[],keys=[];
  try{
   for(const [i,tile] of tiles.entries()){
    const canvas=document.createElement('canvas');
    canvas.width=tile.width;canvas.height=tile.height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Canvas 2D no disponible');
    ctx.setTransform(1,0,0,1,-tile.x,-tile.y);
    paintOpenStageRoad(ctx,t.centerline,t.trackWidth);
    const key='env-stage-open:'+this.sys.settings.key+':'+i;
    if(this.textures.exists(key))this.textures.remove(key);
    this.textures.addCanvas(key,canvas);
    keys.push(key);
    const sprite=this.add.image(tile.x,tile.y,key).setOrigin(0).setDepth(2.35);
    this.cameras.main.ignore(sprite);
    sprites.push(sprite);
   }
   this._stageRaster={track:t,sprites,keys};
  }catch(error){
   for(const img of sprites)try{img.destroy();}catch{}
   for(const key of keys)try{this.textures.remove(key);}catch{}
   console.error('[Environment Studio] no se pudo pintar el rally abierto en Canvas 2D',error);
   // If rasterization fails, never resurrect the false endpoint shortcut:
   // leave editor collision objects editable with empty green background.
   this._stageRaster=null;
  }
 }
 _drawRealTrack(){
  const t=this._realTrack;
  const open=t?.closed===false||t?.raceType==='stage';
  if(open){
   // The old Phaser Graphics road rendered a fake closing diagonal on some
   // devices despite 2465 consecutive points. Do not call its renderer at all.
   this._realTrackG?.clear?.();this._realTrackG?.setVisible?.(false);
   this._realTrackMarkG?.clear?.();
   const m=this._realTrackMarkG,width=Math.max(10,Number(t?.trackWidth)||90);
   if(m){
    m.setVisible?.(true);
    const finish=t.finishLine;
    if(finish?.a&&finish?.b){
     m.lineStyle(Math.max(7,width*.06),0xffffff,1);
     m.lineBetween(finish.a.x,finish.a.y,finish.b.x,finish.b.y);
    }
    const start=t.startLine,spawn=t.start||t.centerline?.[0];
    m.lineStyle(Math.max(5,width*.065),0x49ffb1,1);
    if(start?.a&&start?.b)m.lineBetween(start.a.x,start.a.y,start.b.x,start.b.y);
    if(Number.isFinite(Number(spawn?.x))&&Number.isFinite(Number(spawn?.y))){
     m.fillStyle(0x49ffb1,1);
     m.fillCircle(Number(spawn.x),Number(spawn.y),Math.max(10,width*.14));
    }
   }
   this._renderStageRaster();
   return;
  }
  this._clearStageRaster();
  this._realTrackG?.setVisible?.(true);
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
