import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderExportPathFixScene.js';

const TAP_PX=9;

export class EnvironmentBuilderScene extends Current{
  create(){
    this._assetTapCandidate=null;
    this._emptyTapCandidate=null;
    super.create();
    this._rewireExistingAssets();
  }

  _wireAsset(img){
    if(!img)return img;
    try{img.setInteractive?.({useHandCursor:true,draggable:true});}catch{}
    try{this.input?.setDraggable?.(img,true);}catch{}
    img.removeAllListeners('pointerdown');
    img.removeAllListeners('drag');
    img.on('drag',(_p,dx,dy)=>{
      if(this._pinching||this._mode!=='select'||this._selected!==img)return;
      img.x=dx;img.y=dy;this._drawSelection?.();
    });
    return img;
  }

  _rewireExistingAssets(){
    for(const img of this._objects||[])this._wireAsset(img);
  }

  _spawn(a,data=null){
    const img=super._spawn(a,data);
    return this._wireAsset(img);
  }

  _applyProject(p){
    super._applyProject?.(p);
    this._rewireExistingAssets();
  }

  _assetAtWorld(w){
    if(!w)return null;
    const objects=this._objects||[];
    for(let i=objects.length-1;i>=0;i--){
      const o=objects[i];
      if(!o?.scene||!o.visible)continue;
      let b=null;
      try{b=o.getBounds?.();}catch{}
      if(!b)continue;
      if(w.x>=b.x&&w.x<=b.x+b.width&&w.y>=b.y&&w.y<=b.y+b.height)return o;
    }
    return null;
  }

  _setupInput(){
    super._setupInput();

    const isAsset=o=>!!o?._env;
    const worldAt=p=>this._editCam.getWorldPoint(p.x,p.y);

    this.input.on('pointerdown',(p,currentlyOver=[])=>{
      this._emptyTapCandidate=null;
      if(this._pinching){
        this._assetTapCandidate=null;
        this._emptyTapCandidate=null;
        return;
      }
      if(this._mode!=='select'||!this._inside?.(p))return;

      const w=worldAt(p);
      // Prefer Phaser's interactive hit, but fall back to visible world bounds.
      // That makes assets restored from older projects selectable even if their
      // inherited hit area/listeners were created differently.
      const asset=(currentlyOver||[]).find(isAsset)||this._assetAtWorld(w);
      if(asset){
        if(asset===this._selected){this._assetTapCandidate=null;return;}
        this._assetTapCandidate={pointerId:p.id,asset,x:p.x,y:p.y};
        this._freePan={pointerId:p.id,x:p.x,y:p.y,scrollX:this._editCam.scrollX,scrollY:this._editCam.scrollY};
        this._panStart=null;
        return;
      }

      this._assetTapCandidate=null;
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
