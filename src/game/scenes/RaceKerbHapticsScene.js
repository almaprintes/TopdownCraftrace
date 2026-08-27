import { RaceScene as CurrentRaceScene } from './RaceMasteryRoofScene.js';

// Kerb/piano immersion layer. RaceKerbSurfaceScene exposes _isOnKerb(x,y) using
// the actual exported red/white bands. Feedback is intentionally noticeable but
// still mild enough that using a kerb remains a valid racing technique.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    this._kerbHapticLastAt = 0;
    this._kerbHapticWasOn = false;
    this._kerbHapticNativePending = false;
    this._kerbPhysicalLastAt = 0;
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
    if (speed < 12) {
      this._kerbHapticWasOn = false;
      return;
    }

    const rawW = Number(body.width || body.gameObject?.displayWidth || 22);
    const rawH = Number(body.height || body.gameObject?.displayHeight || 38);
    const carW = Math.max(12, Math.min(38, rawW));
    const carH = Math.max(20, Math.min(62, rawH));
    const halfTrack = carW * 0.50;
    const axle = carH * 0.36;
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

    const speed01 = Math.max(0, Math.min(1, (speed - 12) / 300));
    const entry = !this._kerbHapticWasOn;
    this._kerbHapticWasOn = true;

    // Kerb blocks should read as a rapid rumble, not isolated phone notifications.
    const interval = Math.round(98 - speed01 * 26); // ~98ms -> ~72ms
    if (!entry && now - this._kerbHapticLastAt < interval) return;
    this._kerbHapticLastAt = now;

    const strong = wheelsOnKerb >= 2;
    this._emitKerbHaptic(entry || strong ? 'medium' : 'light', strong ? 55 : 40);
    this._emitKerbVisualFeedback(entry, strong, speed01);
    this._emitKerbPhysicalFeedback(now, body, wheelsOnKerb, speed01, entry);
  }

  _emitKerbVisualFeedback(entry, strong, speed01) {
    try {
      const cam = this.cameras?.main;
      if (!cam?.shake) return;
      // Previous values (~0.001) were practically invisible on a moving race camera.
      // Entry gets a distinct kick; sustained running over blocks gets a shorter rumble.
      const base = entry ? 0.0034 : (strong ? 0.0027 : 0.0021);
      const intensity = base + speed01 * 0.0011;
      const duration = entry ? 72 : (strong ? 58 : 46);
      cam.shake(duration, intensity, true);
    } catch (_) {}
  }

  _emitKerbPhysicalFeedback(now, body, wheelsOnKerb, speed01, entry) {
    // Tiny rolling-resistance bump. This is deliberately small: kerbs must feel
    // textured, not behave like grass or punish an intentional racing line.
    if (!entry && now - this._kerbPhysicalLastAt < 105) return;
    this._kerbPhysicalLastAt = now;
    try {
      const vx = Number(body.velocity?.x) || 0;
      const vy = Number(body.velocity?.y) || 0;
      if (!Number.isFinite(vx) || !Number.isFinite(vy)) return;
      const loss = wheelsOnKerb >= 2 ? (0.991 - speed01 * 0.002) : (0.995 - speed01 * 0.001);
      const setVelocity = this.matter?.body?.setVelocity;
      if (typeof setVelocity === 'function') {
        setVelocity.call(this.matter.body, body, { x: vx * loss, y: vy * loss });
      }
    } catch (_) {}
  }

  _emitKerbHaptic(strength = 'light', duration = 40) {
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
        // Android vibration motors often swallow very short taps. Keep the pulse
        // short enough to feel like kerb blocks but long enough to be unmistakable.
        const ms = Math.max(36, Math.min(62, Math.round(duration)));
        navigator.vibrate(ms);
      }
    } catch (_) {}
  }
}
