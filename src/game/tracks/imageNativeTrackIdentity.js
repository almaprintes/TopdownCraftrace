// Common scene identity for local previews and registered native-photo tracks.
// It must NEVER receive legacy Karting Tenerife props or the public identity.
import { isImageNativeTrackMeta } from './imageNativeTrackContract.js';

export const KARTING_IMAGE_PREVIEW_KEY='karting-tenerife-studio';

export function isImageNativeTrackScene(scene) {
  const id=String(scene?.trackKey||'').trim().toLowerCase();
  const meta=scene?.track?.meta;
  return scene?._imageNativePrepared != null || id===KARTING_IMAGE_PREVIEW_KEY ||
    isImageNativeTrackMeta(meta) || isImageNativeTrackMeta({meta}) ||
    (meta?.localPreview===true && meta?.source==='trackstudio-image-native');
}
