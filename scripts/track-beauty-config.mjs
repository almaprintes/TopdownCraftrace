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
    normalSource: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/clean_asphalt/clean_asphalt_nor_gl_2k.jpg',
    roughnessSource: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/clean_asphalt/clean_asphalt_rough_2k.jpg',
    type: 'road',
    processing: 'bakedPbrDetail'
  }),
  sparseGrass: Object.freeze({ id:'sparseGrass', source:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/sparse_grass/sparse_grass_diff_2k.jpg', type:'surface' }),
  grassMedium01: Object.freeze({ id:'grassMedium01', source:'https://dl.polyhaven.org/file/ph-assets/Models/jpg/2k/grass_medium_01/grass_medium_01_diff_2k.jpg', type:'model-atlas' }),
  rockyTrail02: Object.freeze({ id:'rockyTrail02', source:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rocky_trail_02/rocky_trail_02_diff_2k.jpg', type:'surface' })
});

const ATLANTICO_MATERIALS = Object.freeze({
  road: Object.freeze({ material:'asphalt02Clean', cell:205, macroGrid:4, brightness:0.96 }),
  shoulder: Object.freeze({ material:'sparseGrass', repeat:1126, brightness:1.0 }),
  outer: Object.freeze({ material:'rockyTrail02', repeat:983, brightness:0.78 })
});
const REPLACES = Object.freeze({ asphalt:true, grass:true, offroad:true, kerbs:false, props:false });
function baseline(trackKey,title){
  return Object.freeze({
    title, approved:true,
    trackPath:`src/game/tracks/library/${trackKey}/track.json`,
    revision:'atlantico-polyhaven-baseline-v1',
    materials:ATLANTICO_MATERIALS,
    webp:Object.freeze({quality:86,effort:3}), previewWidth:1215, depth:9, replaces:REPLACES
  });
}

// First homogeneous visual pass requested 2026-08-29.
// Atlántico is the frozen visual reference. Every other official circuit,
// including Raven Hollow, receives the exact same baked surface recipe.
// This file controls visuals only: track geometry, names and surface penalties
// remain owned by their existing gameplay/track data and are not modified here.
export const TRACK_BEAUTY_CONFIGS = Object.freeze({
  track01: Object.freeze({
    title:'Atlantico', approved:true,
    trackPath:'src/game/tracks/library/track01/track.json',
    revision:'atlantico-polyhaven-v10-clean-asphalt',
    materials:ATLANTICO_MATERIALS,
    webp:Object.freeze({quality:86,effort:3}), previewWidth:1215, depth:9, replaces:REPLACES
  }),
  'chicane-vale': baseline('chicane-vale','Chicane Vale'),
  'f1-baku': baseline('f1-baku','Baku'),
  'f1-imola': baseline('f1-imola','Imola'),
  'f1-jeddah': baseline('f1-jeddah','Jeddah'),
  'f1-melbourne': baseline('f1-melbourne','Melbourne'),
  'f1-miami': baseline('f1-miami','Miami'),
  'f1-monte-carlo': baseline('f1-monte-carlo','Monte Carlo'),
  'f1-sakhir': baseline('f1-sakhir','Sakhir'),
  'f1-shanghai': baseline('f1-shanghai','Shanghai'),
  'forest-endurance': baseline('forest-endurance','Forest Endurance'),
  'karting-canarias': baseline('karting-canarias','Karting Canarias'),
  'karting-tenerife': baseline('karting-tenerife','Karting Tenerife'),
  'offroad-raven-hollow': baseline('offroad-raven-hollow','Raven Hollow'),
  'practice-area': baseline('practice-area','Practice Area'),
  'santa-cruz': baseline('santa-cruz','Santa Cruz')
});

export function getTrackBeautyConfig(trackKey) {
  const config=TRACK_BEAUTY_CONFIGS[trackKey];
  if(!config) throw new Error(`No approved beauty config for ${trackKey}`);
  return config;
}
export function resolveMaterial(id){
  const material=MATERIAL_LIBRARY[id];
  if(!material) throw new Error(`Unknown beauty material: ${id}`);
  return material;
}
