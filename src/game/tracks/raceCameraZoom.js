// The previous camera-only workaround did not correct Karting Canarias'
// physical road-to-car ratio or lap length. The 2.5x world geometry is
// now authoritative, so normal gameplay camera zoom applies everywhere.
export const KARTING_CANARIAS_ZOOM_FACTOR = 1;

export function raceCameraZoomFactor(_trackKey) {
  return KARTING_CANARIAS_ZOOM_FACTOR;
}
export function raceCameraZoomTarget(trackKey, baseTargetZoom) {
  return baseTargetZoom * raceCameraZoomFactor(trackKey);
}
