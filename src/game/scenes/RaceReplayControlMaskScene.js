import { RaceScene as CleanReplayRaceScene } from './RaceReplayCleanScene.js';

export class RaceScene extends CleanReplayRaceScene {
  _startStatsNativeReplay(payload){
    super._startStatsNativeReplay(payload);
    this._hideReplayDrivingControlsOnly();
  }

  _hideReplayDrivingControlsOnly(){
    if(!this._statsNativeReplayActive)return;

    const hidden=[];
    const walk=(obj)=>{
      if(!obj)return;
      const children=Array.isArray(obj.list)?obj.list:[];
      const texKey=String(
        obj?.texture?.key ??
        obj?.frame?.texture?.key ??
        obj?.name ??
        ''
      ).toLowerCase();
      const interactive=!!obj?.input && obj.input.enabled!==false;
      const looksLikeDrivingControl=/brake|freno|gas|acceler|throttle|handbrake|parking/.test(texKey);
      if(interactive && looksLikeDrivingControl && obj.visible!==false){
        try{obj.setVisible?.(false);hidden.push(obj);}catch{}
      }
      for(const child of children)walk(child);
    };

    for(const obj of this.children?.list||[])walk(obj);
    this._tdrReplayDrivingControlsHidden=hidden;
  }

  _restoreStatsReplayGameplayUi(){
    super._restoreStatsReplayGameplayUi?.();
    for(const obj of this._tdrReplayDrivingControlsHidden||[]){
      try{obj.setVisible?.(true);}catch{}
    }
    this._tdrReplayDrivingControlsHidden=[];
  }
}
