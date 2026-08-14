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

export function formatKmhFromPxps(pxps, digits = 0) {
  return `${pxpsToKmh(pxps).toFixed(digits)} km/h`;
}
