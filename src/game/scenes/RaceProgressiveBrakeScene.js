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
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._brakeHoldSec = 0;
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

    if (brakePressed) this._brakeHoldSec += dt;
    else this._brakeHoldSec = 0;

    // Longitudinal speed before the base physics runs. We only soften braking while
    // genuinely moving forward; near zero speed the original reverse behaviour remains.
    const fxBefore = Math.cos(rotBefore);
    const fyBefore = Math.sin(rotBefore);
    const fwdBefore = vxBefore * fxBefore + vyBefore * fyBefore;

    super.update(time, delta);

    const body = this.carBody;
    if (!brakePressed || !body?.scene || !body.body?.velocity || fwdBefore <= 12) return;

    const brakeForce = Math.max(0, Number(this.brakeForce || 0));
    if (brakeForce <= 0) return;

    // Pedal-pressure build-up:
    // quick taps = gentle speed trim;
    // sustained braking = progressively stronger, but still much less abrupt
    // than the old full-force brake.
    const build = smoothstep01(this._brakeHoldSec / 1.8);
    const desiredStrength = 0.12 + (0.30 * build); // 12% -> 42%

    // The base physics already applied 100% brakeForce. Restore the excess impulse
    // along the car's forward axis, leaving lateral grip/steering calculations intact.
    const rot = Number(body.rotation || rotBefore);
    const fx = Math.cos(rot);
    const fy = Math.sin(rot);
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
