import { RaceScene as ReplayRealSectorsScene } from './RaceReplayBrakeExactScene.js';

export class RaceScene extends ReplayRealSectorsScene {
  _startReplayExport(){
    if(this._replayExporting)return;

    const previousMode=this._replayCameraMode||'follow';

    // Exported hot laps always use the wide/drone view. It keeps the car inside
    // frame much more reliably than the tighter follow camera, especially on
    // sharp direction changes and fast corner exits.
    this._setReplayCamera('wide');

    const result=super._startReplayExport();
    const recorder=this._replayRecorder;

    if(recorder?.addEventListener){
      recorder.addEventListener('stop',()=>{
        if(this._replayActive && previousMode!=='wide'){
          try{this._setReplayCamera(previousMode);}catch{}
        }
      },{once:true});
    }

    return result;
  }
}
