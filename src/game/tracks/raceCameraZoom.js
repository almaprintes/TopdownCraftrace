// The previous camera-only workaround did not correct Karting Canarias'
// physical road-to-car ratio or lap length. The 2.5x world geometry is
// now authoritative, so normal gameplay camera zoom applies everywhere.
export const KARTING_CANARIAS_ZOOM_FACTOR = 1;

export function raceCameraZoomFactor(_trackKey) {
  return KARTING_CANARIAS_ZOOM_FACTOR;
}
// DEV camera trial for published/photo-native tracks only.
// At low speed, previous effective 1.06× magnified already downsampled
// iPhone photo tiles. Keep fast-speed zoom (0.62×) intact, without touching
// vehicle or road geometry. Build mode gating is provided by RaceScene.
export const DEV_PHOTO_CAMERA_MAX_ZOOM = 0.86;
export function raceCameraZoomTarget(trackKey, baseTargetZoom, devPhotoWide=false) {
  const original=baseTargetZoom*raceCameraZoomFactor(trackKey);
  return devPhotoWide?Math.min(DEV_PHOTO_CAMERA_MAX_ZOOM,original):original;
}
