import { RaceScene as CurrentRaceScene } from './RaceCoastInertiaScene.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function smoothstep01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

// Progressive brake layer.
// Keeps steering, coasting and off-track physics untouched.
// The base scene still performs its normal brake calculation; this layer restores
// part of that longitudinal impulse so braking builds progressively instead of
// behaving like an on/off switch.
//
// Reverse gate:
// - if a brake press starts while the car is moving forward, that whole press is
//   BRAKE ONLY and cannot engage reverse, even after speed reaches zero;
// - the driver must release and press brake again while stopped to request reverse.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._brakeHoldSec = 0;
    this._brakeWasPressed = false;
    this._brakeCycleForwardLock = false;
  }

  update(time, delta) {
    const bodyBefore = this.carBody;
    const vxBefore = Number(bodyBefore?.body?.velocity?.x || 0);
    const vyBefore = Number(bodyBefore?.body?.velocity?.y || 0);
    const rotBefore = Number(bodyBefore?.rotation || 0);

    const t = this.touch || {};
    const k = this.keys || {};
    const brakePressed =
      Number(t.brake || 0) > 0.5 ||
      !!k.down?.isDown ||
      !!k.down2?.isDown;

    const dt = clamp(Number(delta || 16.67) / 1000, 0.001, 0.05);

    const fxBefore = Math.cos(rotBefore);
    const fyBefore = Math.sin(rotBefore);
    const fwdBefore = vxBefore * fxBefore + vyBefore * fyBefore;

    // Rising edge of the brake pedal decides what this whole press means.
    // If it begins while moving forward, reverse is locked until the pedal is released.
    if (brakePressed && !this._brakeWasPressed) {
      this._brakeCycleForwardLock = fwdBefore > 4;
      this._brakeHoldSec = 0;
    }

    if (brakePressed) this._brakeHoldSec += dt;
    else {
      this._brakeHoldSec = 0;
      this._brakeCycleForwardLock = false;
    }

    this._brakeWasPressed = brakePressed;

    super.update(time, delta);

    const body = this.carBody;
    if (!body?.scene || !body.body?.velocity) return;

    const rot = Number(body.rotation || rotBefore);
    const fx = Math.cos(rot);
    const fy = Math.sin(rot);

    // ---------------------------------------------------------
    // 1) Progressive forward braking
    // ---------------------------------------------------------
    if (brakePressed && fwdBefore > 12) {
      const brakeForce = Math.max(0, Number(this.brakeForce || 0));
      if (brakeForce > 0) {
        // Pedal-pressure build-up:
        // quick taps = gentle speed trim;
        // sustained braking = progressively stronger, but still much less abrupt
        // than the old full-force brake.
        const build = smoothstep01(this._brakeHoldSec / 1.8);
        const desiredStrength = 0.12 + (0.30 * build); // 12% -> 42%

        // The base physics already applied 100% brakeForce. Restore the excess impulse
        // along the car's forward axis, leaving lateral grip/steering calculations intact.
        const restoreImpulse = brakeForce * (1 - desiredStrength) * dt;

        // Never restore enough to accelerate past the pre-brake longitudinal speed.
        const vx = Number(body.body.velocity.x || 0);
        const vy = Number(body.body.velocity.y || 0);
        const fwdAfter = vx * fx + vy * fy;
        const maxRestore = Math.max(0, fwdBefore - fwdAfter);
        const restore = Math.min(restoreImpulse, maxRestore);

        body.body.velocity.x += fx * restore;
        body.body.velocity.y += fy * restore;
      }
    }

    // ---------------------------------------------------------
    // 2) Brake-to-stop, release, then reverse
    // ---------------------------------------------------------
    // During a press that started while moving forward, prevent the base controller
    // from crossing through zero into reverse. Preserve any lateral component so this
    // does not interfere with steering/grip while the car finishes slowing down.
    if (brakePressed && this._brakeCycleForwardLock) {
      const vx = Number(body.body.velocity.x || 0);
      const vy = Number(body.body.velocity.y || 0);
      const fwdAfter = vx * fx + vy * fy;

      if (fwdAfter < 0) {
        body.body.velocity.x -= fx * fwdAfter;
        body.body.velocity.y -= fy * fwdAfter;
      }
    }
  }
}
