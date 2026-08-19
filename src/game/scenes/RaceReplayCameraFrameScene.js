import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifePaddockFinishScene.js';

// Replay camera framing guard.
// Saved ghost samples are correct world-space transforms; the visual framing issue came
// from the race camera still being clamped to world bounds and following too lazily in
// tight direction changes. Keep replay cinematic, but never allow the car to leave frame.
export class RaceScene extends CurrentRaceScene {
  _setReplayCamera(mode) {
    const cam = this.cameras?.main;
    const ghost = this._ghostSprite;

    if (cam && this._replayActive) {
      if (this._replayPreviousUseBounds === undefined) {
        this._replayPreviousUseBounds = cam.useBounds;
      }
      cam.useBounds = false;
    }

    const result = super._setReplayCamera?.(mode);

    if (!cam || !ghost?.scene || !this._replayActive) return result;

    // Snap once when changing replay view so an old camera error cannot carry over,
    // then retain a small amount of smoothing while following the recorded car.
    try { cam.centerOn(ghost.x, ghost.y); } catch (_) {}
    try { cam.stopFollow(); } catch (_) {}

    const follow = mode === 'follow';
    const lerp = follow ? 0.28 : 0.18;
    try { cam.startFollow(ghost, true, lerp, lerp); } catch (_) {}

    return result;
  }

  _restartReplay() {
    const result = super._restartReplay?.();
    const first = this._sampleGhostAt?.(0);
    const ghost = this._ghostSprite;
    const cam = this.cameras?.main;

    if (first && ghost?.scene) {
      ghost.setPosition(first.x, first.y);
      ghost.rotation = first.r + Number(this._carVisualRotOffset || 0);
      try { cam?.centerOn?.(first.x, first.y); } catch (_) {}
    }

    return result;
  }

  _exitReplay() {
    const cam = this.cameras?.main;
    const previousUseBounds = this._replayPreviousUseBounds;

    // Restore normal race-camera constraints before the parent resumes following
    // the player's physics body.
    if (cam && previousUseBounds !== undefined) {
      cam.useBounds = previousUseBounds;
    }
    this._replayPreviousUseBounds = undefined;

    return super._exitReplay?.();
  }
}
