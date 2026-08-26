import { RaceScene as CurrentRaceScene } from './RaceMasteryRoofScene.js';

// Sensory-only kerb layer. RaceKerbSurfaceScene exposes _isOnKerb(x,y) and
// classifies the visual piano as drivable track. This layer never changes grip,
// speed, steering or collisions: it only adds feedback when tyres cross a kerb.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    this._kerbHapticLastAt = 0;
    this._kerbHapticWasOn = false;
    this._kerbHapticNativePending = false;
    this._kerbFeedbackPulse = 0;
    return result;
  }

  update(time, delta) {
    super.update?.(time, delta);
    this._updateKerbHaptics(Number(time) || performance.now());
  }

  _updateKerbHaptics(now) {
    if (typeof this._isOnKerb !== 'function') return;
    const body = this.carBody;
    if (!body) return;

    const cx = Number(body.center?.x ?? body.x);
    const cy = Number(body.center?.y ?? body.y);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

    const vx = Number(body.velocity?.x) || 0;
    const vy = Number(body.velocity?.y) || 0;
    const speed = Math.hypot(vx, vy);
    if (speed < 14) {
      this._kerbHapticWasOn = false;
      return;
    }

    const rawW = Number(body.width || body.gameObject?.displayWidth || 22);
    const rawH = Number(body.height || body.gameObject?.displayHeight || 38);
    const carW = Math.max(12, Math.min(38, rawW));
    const carH = Math.max(20, Math.min(62, rawH));
    // Slightly wider contact patches than before. The previous 0.40 sampling sat
    // too far inside some car bodies and could visually cross a piano without any
    // sampled tyre point actually reaching the kerb strip.
    const halfTrack = carW * 0.48;
    const axle = carH * 0.34;
    const angle = Number(body.gameObject?.rotation ?? this.carRig?.rotation ?? 0) || 0;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const localToWorld = (lx, ly) => ({ x: cx + lx * ca - ly * sa, y: cy + lx * sa + ly * ca });

    const tyres = [
      localToWorld(-halfTrack, -axle), localToWorld(halfTrack, -axle),
      localToWorld(-halfTrack, axle),  localToWorld(halfTrack, axle)
    ];

    let wheelsOnKerb = 0;
    for (const p of tyres) if (this._isOnKerb(p.x, p.y)) wheelsOnKerb++;
    if (!wheelsOnKerb) {
      this._kerbHapticWasOn = false;
      return;
    }

    const speed01 = Math.max(0, Math.min(1, (speed - 14) / 330));
    // Human-perceptible cadence rather than tiny phone pulses every ~60 ms.
    const interval = Math.round(155 - speed01 * 45); // ~155ms -> ~110ms
    const entry = !this._kerbHapticWasOn;
    this._kerbHapticWasOn = true;
    if (!entry && now - this._kerbHapticLastAt < interval) return;
    this._kerbHapticLastAt = now;

    const strong = wheelsOnKerb >= 2;
    const strength = strong ? 'medium' : 'light';
    const duration = strong ? Math.round(48 + speed01 * 12) : Math.round(32 + speed01 * 10);
    this._emitKerbHaptic(strength, duration);
    this._emitKerbVisualFeedback(strong, speed01);
  }

  _emitKerbVisualFeedback(strong, speed01) {
    // Tiny camera kick gives us a platform-independent confirmation that the kerb
    // detector actually fired, and also makes the piano readable on iOS web where
    // automatic haptics are unavailable.
    try {
      const cam = this.cameras?.main;
      if (!cam?.shake) return;
      const intensity = (strong ? 0.00125 : 0.00075) + speed01 * 0.00035;
      cam.shake(strong ? 42 : 30, intensity, true);
    } catch (_) {}
  }

  _emitKerbHaptic(strength = 'light', duration = 32) {
    try {
      const haptics = globalThis?.Capacitor?.Plugins?.Haptics;
      if (haptics?.impact && !this._kerbHapticNativePending) {
        this._kerbHapticNativePending = true;
        const style = strength === 'medium' ? 'MEDIUM' : 'LIGHT';
        Promise.resolve(haptics.impact({ style })).catch(() => {}).finally(() => {
          this._kerbHapticNativePending = false;
        });
        return;
      }
    } catch (_) {}

    try {
      if (typeof navigator?.vibrate === 'function') {
        // Pulses below ~20 ms are easy to miss on many Android motors. Use a
        // clearly perceptible pulse while keeping it short enough to feel like kerb blocks.
        const ms = Math.max(28, Math.min(65, Math.round(duration)));
        navigator.vibrate(ms);
      }
    } catch (_) {}
  }
}
