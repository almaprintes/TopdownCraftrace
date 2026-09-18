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
      if (!gamepadModeSelected()) return;
      const w = Number(this.scale?.width) || 0, h = Number(this.scale?.height) || 0;
      if (!w || !h) return;

      try {
        const seen = new Set();
        const visit = (obj) => {
          if (!obj || seen.has(obj)) return;
          seen.add(obj);
          if (obj !== this.touchUI) {
            const sx = Number(obj.scrollFactorX), sy = Number(obj.scrollFactorY);
            const x = Number(obj.x), y = Number(obj.y);
            const type = String(obj.type || obj.constructor?.name || '').toLowerCase();
            if (sx === 0 && sy === 0 && Number.isFinite(x) && Number.isFinite(y) && x < w * .38 && y > h * .45 && /(graphics|image|sprite|ellipse|circle|arc|rectangle|container)/.test(type)) {
              try { obj.setVisible?.(false); obj.disableInteractive?.(); } catch (_) {}
            }
          }
          if (Array.isArray(obj.list)) for (const child of obj.list) visit(child);
        };
        for (const obj of this.children?.list || []) visit(obj);
      } catch (_) {}

      try {
        const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
        for (const el of document.body.querySelectorAll('*')) {
          if (el === this.game?.canvas || el.id === 'app' || el.id === 'tdr-race-controls') continue;
          const sig = `${el.id || ''} ${el.className || ''} ${el.dataset?.role || ''} ${el.dataset?.control || ''}`.toLowerCase();
          if (/delta|pause|pausa|gamepad-pedals|ignition|startup|rotate/.test(sig)) continue;
          const r = el.getBoundingClientRect?.();
          if (!r || r.width < 18 || r.height < 18 || r.width > vw * .38 || r.height > vh * .48) continue;
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (cx < vw * .38 && cy > vh * .45) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
          }
        }
      } catch (_) {}
    };
    this._hideLegacyPedalVisuals();
    this._hideResidualGamepadSteeringVisual();
    return state;
  }

  update(time, delta) {
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
