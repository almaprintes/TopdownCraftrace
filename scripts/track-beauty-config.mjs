export const MATERIAL_LIBRARY = Object.freeze({
  asphalt02Clean: Object.freeze({
    id: 'asphalt02Clean',
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_02/asphalt_02_diff_2k.jpg',
    type: 'road',
    processing: 'cleanMicrodetail'
  }),
  cleanAsphalt: Object.freeze({
    id: 'cleanAsphalt',
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/clean_asphalt/clean_asphalt_diff_2k.jpg',
    type: 'road'
  }),
  sparseGrass: Object.freeze({
    id: 'sparseGrass',
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/sparse_grass/sparse_grass_diff_2k.jpg',
    type: 'surface'
  }),
  grassMedium01: Object.freeze({
    id: 'grassMedium01',
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/grass_medium_01/grass_medium_01_diff_2k.jpg',
    type: 'surface'
  }),
  rockyTrail02: Object.freeze({
    id: 'rockyTrail02',
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rocky_trail_02/rocky_trail_02_diff_2k.jpg',
    type: 'surface'
  })
});

// Only approved circuits live here. Adding a circuit means choosing its three
// surfaces deliberately; there is no global fallback that silently makes all
// tracks look like Atlantico.
export const TRACK_BEAUTY_CONFIGS = Object.freeze({
  track01: Object.freeze({
    title: 'Atlantico',
    approved: true,
    trackPath: 'src/game/tracks/library/track01/track.json',
    revision: 'atlantico-polyhaven-v10-clean-asphalt',
    materials: Object.freeze({
      road: Object.freeze({ material: 'asphalt02Clean', cell: 205, macroGrid: 4, brightness: 0.96 }),
      shoulder: Object.freeze({ material: 'sparseGrass', repeat: 1126, brightness: 1.0 }),
      outer: Object.freeze({ material: 'rockyTrail02', repeat: 983, brightness: 0.78 })
    }),
    webp: Object.freeze({ quality: 86, effort: 3 }),
    previewWidth: 1215,
    depth: 9,
    replaces: Object.freeze({ asphalt:true, grass:true, offroad:true, kerbs:false, props:false })
  }),
  'karting-tenerife': Object.freeze({
    title: 'Karting Tenerife',
    approved: true,
    trackPath: 'src/game/tracks/library/karting-tenerife/track.json',
    revision: 'karting-tenerife-clean-asphalt-grass-medium01-v1',
    materials: Object.freeze({
      road: Object.freeze({ material: 'cleanAsphalt', cell: 225, brightness: 1.0 }),
      shoulder: Object.freeze({ material: 'grassMedium01', repeat: 574, brightness: 1.0 }),
      outer: Object.freeze({ material: 'rockyTrail02', repeat: 983, brightness: 0.78 })
    }),
    webp: Object.freeze({ quality: 86, effort: 3 }),
    previewWidth: 1400,
    depth: 9,
    replaces: Object.freeze({ asphalt:true, grass:true, offroad:true, kerbs:false, props:false })
  })
});

export function getTrackBeautyConfig(trackKey) {
  const config = TRACK_BEAUTY_CONFIGS[trackKey];
  if (!config) throw new Error(`No approved beauty config for ${trackKey}`);
  return config;
}

export function resolveMaterial(id) {
  const material = MATERIAL_LIBRARY[id];
  if (!material) throw new Error(`Unknown beauty material: ${id}`);
  return material;
}
