// Canonical unit conversion for the whole game.
// Physics remain in px/s and world pixels; every user-facing speed/distance
// must go through these helpers so HUD, garage, reports and track selector agree.
//
// Historical driving HUD/menu scale: 1 px/s = 0.185 km/h.
export const KMH_PER_PXPS = 0.185;
export const METERS_PER_PX = KMH_PER_PXPS / 3.6;

export function pxpsToKmh(pxps) {
  const v = Number(pxps);
  return Number.isFinite(v) ? v * KMH_PER_PXPS : 0;
}

export function kmhToPxps(kmh) {
  const v = Number(kmh);
  return Number.isFinite(v) ? v / KMH_PER_PXPS : 0;
}

export function pxToMeters(px) {
  const v = Number(px);
  return Number.isFinite(v) ? v * METERS_PER_PX : 0;
}

export function metersToPx(meters) {
  const v = Number(meters);
  return Number.isFinite(v) ? v / METERS_PER_PX : 0;
}

// Player-facing top speed must describe what the car can actually sustain on
// level asphalt with full throttle, not the internal hard velocity ceiling.
// This reproduces the longitudinal part of RaceScene at 60 Hz:
//   - throttle acceleration fades as speed approaches maxFwd
//   - base linear drag is applied every frame
//   - maxFwd remains only the safety / physics ceiling
// A short deterministic simulation avoids promising a speed the current
// drivetrain + drag can never reach.
export function attainableTopSpeedPxps(params, seconds = 30) {
  const maxFwd = Math.max(0, Number(params?.maxFwd) || 0);
  const accel = Math.max(0, Number(params?.accel) || 0);
  const linearDrag = Math.max(0, Number(params?.linearDrag) || 0);
  if (maxFwd <= 0 || accel <= 0) return 0;

  const hz = 60;
  const dt = 1 / hz;
  const frames = Math.max(1, Math.round(Math.max(1, Number(seconds) || 30) * hz));
  const drag = Math.exp(-linearDrag * dt * 60);
  let v = 0;

  for (let i = 0; i < frames; i++) {
    const v01 = Math.max(0, Math.min(1, v / Math.max(1, maxFwd)));
    const accelCurve = 1 - Math.pow(v01, 1.8);
    v += accel * accelCurve * dt;
    v *= drag;
    if (v > maxFwd) v = maxFwd;
  }

  return Math.max(0, Math.min(v, maxFwd));
}

export function attainableTopSpeedKmh(params, seconds = 30) {
  return pxpsToKmh(attainableTopSpeedPxps(params, seconds));
}

export function formatKmhFromPxps(pxps, digits = 0) {
  return `${pxpsToKmh(pxps).toFixed(digits)} km/h`;
}
