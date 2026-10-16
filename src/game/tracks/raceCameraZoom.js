// Race-camera framing only. Never multiply track coordinates, collision
// geometry or vehicle scale: those must remain in the photo's original pixels.
export const KARTING_CANARIAS_ZOOM_FACTOR = 0.84;

// This factor applies to the full speed-dependent zoom target. A one-time
// camera.setZoom() would be overwritten on the next RaceScene.update() tick.
export function raceCameraZoomFactor(trackKey) {
  return trackKey === 'karting-canarias' ? KARTING_CANARIAS_ZOOM_FACTOR : 1;
}

export function raceCameraZoomTarget(trackKey, baseTargetZoom) {
  return baseTargetZoom * raceCameraZoomFactor(trackKey);
}
