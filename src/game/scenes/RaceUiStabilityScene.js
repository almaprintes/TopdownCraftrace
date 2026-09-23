import { RaceScene as CurrentRaceScene } from './RaceRuntimeSafetyScene.js';

const SETTINGS_KEY = 'tdr2:settings';
const TRIGGER_DEADZONE = 0.025;

function gamepadModeSelected() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')?.controls?.steeringMode === 'gamepad'; }
  catch (_) { return false; }
}

function firstPad() {
  try { return Array.from(navigator.getGamepads?.() || []).find((p) => p && p.connected !== false) || null; }
  catch (_) { return null; }
}

function triggerValue(button) {
  if (!button) return 0;
  const raw = Number(button.value);
  const value = Number.isFinite(raw) ? raw : (button.pressed ? 1 : 0);
  if (value <= TRIGGER_DEADZONE) return 0;
  return Math.max(0, Math.min(1, (value - TRIGGER_DEADZONE) / (1 - TRIGGER_DEADZONE)));
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const scale = this.scale;
    const originalOn = scale.on;
    const capturedResize = [];

    scale.on = function(event, fn, context, ...rest) {
      if (event === 'resize' && typeof fn === 'function') {
        capturedResize.push({ fn, context });
        return this;
      }
      return originalOn.call(this, event, fn, context, ...rest);
    };

    let result;
    try { result = super.create(data); }
    finally { scale.on = originalOn; }

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
        this._hideResidualGamepadSteeringVisual?.();
      });
    };

    this.scale.on('resize', this._onStableRaceResize, this);
    this._hideLegacyPedalVisuals?.();
    this._hideResidualGamepadSteeringVisual?.();

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
    this._hideLegacyPedalVisuals = () => {
      const list = this.touchUI?.list;
      if (!Array.isArray(list)) return;
      if (gamepadModeSelected()) {
        try { this.touchUI?.setVisible?.(false); } catch (_) {}
        for (const obj of list) {
          try { obj?.setVisible?.(false); obj?.disableInteractive?.(); } catch (_) {}
        }
        return;
      }
      try { this.touchUI?.setVisible?.(true); } catch (_) {}
      for (let i = 2; i <= 5; i++) {
        try { list[i]?.setVisible?.(false); } catch (_) {}
      }
    };
    this._hideResidualGamepadSteeringVisual = () => {
      // Residual gamepad cleanup must never scan/hide arbitrary Phaser or DOM
      // controls. RaceGamepadScene owns gamepad-only teardown at source.
      return;
    };
    this._hideLegacyPedalVisuals();
    this._hideResidualGamepadSteeringVisual();
    return state;
  }

  update(time, delta) {
    // DEV 1.1.33 A/B: Android touch mode uses the Beta-1 behaviour of this layer:
    // no gamepad polling/wrapping in the race frame loop.
    if (/Android/i.test(String(navigator?.userAgent || '')) && !gamepadModeSelected()) {
      return super.update(time, delta);
    }
    if (!gamepadModeSelected()) {
      super.update(time, delta);
      return;
    }

    const pad = firstPad();
    const gas = triggerValue(pad?.buttons?.[7]);
    const brake = triggerValue(pad?.buttons?.[6]);
    const touch = this.touch;
    const originalAccel = this.accel;
    const originalBrakeForce = this.brakeForce;
    const originalThrottle = touch?.throttle;
    const originalBrake = touch?.brake;

    if (touch && pad) {
      touch.throttle = gas > 0 ? 1 : 0;
      touch.brake = brake > 0 ? 1 : 0;
      touch.rightThrottle = gas > 0;
      touch.rightBrake = brake > 0;
      if (Number.isFinite(originalAccel)) this.accel = originalAccel * gas;
      if (Number.isFinite(originalBrakeForce)) this.brakeForce = originalBrakeForce * brake;
    }

    try { super.update(time, delta); }
    finally {
      if (Number.isFinite(originalAccel)) this.accel = originalAccel;
      if (Number.isFinite(originalBrakeForce)) this.brakeForce = originalBrakeForce;
      if (touch && pad) {
        touch.throttle = gas;
        touch.brake = brake;
        touch.rightThrottle = gas > 0;
        touch.rightBrake = brake > 0;
      } else if (touch) {
        touch.throttle = originalThrottle;
        touch.brake = originalBrake;
      }
    }

    this._hideLegacyPedalVisuals?.();
    this._hideResidualGamepadSteeringVisual?.();
  }
}
