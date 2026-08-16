import { RaceScene as CurrentRaceScene } from './RaceSurvivalStartScene.js';

export class RaceScene extends CurrentRaceScene {
  _softHideLegacyGridCars() {
    if (!this._survivalMode || !Array.isArray(this.gridCars)) return;
    for (const gc of this.gridCars) {
      if (!gc || gc.__survivalHidden) continue;
      gc.__survivalHidden = true;
      gc.active = false;
      try { gc.body?.setVelocity?.(0, 0); } catch {}
      try { if (gc.body?.body) gc.body.body.enable = false; } catch {}
      try { gc.rig?.setVisible?.(false); } catch {}
      try { gc.sprite?.setVisible?.(false); } catch {}
    }
  }

  _initSurvival() {
    super._initSurvival();
    this._softHideLegacyGridCars();
  }

  update(time, delta) {
    const result = super.update(time, delta);
    if (this._survivalMode) this._softHideLegacyGridCars();
    return result;
  }
}
