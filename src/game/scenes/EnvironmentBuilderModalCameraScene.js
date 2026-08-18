import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderHeaderFixedScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _openTrackPicker(){
    // Reuse the real-track picker, then render it through a dedicated camera
    // created last. This guarantees the modal is always above every editor/UI
    // camera regardless of display-list depth or camera render order.
    this._destroyModalCamera();
    super._openTrackPicker();

    const root=this._trackPicker;
    if(!root)return;

    const {width,height}=this.scale;
    const cam=this.cameras.add(0,0,width,height,false,'environment-builder-modal');
    cam.setScroll(0,0);
    cam.setZoom(1);
    cam.setBackgroundColor('rgba(0,0,0,0)');

    const keep=new Set([root,...(root.list||[])]);
    const ignored=(this.children?.list||[]).filter(obj=>!keep.has(obj));
    if(ignored.length)cam.ignore(ignored);

    // Do not render the picker twice in the editor camera. The new camera is
    // responsible for the complete modal, including its full-screen blocker.
    this._editCam?.ignore?.(root);

    this._modalCamera=cam;
  }

  _closeTrackPicker(){
    const root=this._trackPicker;
    this._destroyModalCamera();
    super._closeTrackPicker?.();
    // A destroyed container no longer matters to editCam; keeping this branch
    // explicit makes reopening safe if Phaser reuses camera ignore lists.
    if(root?.scene)this._editCam?.removeFromRenderList?.(root);
  }

  _destroyModalCamera(){
    if(!this._modalCamera)return;
    try{this.cameras.remove(this._modalCamera,true);}catch{}
    this._modalCamera=null;
  }
}
