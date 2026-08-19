import { RaceScene as CurrentRaceScene } from './RaceVisualRearPivotScene.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function smoothstep01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

// High-inertia coasting layer.
// At racing speed the car keeps useful momentum, but rolling resistance and
// driveline drag progressively return as speed falls. This avoids the old
// "hovercraft" effect where a car at 5-15 km/h could coast for many seconds.
export class RaceScene extends CurrentRaceScene {
  update(time, delta) {
    super.update(time, delta);

    const body = this.carBody;
    if (!body?.scene || !body.body?.velocity) return;

    const t = this.touch || {};
    const k = this.keys || {};

    const throttle =
      Number(t.throttle || 0) > 0.5 ||
      !!k.up?.isDown ||
      !!k.up2?.isDown;

    const brake =
      Number(t.brake || 0) > 0.5 ||
      !!k.down?.isDown ||
      !!k.down2?.isDown;

    // Only alter true free-rolling on asphalt/track.
    // Braking, accelerating, grass and off-track behaviour stay exactly as before.
    if (throttle || brake || this._onTrack === false || this._surface === 'GRASS' || this._surface === 'OFF') return;

    const dt = clamp(Number(delta || 16.67) / 1000, 0.001, 0.05);
    const linearDrag = Math.max(0, Number(this.linearDrag || 0));
    const engineBrake = Math.max(0, Number(this.engineBrake || 0));
    const vx0 = Number(body.body.velocity.x || 0);
    const vy0 = Number(body.body.velocity.y || 0);
    const kmh = Math.hypot(vx0, vy0) * 0.185;

    // Full long-coast compensation is useful at racing speed, but must fade away
    // at parking/crawl speeds. Below 15 km/h we keep NONE of the extra inertia;
    // from 15 to 35 km/h it blends smoothly back to the established high-speed feel.
    const coastBlend = smoothstep01((kmh - 15) / 20);

    // Base RaceScene applies exp(-linearDrag * dt * 60).
    // High speed keeps the previous effective scale (~3.5); low speed receives
    // the full base rolling resistance (scale 60), with a smooth transition.
    const baseDragScale = 60;
    const highSpeedCoastScale = 3.5;
    const effectiveCoastScale = baseDragScale + (highSpeedCoastScale - baseDragScale) * coastBlend;
    if (linearDrag > 0 && coastBlend > 0) {
      const compensation = Math.exp(linearDrag * dt * (baseDragScale - effectiveCoastScale));
      body.body.velocity.x *= compensation;
      body.body.velocity.y *= compensation;
    }

    // Likewise, restore engine braking only in proportion to racing-speed coasting.
    // At <=15 km/h the base driveline resistance remains untouched so the car
    // naturally settles instead of gliding indefinitely.
    if (engineBrake > 0 && coastBlend > 0) {
      const rot = Number(body.rotation || 0);
      const fx = Math.cos(rot);
      const fy = Math.sin(rot);
      const vx = Number(body.body.velocity.x || 0);
      const vy = Number(body.body.velocity.y || 0);
      const fwd = vx * fx + vy * fy;

      if (Math.abs(fwd) > 0.5) {
        const fullRestoreRate = engineBrake * (0.05 - 0.008);
        const restoreRate = fullRestoreRate * coastBlend;
        const restore = Math.min(Math.abs(fwd) * 0.08, restoreRate * dt);
        body.body.velocity.x += fx * Math.sign(fwd) * restore;
        body.body.velocity.y += fy * Math.sign(fwd) * restore;
      }
    }
  }
}
