import { RaceScene as ReplayControlsScene } from './RaceReplayControlsScene.js';
import { RaceScene as VideoRaceScene } from './RaceVideoPreferencesScene.js';

export class RaceScene extends ReplayControlsScene {
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

  _hideResidualHudForReplay() {
    if (this._replayResidualHudHidden) return;
    this._replayResidualHudHidden = [];

    // Some legacy HUD pieces are standalone scene objects rather than children
    // of this.hud / this.minimapSportFrame. During a moving replay camera they
    // therefore appear only when the camera passes over their world coordinates.
    // Hide any fixed-screen or very-high-depth object, while preserving the
    // world, track and replay car.
    const objects = Array.isArray(this.children?.list) ? this.children.list : [];
    for (const obj of objects) {
      if (!obj || obj === this._ghostSprite || obj === this.carBody) continue;
      if (obj === this._replayUi || obj === this.carRig) continue;

      const depth = Number(obj.depth ?? 0);
      const sx = Number(obj.scrollFactorX ?? 1);
      const sy = Number(obj.scrollFactorY ?? 1);
      const fixedScreen = sx === 0 || sy === 0;
      const uiDepth = depth >= 1000;

      if (!fixedScreen && !uiDepth) continue;
      this._replayResidualHudHidden.push([obj, obj.visible !== false]);
      try { obj.setVisible(false); } catch (_) {}
    }
  }

  _restoreResidualHudAfterReplay() {
    const list = this._replayResidualHudHidden || [];
    this._replayResidualHudHidden = null;
    for (const [obj, wasVisible] of list) {
      try { if (obj?.scene) obj.setVisible(wasVisible); } catch (_) {}
    }
  }

  _enterReplay() {
    const result = super._enterReplay();
    if (this._replayActive) {
      this._primeFullTrackForReplay();
      this._hideResidualHudForReplay();
    }
    return result;
  }

  _startReplayExport() {
    this._primeFullTrackForReplay();
    this._hideResidualHudForReplay();
    return super._startReplayExport();
  }

  _exitReplay() {
    const previous = this._replayCullPrevious;
    this._restoreResidualHudAfterReplay();
    const result = super._exitReplay();
    if (previous !== undefined) {
      this._cullEnabled = previous;
      this._replayCullPrevious = undefined;
    }
    return result;
  }
}
