import { RaceScene as GhostRaceScene } from './RaceGhostModeScene.js';
import { RaceScene as VideoRaceScene } from './RaceVideoPreferencesScene.js';

export class RaceScene extends GhostRaceScene {
  _primeFullTrackForReplay() {
    if (!this.track?.geom?.cells) return;

    if (this._replayCullPrevious === undefined) {
      this._replayCullPrevious = this._cullEnabled;
    }
    this._cullEnabled = false;

    // The normal race update owns the asphalt-cell renderer. Replay intentionally
    // skips that update, so previously only the cells around the parked player
    // car remained visible. Run one neutral render/update pass with culling OFF
    // to materialise every real asphalt cell before the replay camera moves.
    const touch = this.touch;
    const savedTouch = touch ? {
      steer: touch.steer,
      throttle: touch.throttle,
      brake: touch.brake,
      stickX: touch.stickX,
      stickY: touch.stickY,
      buttonSteer: touch.buttonSteer,
      leftActive: touch.leftActive
    } : null;

    if (touch) {
      touch.steer = 0;
      touch.throttle = 0;
      touch.brake = 0;
      touch.stickX = 0;
      touch.stickY = 0;
      touch.buttonSteer = 0;
      touch.leftActive = false;
    }

    try {
      this.carBody?.setVelocity?.(0, 0);
      this.carBody?.setAngularVelocity?.(0);
      VideoRaceScene.prototype.update.call(this, performance.now(), 0);
    } catch (e) {
      try { console.warn('[TDR2 replay] full-track prime failed', e); } catch (_) {}
    } finally {
      if (touch && savedTouch) Object.assign(touch, savedTouch);
      try {
        this.carBody?.setVelocity?.(0, 0);
        this.carBody?.setAngularVelocity?.(0);
      } catch (_) {}
    }
  }

  _enterReplay() {
    const result = super._enterReplay();
    if (this._replayActive) this._primeFullTrackForReplay();
    return result;
  }

  _startReplayExport() {
    // Re-prime immediately before capture as an extra guarantee that the clean
    // export never inherits a partially culled asphalt set from normal play.
    this._primeFullTrackForReplay();
    return super._startReplayExport();
  }

  _exitReplay() {
    const previous = this._replayCullPrevious;
    const result = super._exitReplay();
    if (previous !== undefined) {
      this._cullEnabled = previous;
      this._replayCullPrevious = undefined;
    }
    return result;
  }
}
