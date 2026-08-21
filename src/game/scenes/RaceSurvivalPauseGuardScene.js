import { RaceScene as SurvivalFinishStateScene } from './RaceSurvivalFinishStateScene.js';

// Pause must freeze the ENTIRE single-player Survival simulation, not only Arcade Physics.
// Survival AI advances through custom update logic, so physics.world.pause() alone is insufficient.
export class RaceScene extends SurvivalFinishStateScene {
  update(time, delta){
    if(this._survivalMode && this._pauseMenuOpen && !this._captureInProgress) return;
    return super.update(time, delta);
  }

  _updateSurvivalBots(deltaMs){
    if(this._pauseMenuOpen && !this._captureInProgress) return;
    return super._updateSurvivalBots(deltaMs);
  }
}
