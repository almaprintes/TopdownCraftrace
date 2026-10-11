// Shared, versioned contract for tracks authored on a photographic canvas.
// TrackStudio projects remain portable .tdrtrack bundles; this metadata NEVER
// makes a browser-local image available in a deployed race by itself.
export const IMAGE_NATIVE_RENDER_MODE = 'image-native';
export const IMAGE_NATIVE_SCHEMA_VERSION = 1;

function isPositiveInteger(n) { return Number.isSafeInteger(n) && n > 0; }

export function attachImageNativeTrackContract(gameTrack, imageCanvas) {
  if (!imageCanvas) return gameTrack;
  if (!gameTrack || typeof gameTrack !== 'object') return gameTrack;
  const width = Number(imageCanvas.width), height = Number(imageCanvas.height);
  if (!isPositiveInteger(width) || !isPositiveInteger(height) ||
      width > 8192 || height > 8192 || width * height > 32000000) {
    throw new Error('La fotografía supera los límites del lienzo');
  }
  if (Number(gameTrack.worldW) !== width || Number(gameTrack.worldH) !== height) {
    throw new Error('La fotografía y la geometría deben compartir coordenadas 1:1');
  }
  if (!String(imageCanvas.imageId || '').trim()) {
    throw new Error('Falta el identificador de la imagen maestra');
  }
  // Do not mutate editor data or change the existing shape, stage gates,
  // start position, centreline, vehicle dynamics or image bundle format.
  return {
    ...gameTrack,
    meta: {
      ...(gameTrack.meta || {}),
      renderMode: IMAGE_NATIVE_RENDER_MODE,
      imageNative: {
        schema: IMAGE_NATIVE_SCHEMA_VERSION,
        imageId: imageCanvas.imageId,
        width,
        height,
        // 'local' means IndexedDB/.tdrtrack only, NOT a published asset.
        availability: 'local'
      }
    }
  };
}

export function isImageNativeTrackMeta(track) {
  return track?.meta?.renderMode === IMAGE_NATIVE_RENDER_MODE &&
    track?.meta?.imageNative?.schema === IMAGE_NATIVE_SCHEMA_VERSION;
}
