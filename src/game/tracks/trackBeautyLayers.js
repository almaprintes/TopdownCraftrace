// Configuracion declarativa de capas visuales horneadas por circuito.
// La fisica y la deteccion de superficie NO consumen estos assets.
const TRACK_BEAUTY_LAYERS = Object.freeze({
  'karting-tenerife': Object.freeze({
    useBeautyLayer: true,
    assetRevision: 'debug-red-20260824-064121',
    assetsAvailable: true,
    worldW: 2813,
    worldH: 2602,
    depth: 9,
    replaces: Object.freeze({
      asphalt: true,
      grass: true,
      offroad: true,
      kerbs: false,
      props: false
    }),
    tiles: Object.freeze([
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:0:debug-red',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-0.webp?v=debug-red-20260824-064121',
        x: 0, y: 0, w: 1407, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:1:debug-red',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-1.webp?v=debug-red-20260824-064121',
        x: 1407, y: 0, w: 1406, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:2:debug-red',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-2.webp?v=debug-red-20260824-064121',
        x: 0, y: 1301, w: 1407, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:3:debug-red',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-3.webp?v=debug-red-20260824-064121',
        x: 1407, y: 1301, w: 1406, h: 1301
      })
    ])
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
