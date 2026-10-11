// The image-native TrackStudio preview is a full authored visual scene.
// It must NEVER receive legacy Karting Tenerife props or the public identity.
export const KARTING_IMAGE_PREVIEW_KEY='karting-tenerife-studio';

export function isImageNativeTrackScene(scene) {
  const id=String(scene?.trackKey||'').trim().toLowerCase();
  const meta=scene?.track?.meta;
  return id===KARTING_IMAGE_PREVIEW_KEY ||
    (meta?.localPreview===true && meta?.source==='trackstudio-image-native');
}
