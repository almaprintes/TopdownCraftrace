import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderExportPathFixScene.js';

const TAP_PX=9;

export class EnvironmentBuilderScene extends Current{
  create(){
    this._assetTapCandidate=null;
    this._emptyTapCandidate=null;
    super.create();
  }

  _spawn(a,data=null){
    const img=super._spawn(a,data);
    if(!img)return img;

    // Base Builder selected assets immediately on pointerdown and allowed every
    // asset to move as soon as Phaser promoted the gesture to a drag. On touch
    // that makes an innocent pan gesture grab whichever decoration is under the
    // finger. Selection is handled at scene pointerup below instead.
    img.removeAllListeners('pointerdown');
    img.removeAllListeners('drag');
    img.on('drag',(_p,dx,dy)=>{
      // A two-finger map gesture always owns the interaction, even if this asset
      // happened to be selected before the pinch began.
      if(this._pinching||this._mode!=='select'||this._selected!==img)return;
      img.x=dx;img.y=dy;this._drawSelection?.();
    });
    return img;
  }

  _setupInput(){
    super._setupInput();

    const isAsset=o=>!!o?._env;
    const worldAt=p=>this._editCam.getWorldPoint(p.x,p.y);

    // These listeners are registered after the inherited input handlers. An
    // unselected asset under the finger becomes a tap candidate and the gesture
    // remains available for free-pan until pointerup.
    this.input.on('pointerdown',(p,currentlyOver=[])=>{
      this._emptyTapCandidate=null;
      if(this._pinching){
        this._assetTapCandidate=null;
        this._emptyTapCandidate=null;
        return;
      }
      if(this._mode!=='select'||!this._inside?.(p))return;

      const asset=(currentlyOver||[]).find(isAsset);
      if(asset){
        if(asset===this._selected){this._assetTapCandidate=null;return;}
        this._assetTapCandidate={pointerId:p.id,asset,x:p.x,y:p.y};
        this._freePan={pointerId:p.id,x:p.x,y:p.y,scrollX:this._editCam.scrollX,scrollY:this._editCam.scrollY};
        this._panStart=null;
        return;
      }

      this._assetTapCandidate=null;
      const w=worldAt(p);
      // A surface, barrier or one of their edit handles is not empty map.
      const onSurfaceHandle=!!this._surfaceHandleAt?.(w);
      const onRailHandle=!!this._railHandle?.(w);
      const onSurface=!!this._surfaceAt?.(w);
      const onRail=!!this._railAt?.(w);
      if(onSurfaceHandle||onRailHandle||onSurface||onRail)return;

      this._emptyTapCandidate={pointerId:p.id,x:p.x,y:p.y};
    });

    this.input.on('pointerup',p=>{
      this._finishAssetTap(p,true);
      this._finishEmptyTap(p,true);
    });
    this.input.on('pointerupoutside',p=>{
      this._finishAssetTap(p,false);
      this._finishEmptyTap(p,false);
    });
  }

  _finishAssetTap(p,allowSelect){
    const c=this._assetTapCandidate;
    if(!c||!p||p.id!==c.pointerId)return;
    this._assetTapCandidate=null;
    const dx=p.x-c.x,dy=p.y-c.y;
    if(allowSelect&&dx*dx+dy*dy<=TAP_PX*TAP_PX&&c.asset?.scene){
      this._select?.(c.asset);
    }
  }

  _finishEmptyTap(p,allowDeselect){
    const c=this._emptyTapCandidate;
    if(!c||!p||p.id!==c.pointerId)return;
    this._emptyTapCandidate=null;
    const dx=p.x-c.x,dy=p.y-c.y;
    if(!allowDeselect||dx*dx+dy*dy>TAP_PX*TAP_PX)return;

    this._selected=null;
    this._selectedSurface=null;
    this._selRail=null;
    this._selectionG?.clear?.();
    this._mode='select';
    this._refreshSurfaceDepthButton?.();
    this._updateLayerInfo?.();
    this._status?.();
    this._editablesLabel?.setText?.('✎ EDITABLES');
  }
}
