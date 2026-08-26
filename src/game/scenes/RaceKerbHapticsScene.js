import { RaceScene as CurrentRaceScene } from './RaceMasteryRoofScene.js';

// Sensory-only kerb layer. RaceKerbSurfaceScene already exposes _isOnKerb(x,y)
// and classifies the visual piano as drivable track. This layer deliberately does
// NOT alter grip, speed, steering or collision: it only samples four approximate
// tyre contact patches and emits haptics while one or more tyres are on the piano.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    this._kerbHapticLastAt = 0;
    this._kerbHapticWasOn = false;
    this._kerbHapticNativePending = false;
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

    // No rumble while effectively stopped: the feedback should feel like tyres
    // travelling over kerb blocks, not like merely parking on one.
    if (speed < 18) {
      this._kerbHapticWasOn = false;
      return;
    }

    const rawW = Number(body.width || body.gameObject?.displayWidth || 22);
    const rawH = Number(body.height || body.gameObject?.displayHeight || 38);
    const carW = Math.max(12, Math.min(34, rawW));
    const carH = Math.max(20, Math.min(58, rawH));
    const halfTrack = carW * 0.40;
    const axle = carH * 0.31;
    const angle = Number(body.gameObject?.rotation ?? this.carRig?.rotation ?? 0) || 0;
    const ca = Math.cos(angle), sa = Math.sin(angle);

    const localToWorld = (lx, ly) => ({
      x: cx + lx * ca - ly * sa,
      y: cy + lx * sa + ly * ca
    });

    const tyres = [
      localToWorld(-halfTrack, -axle),
      localToWorld( halfTrack, -axle),
      localToWorld(-halfTrack,  axle),
      localToWorld( halfTrack,  axle)
    ];

    let wheelsOnKerb = 0;
    for (const p of tyres) if (this._isOnKerb(p.x, p.y)) wheelsOnKerb++;
    if (!wheelsOnKerb) {
      this._kerbHapticWasOn = false;
      return;
    }

    // Faster travel = tighter rumble cadence. Two or more tyres = slightly
    // stronger pulse, but intentionally subtle so long kerbs never become annoying.
    const speed01 = Math.max(0, Math.min(1, (speed - 18) / 330));
    const interval = Math.round(118 - speed01 * 55); // ~118ms -> ~63ms
    const entry = !this._kerbHapticWasOn;
    this._kerbHapticWasOn = true;
    if (!entry && now - this._kerbHapticLastAt < interval) return;
    this._kerbHapticLastAt = now;

    const strength = wheelsOnKerb >= 2 ? 'medium' : 'light';
    const duration = wheelsOnKerb >= 2 ? (speed01 > .65 ? 20 : 16) : (speed01 > .65 ? 14 : 10);
    this._emitKerbHaptic(strength, duration);
  }

  _emitKerbHaptic(strength = 'light', duration = 10) {
    // Native-ready bridge: when packaged with Capacitor/Haptics this same event
    // automatically uses the native motor. No hard dependency is added to web builds.
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

    // Android browsers generally support this. Safari/iOS web may ignore it;
    // the native bridge above is the intended iOS path for the store build.
    try {
      if (typeof navigator?.vibrate === 'function') navigator.vibrate(Math.max(6, Math.min(24, duration)));
    } catch (_) {}
  }
}
