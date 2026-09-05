import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';
import {
  createUuid,
  createRaceResult,
  persistRaceResult,
  linkGhostToRaceResult,
  migrateLegacyPersonalBest
} from '../results/raceResults.js';

function currentCarId(scene, data) {
  if (data?.carId) return String(data.carId);
  if (scene?.carId && scene.carId !== 'stock') return String(scene.carId);
  try { return localStorage.getItem('tdr2:carId') || String(scene?.carId || 'car'); }
  catch { return String(scene?.carId || 'car'); }
}

function currentTrackKey(scene, data) {
  if (data?.trackKey) return String(data.trackKey);
  if (scene?.trackKey) return String(scene.trackKey);
  try { return localStorage.getItem('tdr2:trackKey') || 'track01'; }
  catch { return 'track01'; }
}

// Shipping persistence boundary for local race results.
// It intentionally sits above the current race implementation so timing,
// physics and ghost/replay behaviour remain untouched.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    this._raceResultRaceId = createUuid();
    const result = super.create(data);

    this._raceResultTrackKey = currentTrackKey(this, data);
    this._raceResultCarId = currentCarId(this, data);
    this._raceResultSeenHistory = Array.isArray(this.ttHistory) ? this.ttHistory.length : 0;

    // Non-destructive migration: legacy ttBest/ghost keys stay exactly where
    // they are. We only create the new v1 index if one does not exist yet.
    try {
      migrateLegacyPersonalBest({
        trackKey: this._raceResultTrackKey,
        carId: this._raceResultCarId,
        track: this.track,
        ttBest: this.ttBest,
        ghost: this._ghostData
      });
    } catch {}

    return result;
  }

  _captureNewRaceResults() {
    const history = Array.isArray(this.ttHistory) ? this.ttHistory : [];
    if (history.length <= this._raceResultSeenHistory) return;

    for (let i = this._raceResultSeenHistory; i < history.length; i++) {
      const lap = history[i];
      const lapMs = Number(lap?.lapMs);
      if (!Number.isFinite(lapMs) || lapMs <= 0) continue;

      const raceResult = createRaceResult({
        raceId: this._raceResultRaceId,
        trackKey: this._raceResultTrackKey,
        carId: String(lap?.carId || this._raceResultCarId),
        lapMs,
        lapIndex: i + 1,
        valid: lap?.valid !== false && lap?.invalid !== true,
        completedAt: Number(lap?.t) || Date.now(),
        track: this.track,
        source: 'runtime'
      });

      const saved = persistRaceResult(raceResult);
      if (saved?.isPersonalBest) {
        // The existing ghost implementation saves independently. If this lap
        // is that same best lap, enrich it with the immutable result identity.
        // Samples/format are otherwise left untouched.
        linkGhostToRaceResult(raceResult);
        try {
          if (this._ghostData && Math.abs(Number(this._ghostData.lapMs) - lapMs) <= 2) {
            this._ghostData.raceId = raceResult.raceId;
            this._ghostData.resultId = raceResult.resultId;
            this._ghostData.raceResultSchemaVersion = 1;
          }
        } catch {}
      }
    }

    this._raceResultSeenHistory = history.length;
  }

  update(time, delta) {
    const result = super.update(time, delta);
    try { this._captureNewRaceResults(); } catch {}
    return result;
  }
}
