import { RaceScene as SurvivalFinishStateScene } from './RaceSurvivalFinishStateScene.js';

export class RaceScene extends SurvivalFinishStateScene {
  _replayBrake01(t){
    const samples=this._ghostData?.samples||[];
    if(!samples.length)return 0;

    // Brake telemetry must represent the pedal itself, never inferred deceleration.
    // Use the last recorded sample at or before replay time, with no interpolation.
    let lo=0,hi=samples.length-1,best=-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1;
      if(Number(samples[mid]?.t||0)<=Number(t||0)){
        best=mid;
        lo=mid+1;
      }else hi=mid-1;
    }
    if(best<0)return 0;
    const v=Number(samples[best]?.brake);
    return Number.isFinite(v)&&v>=0.5?1:0;
  }
}
