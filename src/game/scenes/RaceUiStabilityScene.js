import { RaceScene as CurrentRaceScene } from './RaceSurfaceProfileScene.js';

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const scale = this.scale;
    const originalOn = scale.on;
    const capturedResize = [];

    // RaceScene registers several independent resize callbacks. On iOS/PWA a burst
    // of resize events can make them rebuild UI repeatedly in the same moment.
    // Capture them and replay them once, after the viewport settles.
    scale.on = function(event, fn, context, ...rest) {
      if (event === 'resize' && typeof fn === 'function') {
        capturedResize.push({ fn, context });
        return this;
      }
      return originalOn.call(this, event, fn, context, ...rest);
    };

    let result;
    try {
      result = super.create(data);
    } finally {
      scale.on = originalOn;
    }

    this._raceResizeCaptured = capturedResize;
    this._raceResizeW = Math.round(this.scale.width || 0);
    this._raceResizeH = Math.round(this.scale.height || 0);
    this._raceResizeTimer = null;

    this._onStableRaceResize = (gameSize, ...args) => {
      const w = Math.round(Number(gameSize?.width ?? this.scale.width) || 0);
      const h = Math.round(Number(gameSize?.height ?? this.scale.height) || 0);
      if (Math.abs(w - this._raceResizeW) <= 2 && Math.abs(h - this._raceResizeH) <= 2) return;
      this._raceResizeW = w;
      this._raceResizeH = h;

      try { this._raceResizeTimer?.remove?.(false); } catch (_) {}
      this._raceResizeTimer = this.time.delayedCall(90, () => {
        if (!this.sys?.isActive?.()) return;
        for (const entry of this._raceResizeCaptured || []) {
          try { entry.fn.call(entry.context ?? this, gameSize, ...args); } catch (_) {}
        }
        this._hideLegacyPedalVisuals?.();
      });
    };

    this.scale.on('resize', this._onStableRaceResize, this);
    this._hideLegacyPedalVisuals?.();

    this.events.once('shutdown', () => {
      this.scale.off('resize', this._onStableRaceResize, this);
      try { this._raceResizeTimer?.remove?.(false); } catch (_) {}
      this._raceResizeTimer = null;
      this._raceResizeCaptured = [];
    });

    return result;
  }

  createTouchControls() {
    const state = super.createTouchControls();

    // The current game has its commercial GAS / FRENO artwork layered elsewhere.
    // The old touch system still recreated its obsolete rectangles/text on resize,
    // which is exactly the 'deleted action zones' that could flash on screen.
    this._hideLegacyPedalVisuals = () => {
      const list = this.touchUI?.list;
      if (!Array.isArray(list)) return;
      // Legacy order: joystick base, joystick knob, gas bg, gas text, brake bg, brake text.
      for (let i = 2; i <= 5; i++) {
        try { list[i]?.setVisible?.(false); } catch (_) {}
      }
    };

    this._hideLegacyPedalVisuals();
    return state;
  }
}
