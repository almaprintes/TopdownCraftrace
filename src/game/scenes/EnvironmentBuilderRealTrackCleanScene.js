import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderTrackVisiblePickerScrollScene.js';
import { createTrack } from '../tracks/trackRegistry.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
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
      this._selected=null;
      this._selectedSurface=null;
      this._selectionG?.clear?.();
      this._redrawSurfaces?.();
    }

    const w=Math.max(1200,Number(track.worldW)||8000);
    const h=Math.max(900,Number(track.worldH)||5000);
    this._editorWorldW=w;
    this._editorWorldH=h;
    this._editCam?.setBounds?.(0,0,w,h);

    // IMPORTANT: opening a real circuit must NOT restore a local Builder
    // project automatically. CARGAR is the explicit action for that.
    this._drawRealTrack?.();
    this._fitRealTrack?.();
    this._refreshTrackButton?.();

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
