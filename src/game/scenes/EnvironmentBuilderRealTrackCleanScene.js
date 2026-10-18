import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderTrackVisiblePickerScrollScene.js';
import { createTrack } from '../tracks/trackRegistry.js';
import { getTrackBeautyLayerConfig } from '../tracks/trackBeautyLayers.js';
import { createTrackEnvironment } from '../tracks/environmentRegistry.js';

const BASE=import.meta.env.BASE_URL||'/';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  // La imagen de Karting Tenerife ya contiene el trazado y la meta: no dibujar
  // el asfalto procedural por encima, pero mantener las capas editables.
  _drawRealTrack(){
    super._drawRealTrack?.();
    const cfg=getTrackBeautyLayerConfig(this._trackId);
    const native=this._realTrack?.meta?.renderMode==='image-native'&&
      this._realTrack?.meta?.imageNative?.availability==='published';
    const photo=native||(this._trackId==='karting-tenerife'&&!!cfg?.useBeautyLayer&&!!cfg?.assetsAvailable);
    this._realTrackG?.setVisible(!photo);
    this._realTrackMarkG?.setVisible(!photo);
  }

  create(){
    super.create();

    // Recreate the real-track graphics AFTER every inherited UI layer has
    // finished configuring camera ignore lists. This guarantees that the
    // track belongs only to the editor camera and cannot be silently hidden.
    try{ this._realTrackG?.destroy?.(); }catch{}
    try{ this._realTrackMarkG?.destroy?.(); }catch{}
    this._realTrackG=this.add.graphics().setDepth(2.35);
    this._realTrackMarkG=this.add.graphics().setDepth(2.45);
    this.cameras.main.ignore([this._realTrackG,this._realTrackMarkG]);

    this._drawRealTrack?.();
    this._fitRealTrack?.();
    this._syncBeautyReference?.();
  }

  _clearBeautyReference(){
    for(const o of this._beautyReference||[])try{o?.destroy?.();}catch{}
    this._beautyReference=[];
  }

  _syncBeautyReference(){
    this._clearBeautyReference();
    const native=this._realTrack?.meta?.renderMode==='image-native'?
      this._realTrack?.meta?.imageNative:null;
    const tiles=native?.availability==='published'&&Array.isArray(native.tiles)?
      native.tiles.map(t=>({path:t.assetPath,x:t.x,y:t.y,w:t.width,h:t.height})):[];
    const cfg=tiles.length?{useBeautyLayer:true,assetsAvailable:true,tiles,
      assetRevision:this._realTrack?.meta?.sourceImageSha256||'photo'}:
      getTrackBeautyLayerConfig(this._trackId);
    if(!cfg?.useBeautyLayer||!cfg?.assetsAvailable||!cfg?.tiles?.length)return;
    const pending=[];
    for(const [i,t] of cfg.tiles.entries()){
      const key=`env-builder-beauty:${this._trackId}:${i}:${cfg.assetRevision||'1'}`;
      if(!this.textures.exists(key)){
        this.load.image(key,`${BASE}${String(t.path||'').replace(/^\//,'')}`);
        pending.push(key);
      }
    }
    const render=()=>{
      if(this._trackId!==String(this._trackId||''))return;
      // Atlántico's authored photo is 4344x3258; the *published* race world
      // is 70%. Show the exact same photo transform in the editor so placed
      // markings and pen collisions use true race-world coordinates.
      const tileWorldScale=this._trackId==='circuito-atlantico'
        ?(Number(native?.worldScale)||1):1;
      this._clearBeautyReference();
      for(const [i,t] of cfg.tiles.entries()){
        const key=`env-builder-beauty:${this._trackId}:${i}:${cfg.assetRevision||'1'}`;
        if(!this.textures.exists(key))continue;
        const img=this.add.image((Number(t.x)||0)*tileWorldScale,(Number(t.y)||0)*tileWorldScale,key).setOrigin(0).setDepth(2.05).setDisplaySize((Number(t.w)||1)*tileWorldScale,(Number(t.h)||1)*tileWorldScale);
        this.cameras.main.ignore(img);
        this._beautyReference.push(img);
      }
      this._drawRealTrack?.();
    };
    if(!pending.length){render();return;}
    this.load.once('complete',render);
    if(!this.load.isLoading())this.load.start();
  }

  _openRealTrack(trackId,resetProject=true){
    let track=null;
    try{ track=createTrack(trackId); }
    catch{ this._flash?.('CIRCUITO NO ENCONTRADO'); return; }

    this._trackId=trackId;
    this._realTrack=track;

    if(resetProject){
      for(const o of this._objects||[])o?.destroy?.();
      this._objects=[];
      this._surfaces=[];
      this._rails=[];
      this._selected=null;
      this._selectedSurface=null;
      this._selRail=null;
      this._selectionG?.clear?.();
      this._redrawSurfaces?.();
      this._railRoot?.removeAll?.(true);
      this._drawRails?.();
    }

    const w=Math.max(1200,Number(track.worldW)||8000);
    const h=Math.max(900,Number(track.worldH)||5000);
    this._editorWorldW=w;
    this._editorWorldH=h;
    this._editCam?.setBounds?.(0,0,w,h);

    // Always start from the official repository environment. CARGAR remains
    // explicit and is reserved for restoring the user's local draft.
    try{
      const official=createTrackEnvironment(trackId);
      if(official)this._applyProject?.(official);
    }catch(err){console.warn('[TDR2] official Environment Studio project could not be loaded',trackId,err);}
    this._drawRealTrack?.();
    this._fitRealTrack?.();
    this._refreshTrackButton?.();
    this._syncBeautyReference?.();

    this.time?.delayedCall?.(0,()=>{
      this._drawRealTrack?.();
      this._fitRealTrack?.();
    });
  }

  _chooseRealTrack(key){
    if(!key)return;
    if(key!==this._trackId&&((this._objects?.length||0)||(this._surfaces?.length||0))){
      const ok=window.confirm?.('Si no has guardado los cambios actuales, se perderán. ¿Abrir otro circuito?');
      if(ok===false)return;
    }
    this._closeTrackPicker();
    this._openRealTrack(key,true);
    this._flash?.(`ABIERTO · ${this._realTrack?.name||key}`);
  }
}
