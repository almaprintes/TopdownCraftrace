// Configuracion declarativa de capas visuales horneadas por circuito.
// La fisica y la deteccion de superficie NO consumen estos assets.
const TRACK_BEAUTY_LAYERS = Object.freeze({
  'karting-tenerife': Object.freeze({
    useBeautyLayer: true,
    // Los cuatro WebP aun no existen en main. Mantener false evita peticiones 404
    // y conserva el render estable actual hasta que los binarios entren al repo.
    assetsAvailable: false,
    worldW: 2813,
    worldH: 2602,
    depth: 9,
    replaces: Object.freeze({
      asphalt: true,
      grass: true,
      offroad: true,
      // Los pianos siguen siendo objetos separados mientras el arte beauty no
      // declare explicitamente que los contiene. Asi no duplicamos ni borramos
      // geometria visual sin tener los assets finales delante.
      kerbs: false,
      props: false
    }),
    tiles: Object.freeze([
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:0',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-0.webp',
        x: 0, y: 0, w: 1407, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:1',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-1.webp',
        x: 1407, y: 0, w: 1406, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:2',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-2.webp',
        x: 0, y: 1301, w: 1407, h: 1301
      }),
      Object.freeze({
        key: 'trackBeauty:karting-tenerife:3',
        path: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-3.webp',
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
