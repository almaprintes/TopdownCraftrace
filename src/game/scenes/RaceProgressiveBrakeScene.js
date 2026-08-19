import { RaceScene as CurrentRaceScene } from './RaceCoastInertiaScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function smoothstep01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

// Progressive brake layer.
// Keeps steering, coasting and off-track physics untouched.
// During forward braking we control TOTAL longitudinal deceleration, compensating
// the base brake + passive drag so they cannot stack into an unrealistically hard stop.
//
// Global brake baseline:
// - forward braking is now 2x stronger for every car than the previous baseline;
// - the existing progressive build-up and mass relationship are preserved;
// - this gives us a firmer base before testing any future analog/progressive pedal input.
//
// Vehicle mass:
// - FORGE Colossus (4200 kg) is the braking reference;
// - lighter cars get progressively more deceleration from the same pedal pressure;
// - the relationship is intentionally softened (fourth-root) so mass matters without
//   making lightweight cars stop unrealistically short.
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

  _massBrakeFactor() {
    const spec = CAR_SPECS[this.carId] || CAR_SPECS.stock || {};
    const massKg = Math.max(500, Number(spec.massKg || 4200));
    const colossusMassKg = 4200;
    return clamp(Math.pow(colossusMassKg / massKg, 0.25), 1.0, 1.50);
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
    // 1) Progressive forward braking, TOTAL decel controlled
    // ---------------------------------------------------------
    if (brakePressed && fwdBefore > 2) {
      const brakeForce = Math.max(0, Number(this.brakeForce || 0));
      if (brakeForce > 0) {
        // Preserve the same pedal build-up, but with a 2x global brake baseline.
        const build = smoothstep01(this._brakeHoldSec / 2.2);
        const baseStrength = 0.08 + (0.14 * build);
        const desiredStrength = baseStrength * this._massBrakeFactor();

        // Target longitudinal speed for THIS frame. We control total deceleration
        // and explicitly double the previous braking baseline without touching
        // steering, grip, coasting, track logic or reverse behaviour.
        const desiredLoss = brakeForce * desiredStrength * dt * 2;
        const targetFwd = Math.max(0, fwdBefore - desiredLoss);

        const vx = Number(body.body.velocity.x || 0);
        const vy = Number(body.body.velocity.y || 0);
        const fwdAfter = vx * fx + vy * fy;

        if (fwdAfter < targetFwd) {
          const restore = targetFwd - fwdAfter;
          body.body.velocity.x += fx * restore;
          body.body.velocity.y += fy * restore;
        }
      }
    }

    // ---------------------------------------------------------
    // 2) Brake-to-stop, release, then reverse
    // ---------------------------------------------------------
    // During a press that started while moving forward, prevent the base controller
    // from crossing through zero into reverse. Preserve lateral velocity while the
    // car is still genuinely moving, but once it has reached near-rest remove the
    // tiny residual vector too; otherwise the HUD can show 000 km/h while the body
    // keeps creeping sideways for several seconds.
    if (brakePressed && this._brakeCycleForwardLock) {
      let vx = Number(body.body.velocity.x || 0);
      let vy = Number(body.body.velocity.y || 0);
      let fwdAfter = vx * fx + vy * fy;

      if (fwdAfter < 0) {
        body.body.velocity.x -= fx * fwdAfter;
        body.body.velocity.y -= fy * fwdAfter;
      }

      vx = Number(body.body.velocity.x || 0);
      vy = Number(body.body.velocity.y || 0);
      fwdAfter = vx * fx + vy * fy;
      const totalSpeed = Math.hypot(vx, vy);

      // True resting snap: only at walking-crawl physics speeds and only during
      // the same brake press that brought the car down from forward motion.
      // This does not touch normal cornering/drift and cannot block reverse,
      // because reverse already requires releasing and pressing the brake again.
      if (Math.abs(fwdAfter) <= 2.5 && totalSpeed <= 4) {
        body.setVelocity?.(0, 0);
        if (body.body?.velocity) {
          body.body.velocity.x = 0;
          body.body.velocity.y = 0;
        }
      }
    }
  }
}
