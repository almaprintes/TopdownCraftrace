import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderExportPathFixScene.js';

const TAP_PX=9;

export class EnvironmentBuilderScene extends Current{
  create(){
    this._assetTapCandidate=null;
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
      // Moving is deliberately a second interaction: only an asset that was
      // already selected before this gesture may follow the pointer.
      if(this._mode!=='select'||this._selected!==img)return;
      img.x=dx;img.y=dy;this._drawSelection?.();
    });
    return img;
  }

  _setupInput(){
    super._setupInput();

    const isAsset=o=>!!o?._env;

    // This listener is registered after the inherited input handlers. If an
    // unselected asset is under the finger, re-enable free pan for this gesture
    // and defer selection until pointerup.
    this.input.on('pointerdown',(p,currentlyOver=[])=>{
      if(this._mode!=='select'||!this._inside?.(p))return;
      const asset=(currentlyOver||[]).find(isAsset);
      if(!asset||asset===this._selected){this._assetTapCandidate=null;return;}
      this._assetTapCandidate={pointerId:p.id,asset,x:p.x,y:p.y};
      this._freePan={pointerId:p.id,x:p.x,y:p.y,scrollX:this._editCam.scrollX,scrollY:this._editCam.scrollY};
      this._panStart=null;
    });

    this.input.on('pointerup',p=>this._finishAssetTap(p,true));
    this.input.on('pointerupoutside',p=>this._finishAssetTap(p,false));
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
}
