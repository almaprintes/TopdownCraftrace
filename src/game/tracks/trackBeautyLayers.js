// Configuracion declarativa de capas visuales horneadas por circuito.
// La fisica y la deteccion de superficie NO consumen estos assets.
const TRACK_BEAUTY_LAYERS = Object.freeze({
  'karting-tenerife': Object.freeze({
    // El bake rojo de validacion queda retirado del runtime.
    // Karting Tenerife usa ahora el material world-space aplicado sobre la mascara
    // exacta de track.geom.left/right en raceExactRuntimeBeautyPass.js.
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
  return TRACK_BEAUTY_LAYERS[key] || null;
}

export function hasReadyTrackBeautyLayer(trackId) {
  const cfg = getTrackBeautyLayerConfig(trackId);
  return !!(cfg?.useBeautyLayer && cfg?.assetsAvailable && cfg?.tiles?.length);
}
