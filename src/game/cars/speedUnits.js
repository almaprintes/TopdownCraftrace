// Canonical speed conversion for the whole game.
// Physics remain in px/s; every user-facing speed must use this helper.
export const KMH_PER_PXPS = 0.10;

export function pxpsToKmh(pxps) {
  const v = Number(pxps);
  return Number.isFinite(v) ? v * KMH_PER_PXPS : 0;
}

export function kmhToPxps(kmh) {
  const v = Number(kmh);
  return Number.isFinite(v) ? v / KMH_PER_PXPS : 0;
}

export function formatKmhFromPxps(pxps, digits = 0) {
  return `${pxpsToKmh(pxps).toFixed(digits)} km/h`;
}
