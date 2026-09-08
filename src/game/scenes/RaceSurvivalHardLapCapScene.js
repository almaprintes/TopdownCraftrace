import { RaceScene as CurrentRaceScene } from './RacePracticeAreaSurfaceTuningScene.js';

const SURVIVAL_MAX_LAPS=5;

export class RaceScene extends CurrentRaceScene{
  _registerFinishCross(racer){
    const completed=super._registerFinishCross(racer);
    if(!completed||!this._survivalMode||racer!==this._survivalPlayer)return completed;

    const laps=Number(racer?.completedLaps||0);
    if(laps<SURVIVAL_MAX_LAPS)return completed;

    // Hard guard in the ACTIVE race chain. Survival is a five-lap / five-round
    // mode: once the player accepts lap 5, a sixth lap must never be possible.
    racer.completedLaps=SURVIVAL_MAX_LAPS;
    if(Array.isArray(racer._survivalLapTimesMs)){
      racer._survivalLapTimesMs=racer._survivalLapTimesMs.slice(0,SURVIVAL_MAX_LAPS);
      this._syncSurvivalAuthoritativeHistory?.(racer);
    }

    this._survivalRound=SURVIVAL_MAX_LAPS;

    try{
      if(this.carBody?.body?.velocity){
        this.carBody.body.velocity.x=0;
        this.carBody.body.velocity.y=0;
      }
      if(Number.isFinite(this.carBody?.body?.angularVelocity))this.carBody.body.angularVelocity=0;
    }catch{}

    // With two survivors in round 5, crossing the fifth finish line means the
    // player cannot be the last pending racer: the survival run is won.
    if(!this._survivalFinished)this._finishSurvival?.(true);
    return true;
  }
}

export { SURVIVAL_MAX_LAPS };
