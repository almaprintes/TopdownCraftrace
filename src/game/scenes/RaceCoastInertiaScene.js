import { RaceScene as CurrentRaceScene } from './RaceVisualRearPivotScene.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// High-inertia coasting layer.
// Keeps the established steering/handling untouched and only changes what happens
// on TRACK when the driver releases both throttle and brake:
// - greatly reduces passive drag,
// - greatly reduces engine braking,
// - leaves the real brake pedal and off-track penalties untouched.
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

    // Base RaceScene applies exp(-linearDrag * dt * 60).
    // Compensate most of that so net coasting drag behaves like ~3.5 instead of 60.
    // For a typical linearDrag around 0.03 this retains roughly 90% of speed per second.
    const baseDragScale = 60;
    const coastDragScale = 3.5;
    if (linearDrag > 0) {
      const compensation = Math.exp(linearDrag * dt * (baseDragScale - coastDragScale));
      body.body.velocity.x *= compensation;
      body.body.velocity.y *= compensation;
    }

    // Base engine braking removes engineBrake * 0.05 px/s each second.
    // Restore most of it, leaving a tiny natural driveline resistance (~0.008).
    if (engineBrake > 0) {
      const rot = Number(body.rotation || 0);
      const fx = Math.cos(rot);
      const fy = Math.sin(rot);
      const vx = Number(body.body.velocity.x || 0);
      const vy = Number(body.body.velocity.y || 0);
      const fwd = vx * fx + vy * fy;

      if (Math.abs(fwd) > 0.5) {
        const restoreRate = engineBrake * (0.05 - 0.008);
        const restore = Math.min(Math.abs(fwd) * 0.08, restoreRate * dt);
        body.body.velocity.x += fx * Math.sign(fwd) * restore;
        body.body.velocity.y += fy * Math.sign(fwd) * restore;
      }
    }
  }
}
