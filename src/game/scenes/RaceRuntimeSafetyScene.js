import { RaceScene as CurrentRaceScene } from './RaceSurfaceProfileScene.js';

export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._tdrPrevRuntimePos = null;
    this._tdrStallMs = 0;
  }

  create(data) {
    const result = super.create(data);
    this._tdrPrevRuntimePos = null;
    this._tdrStallMs = 0;
    this._tdrEnsurePlayerBodyActive();
    this.time?.delayedCall?.(250, () => this._tdrEnsurePlayerBodyActive());
    this.time?.delayedCall?.(1200, () => this._tdrEnsurePlayerBodyActive());
    return result;
  }

  _tdrEnsurePlayerBodyActive() {
    const sprite = this.carBody || this.car;
    const body = sprite?.body;
    if (!sprite || !body) return;

    try { sprite.setActive?.(true); } catch (_) {}
    try { body.enable = true; } catch (_) {}
    try { body.moves = true; } catch (_) {}
    try { body.immovable = false; } catch (_) {}
    try { body.allowGravity = false; } catch (_) {}
  }

  update(time, delta) {
    super.update(time, delta);

    const sprite = this.carBody || this.car;
    const body = sprite?.body;
    if (!sprite || !body) return;

    const raceLive = !!this._raceStarted && !this._pauseMenuOpen && !this._sessionReportOpen;
    if (!raceLive) {
      this._tdrPrevRuntimePos = { x: Number(sprite.x || 0), y: Number(sprite.y || 0) };
      this._tdrStallMs = 0;
      return;
    }

    // A race can occasionally leave Arcade Physics non-integrating while game
    // logic still writes velocity. Keep the player body explicitly movable.
    this._tdrEnsurePlayerBodyActive();
    try {
      if (this.physics?.world?.isPaused) this.physics.world.resume();
    } catch (_) {}

    const x = Number(sprite.x || 0), y = Number(sprite.y || 0);
    const vx = Number(body.velocity?.x || 0), vy = Number(body.velocity?.y || 0);
    const speed = Math.hypot(vx, vy);
    const prev = this._tdrPrevRuntimePos;

    if (prev) {
      const moved = Math.hypot(x - prev.x, y - prev.y);
      if (speed > 20 && moved < 0.02) this._tdrStallMs += Math.max(0, Number(delta || 0));
      else this._tdrStallMs = 0;

      if (this._tdrStallMs > 120) {
        this._tdrEnsurePlayerBodyActive();
        try { this.physics?.world?.resume?.(); } catch (_) {}
        this._tdrStallMs = 0;
      }
    }

    this._tdrPrevRuntimePos = { x, y };
  }
}
