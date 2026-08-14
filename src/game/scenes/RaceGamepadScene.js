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

function deadzone(v, dz = 0.12) {
  const n = Math.max(-1, Math.min(1, Number(v) || 0));
  const a = Math.abs(n);
  if (a <= dz) return 0;
  const normalized = (a - dz) / (1 - dz);
  return Math.sign(n) * Math.pow(normalized, 1.35);
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
        let steer = deadzone(pad.axes?.[0] || 0);

        // Standard mapping: D-pad left/right are buttons 14/15.
        if (Math.abs(steer) < 0.02) {
          const dLeft = !!pad.buttons?.[14]?.pressed;
          const dRight = !!pad.buttons?.[15]?.pressed;
          steer = dLeft && !dRight ? -1 : dRight && !dLeft ? 1 : 0;
        }

        // IMPORTANT: the legacy touch controller interprets stickX/stickY as an
        // ABSOLUTE world-space direction. Feeding the gamepad axis into stickX
        // made the car rotate toward a fixed world angle and then stop turning.
        // Gamepad steering is relative car steering, so only feed touch.steer;
        // keep the absolute-stick vector neutral. RaceBicycleHandlingScene reads
        // touch.steer continuously and therefore keeps turning while the player
        // holds the stick left/right, exactly like a real steering control.
        touch.stickX = 0;
        touch.stickY = 0;
        touch.targetAngle = null;
        touch.steer = steer;
        touch.buttonSteer = 0;

        // Standard mapping used by DualShock 4 / DualSense in browsers:
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
