import { RaceScene as CurrentRaceScene } from './RaceCleanStartLightsScene.js';

// Race direction is a logical property, not a geometry mutation.
// The road is built normally; for reverse layouts only timing/progress reads the
// precomputed raceCenterline in the opposite direction. Finish/start/checkpoints
// are already oriented by trackRegistry.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    const meta = this.track?.meta;
    if (meta?.raceDirection === 'reverse' && Array.isArray(meta.raceCenterline) && meta.raceCenterline.length > 2) {
      meta.centerline = meta.raceCenterline.map((p) => ({ ...p }));
      this._ttCl = null;
      this._ttProg = { idx: 0, inited: false };
      try { this._initTTCenterlineMetrics?.(); } catch (_) {}
    }

    return result;
  }
}
