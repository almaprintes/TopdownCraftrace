// Configuracion declarativa de capas visuales horneadas por circuito.
// La fisica y la deteccion de superficie NO consumen estos assets.
const TRACK_BEAUTY_LAYERS = Object.freeze({
  'karting-tenerife': Object.freeze({
    useBeautyLayer: true,
    // Revision visual: cambiarla cuando cambien los binarios horneados evita que
    // Safari/PWA reutilice WebP antiguos con la misma URL.
    assetRevision: 'beauty2-20260824-055218',
    assetsAvailable: true,
    worldW: 2813,
    worldH: 2602,
    depth: 9,
    replaces: Object.freeze({
      asphalt: true,
      grass: true,
      offroad: true,
      // Los pianos siguen siendo objetos separados mientras el arte beauty no
      // declare explicitamente que los contiene. Asi conservamos sus detalles
      // actuales sin duplicar props dinamicos.
      kerbs: false,
      props: false
    }),
    tiles: Object.freeze([
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:0:beauty2',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-0.webp?v=beauty2-20260824-055218',
        x: 0, y: 0, w: 1407, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:1:beauty2',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-1.webp?v=beauty2-20260824-055218',
        x: 1407, y: 0, w: 1406, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:2:beauty2',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-2.webp?v=beauty2-20260824-055218',
        x: 0, y: 1301, w: 1407, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:3:beauty2',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-3.webp?v=beauty2-20260824-055218',
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
