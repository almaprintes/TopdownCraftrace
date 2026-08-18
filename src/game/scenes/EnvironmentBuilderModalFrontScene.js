import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderHeaderFixedScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _openTrackPicker(){
    // The edit camera is rendered after the main UI camera. Hide it while the
    // modal is open so the world/canvas cannot visually cover or intercept it.
    if(this._editCam){
      this._modalEditCamWasVisible=this._editCam.visible!==false;
      this._editCam.setVisible(false);
    }
    super._openTrackPicker();
  }

  _closeTrackPicker(){
    super._closeTrackPicker?.();
    if(this._editCam && this._modalEditCamWasVisible!==false){
      this._editCam.setVisible(true);
    }
    this._modalEditCamWasVisible=null;
  }
}
