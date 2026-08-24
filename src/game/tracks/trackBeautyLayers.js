import { GENERATED_TRACK_BEAUTY_LAYERS } from './trackBeautyLayers.generated.js';

// Configuracion declarativa de capas visuales horneadas por circuito.
// La fisica y la deteccion de superficie NO consumen estos assets.
// El catalogo generado por el baker es la fuente principal. Este bloque manual
// solo conserva fallbacks o excepciones mientras no exista un bake publicado.
const TRACK_BEAUTY_LAYERS = Object.freeze({
  'karting-tenerife': Object.freeze({
    useBeautyLayer: false,
    assetRevision: 'runtime-exact-materials-20260824',
    assetsAvailable: false,
    worldW: 2813,
    worldH: 2602,
    depth: 9,
    replaces: Object.freeze({
      asphalt: false,
      grass: false,
      offroad: false,
      kerbs: false,
      props: false
    }),
    tiles: Object.freeze([])
  })
});

export function getTrackBeautyLayerConfig(trackId) {
  const key = String(trackId || '').trim().toLowerCase();
  return GENERATED_TRACK_BEAUTY_LAYERS[key] || TRACK_BEAUTY_LAYERS[key] || null;
}

export function hasReadyTrackBeautyLayer(trackId) {
  const cfg = getTrackBeautyLayerConfig(trackId);
  return !!(cfg?.useBeautyLayer && cfg?.assetsAvailable && cfg?.tiles?.length);
}
