import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';
import {
  createUuid,
  createRaceResult,
  persistRaceResult,
  linkGhostToRaceResult,
  migrateLegacyPersonalBest
} from '../results/raceResults.js';
import {
  createLocalRaceEvidenceState,
  sampleLocalRaceEvidence,
  finalizeLocalRaceEvidence
} from '../results/localRaceEvidence.js';
import {
  recordRaceResultInPlayerHistory,
  ensurePlayerRacingHistoryBootstrap
} from '../results/playerRacingHistory.js';

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

// Shipping persistence boundary for local Race Record v1.
// Nothing in this layer is transmitted. The record, compact evidence, local
// validation and Player Racing History stay on the player's device.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    this._raceResultRaceId = createUuid();
    this._raceEvidence = createLocalRaceEvidenceState();
    const result = super.create(data);

    this._raceResultTrackKey = currentTrackKey(this, data);
    this._raceResultCarId = currentCarId(this, data);
    this._raceResultSeenHistory = Array.isArray(this.ttHistory) ? this.ttHistory.length : 0;

    try {
      migrateLegacyPersonalBest({
        trackKey: this._raceResultTrackKey,
        carId: this._raceResultCarId,
        track: this.track,
        ttBest: this.ttBest,
        ghost: this._ghostData
      });
    } catch {}

    try { ensurePlayerRacingHistoryBootstrap(); } catch {}

    return result;
  }

  _sampleRaceRecordEvidence(time) {
    if (!this._raceStarted || this._replayActive || !this.carBody?.body) return;
    const body = this.carBody;
    const vel = body.body.velocity;
    let progress01 = null;
    try {
      progress01 = this._computeLapProgress01?.(Number(body.x), Number(body.y));
    } catch {}

    sampleLocalRaceEvidence(this._raceEvidence, {
      timeMs: Number.isFinite(Number(time)) ? Number(time) : performance.now(),
      simTick: this.simTick,
      x: body.x,
      y: body.y,
      rotation: body.rotation,
      vx: vel?.x,
      vy: vel?.y,
      progress01
    });
  }

  _captureNewRaceResults() {
    const history = Array.isArray(this.ttHistory) ? this.ttHistory : [];
    if (history.length <= this._raceResultSeenHistory) return;

    for (let i = this._raceResultSeenHistory; i < history.length; i++) {
      const lap = history[i];
      const lapMs = Number(lap?.lapMs);
      if (!Number.isFinite(lapMs) || lapMs <= 0) continue;

      const localEvidence = finalizeLocalRaceEvidence(this._raceEvidence, {
        lapMs,
        lapTick: lap?.lapTick,
        s1Tick: lap?.s1Tick,
        s2Tick: lap?.s2Tick
      });

      const raceResult = createRaceResult({
        raceId: this._raceResultRaceId,
        trackKey: this._raceResultTrackKey,
        carId: String(lap?.carId || this._raceResultCarId),
        lapMs,
        lapIndex: i + 1,
        valid: lap?.valid !== false && lap?.invalid !== true,
        completedAt: Number(lap?.t) || Date.now(),
        track: this.track,
        source: 'runtime',
        timing: {
          lapTick: lap?.lapTick,
          s1Ms: lap?.s1,
          s1Tick: lap?.s1Tick,
          s2Ms: lap?.s2,
          s2Tick: lap?.s2Tick
        },
        evidence: localEvidence.evidence,
        localValidation: localEvidence.validation
      });

      const saved = persistRaceResult(raceResult);
      try { recordRaceResultInPlayerHistory(raceResult); } catch {}

      if (saved?.isPersonalBest) {
        linkGhostToRaceResult(raceResult);
        try {
          if (this._ghostData && Math.abs(Number(this._ghostData.lapMs) - lapMs) <= 2) {
            this._ghostData.raceId = raceResult.raceId;
            this._ghostData.resultId = raceResult.resultId;
            this._ghostData.raceResultSchemaVersion = 1;
            this._ghostData.raceRecordVersion = 1;
            this._ghostData.localValidationStatus = raceResult.localValidation?.status || 'unverified';
            this._ghostData.evidenceFingerprint = raceResult.evidence?.fingerprint || null;
          }
        } catch {}
      }

      this._raceEvidence = createLocalRaceEvidenceState();
    }

    this._raceResultSeenHistory = history.length;
  }

  update(time, delta) {
    try { this._sampleRaceRecordEvidence(time); } catch {}
    const result = super.update(time, delta);
    try { this._captureNewRaceResults(); } catch {}
    return result;
  }
}
