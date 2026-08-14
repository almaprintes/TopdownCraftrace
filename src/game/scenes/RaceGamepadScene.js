import { RaceScene as TouchRaceScene } from './RaceControlSchemeScene.js';

const SETTINGS_KEY = 'tdr2:settings';

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
  catch (_) { return {}; }
}

function selectedMode() {
  return readSettings()?.controls?.steeringMode || 'stick';
}

function firstPad() {
  try { return Array.from(navigator.getGamepads?.() || []).find(Boolean) || null; }
  catch (_) { return null; }
}

// Same idea as the on-screen joystick: circular deadzone, preserve direction,
// then remap the usable radius back to 0..1. This avoids diagonal distortion.
function stickVector(rawX, rawY, dz = 0.12) {
  let x = Math.max(-1, Math.min(1, Number(rawX) || 0));
  let y = Math.max(-1, Math.min(1, Number(rawY) || 0));
  const mag = Math.hypot(x, y);
  if (mag <= dz) return { x: 0, y: 0, mag: 0 };

  const clampedMag = Math.min(1, mag);
  const usable = (clampedMag - dz) / (1 - dz);
  const nx = x / mag;
  const ny = y / mag;
  return { x: nx * usable, y: ny * usable, mag: usable };
}

function triggerValue(button) {
  if (!button) return 0;
  const v = Number(button.value);
  if (Number.isFinite(v)) return Math.max(0, Math.min(1, v));
  return button.pressed ? 1 : 0;
}

export class RaceScene extends TouchRaceScene {
  create(data) {
    const wanted = selectedMode();
    this._tdrGamepadMode = wanted === 'gamepad';

    // Reuse the button-mode touch state because it creates no analogue joystick.
    let originalRaw = null;
    if (this._tdrGamepadMode) {
      try {
        originalRaw = localStorage.getItem(SETTINGS_KEY);
        const temp = originalRaw ? JSON.parse(originalRaw) : {};
        temp.controls = { ...(temp.controls || {}), steeringMode: 'buttons', scheme: 'gamepad' };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(temp));
      } catch (_) {}
    }

    let result;
    try {
      result = super.create(data);
    } finally {
      if (this._tdrGamepadMode) {
        try {
          if (originalRaw == null) localStorage.removeItem(SETTINGS_KEY);
          else localStorage.setItem(SETTINGS_KEY, originalRaw);
        } catch (_) {}
      }
    }

    if (!this._tdrGamepadMode) return result;

    this._tdrSteeringMode = 'gamepad';
    try { this._tdrSteerButtons?.destroy(true); } catch (_) {}
    this._tdrSteerButtons = null;
    this._tdrLeftButton = null;
    this._tdrRightButton = null;

    this._tdrGamepadStyle = document.createElement('style');
    this._tdrGamepadStyle.textContent = '#tdr-race-controls{display:none!important}';
    document.head.appendChild(this._tdrGamepadStyle);

    this._tdrGamepadWasConnected = false;
    this.events.once('shutdown', () => {
      try { this._tdrGamepadStyle?.remove?.(); } catch (_) {}
      this._tdrGamepadStyle = null;
    });

    return result;
  }

  update(time, delta) {
    if (!this._tdrGamepadMode) {
      super.update(time, delta);
      return;
    }

    const pad = firstPad();
    const touch = this.touch;

    if (touch) {
      if (pad) {
        // Analogue stick: mirror the on-screen joystick one-for-one. It keeps
        // the full X/Y vector and therefore the same absolute-stick behaviour.
        const v = stickVector(pad.axes?.[0] || 0, pad.axes?.[1] || 0);

        const dLeft = !!pad.buttons?.[14]?.pressed;
        const dRight = !!pad.buttons?.[15]?.pressed;
        const dpadSteer = dLeft && !dRight ? -1 : dRight && !dLeft ? 1 : 0;

        if (v.mag >= 0.02) {
          touch.stickX = v.x;
          touch.stickY = v.y;
          touch.steer = v.x;
          touch.leftActive = true;
          touch.buttonSteer = 0;
          touch.targetAngle = Math.atan2(v.y, v.x) - (Math.PI / 2);
        } else if (dpadSteer !== 0) {
          // D-pad is NOT a virtual analogue stick. Left/right means "keep
          // steering left/right" relative to the car, so it must never create
          // a world-space targetAngle. This lets the car turn continuously
          // through 360 degrees while the direction is held.
          touch.stickX = 0;
          touch.stickY = 0;
          touch.targetAngle = null;
          touch.steer = dpadSteer;
          touch.leftActive = true;
          touch.buttonSteer = 0;
        } else {
          touch.stickX = 0;
          touch.stickY = 0;
          touch.targetAngle = null;
          touch.steer = 0;
          touch.leftActive = false;
          touch.buttonSteer = 0;
        }

        // Standard browser mapping for DualShock 4 / DualSense:
        // L2 = 6, R2 = 7.
        touch.throttle = triggerValue(pad.buttons?.[7]);
        touch.brake = triggerValue(pad.buttons?.[6]);
        touch.rightThrottle = touch.throttle > 0.05;
        touch.rightBrake = touch.brake > 0.05;
        this._tdrGamepadWasConnected = true;
      } else {
        touch.stickX = 0;
        touch.stickY = 0;
        touch.targetAngle = null;
        touch.steer = 0;
        touch.leftActive = false;
        touch.buttonSteer = 0;
        touch.throttle = 0;
        touch.brake = 0;
        touch.rightThrottle = false;
        touch.rightBrake = false;
      }
    }

    super.update(time, delta);
  }
}
