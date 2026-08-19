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
    if (brakePressed && this._brakeCycleForwardLock) {
      let vx = Number(body.body.velocity.x || 0);
      let vy = Number(body.body.velocity.y || 0);
      let fwdAfter = vx * fx + vy * fy;

      // Never cross through zero into reverse during the same brake press.
      if (fwdAfter < 0) {
        body.body.velocity.x -= fx * fwdAfter;
        body.body.velocity.y -= fy * fwdAfter;
      }

      vx = Number(body.body.velocity.x || 0);
      vy = Number(body.body.velocity.y || 0);
      fwdAfter = vx * fx + vy * fy;

      const rightX = -fy;
      const rightY = fx;
      let lateral = vx * rightX + vy * rightY;
      let totalSpeed = Math.hypot(vx, vy);

      // Below roughly 3 km/h, lateral slip should collapse quickly while the driver
      // is still holding the brake. This removes the exaggerated sideways creep
      // without changing useful-speed drift or cornering behaviour.
      const lowSpeedSettle = 16.2; // ~3.0 km/h at the HUD conversion (0.185).
      if (totalSpeed <= lowSpeedSettle && Math.abs(lateral) > 0.01) {
        const lateralKeep = Math.exp(-16 * dt);
        lateral *= lateralKeep;
        body.body.velocity.x = fx * Math.max(0, fwdAfter) + rightX * lateral;
        body.body.velocity.y = fy * Math.max(0, fwdAfter) + rightY * lateral;
      }

      vx = Number(body.body.velocity.x || 0);
      vy = Number(body.body.velocity.y || 0);
      fwdAfter = vx * fx + vy * fy;
      totalSpeed = Math.hypot(vx, vy);

      // HUD rounds 0.5..1.49 km/h to "001". At these speeds the car should feel
      // effectively parked once a forward braking cycle has completed, not slide
      // sideways for metres. 8.1 px/s is about 1.5 km/h, the top of that display band.
      if (Math.abs(fwdAfter) <= 5.5 && totalSpeed <= 8.1) {
        body.setVelocity?.(0, 0);
        if (body.body?.velocity) {
          body.body.velocity.x = 0;
          body.body.velocity.y = 0;
        }
      }
    }
  }
}
