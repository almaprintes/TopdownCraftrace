// Common scene identity for local previews and registered native-photo tracks.
// It must NEVER receive legacy Karting Tenerife props or the public identity.
import { isImageNativeTrackMeta } from './imageNativeTrackContract.js';

export const KARTING_IMAGE_PREVIEW_KEY='karting-tenerife-studio';

export function isImageNativeTrackScene(scene) {
  const id=String(scene?.trackKey||'').trim().toLowerCase();
  const meta=scene?.track?.meta;
  // Phaser keeps the prior track object until the next RaceScene.create().
  // Its photo flag must not suppress the new circuit's preload graphics.
  const trackId=String(meta?.id||meta?.key||scene?.track?.id||scene?.track?.key||'').trim().toLowerCase();
  const matchesCurrent=!trackId||trackId===id;
  return scene?._imageNativePrepared != null || id===KARTING_IMAGE_PREVIEW_KEY ||
    (matchesCurrent && (
      isImageNativeTrackMeta(meta) || isImageNativeTrackMeta({meta}) ||
      (meta?.localPreview===true && meta?.source==='trackstudio-image-native')
    ));
}
