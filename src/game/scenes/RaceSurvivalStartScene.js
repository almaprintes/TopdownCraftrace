import { RaceScene as CurrentRaceScene } from './RaceSurvivalAvoidanceScene.js';

export class RaceScene extends CurrentRaceScene {
  update(time, delta) {
    const result = super.update(time, delta);
    if (!this._survivalMode || this._survivalFinished || !this._survivalBots?.length) return result;

    if (!this._raceStarted) {
      const body = this.car?.body || this.carBody?.body || this.carBody;
      const vx = Number(body?.velocity?.x || 0);
      const vy = Number(body?.velocity?.y || 0);
      const live = this._startState === 'RACING' || this._startState === 'GO' || Math.hypot(vx, vy) > 3;
      if (live) {
        this._raceStarted = true;
        super._updateSurvivalBots(delta);
      }
    }
    return result;
  }
}
