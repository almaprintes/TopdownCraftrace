import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const visualLayers=[
  'RaceSemiSimScene','RaceSurfaceRefineScene','RaceSurfaceEnvironmentScene',
  'RaceSurfaceGrassBladeScene','RaceSurfaceMaterialBlendScene','RaceMaterialScene'
];
for(const name of visualLayers){
  const content=read('src/game/scenes/'+name+'.js');
  assert.match(content,/import\s*\{\s*isImageNativeTrackScene\s*\}/);
  assert.match(content,/create\(\)\s*\{\s*super\.create\(\);\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*if\s*\(isImageNativeTrackScene\(this\)\)\s*return;/);
}
const material=read('src/game/scenes/RaceMaterialScene.js');
assert.match(material,/isImageNativeTrackMeta\(TRACK_REGISTRY\[key\]\)\) return;/);
const photo=read('src/game/tracks/localKartingPreview.js');
for(const field of ['_semiSimBrakeMarks','_environmentEdgeWear','_materialEdgeWear']){
  assert.ok(photo.includes("'"+field+"'"),'Photo teardown must release '+field);
}
const isolation=read('src/game/scenes/RaceRenderIsolationProfilerScene.js');
assert.match(isolation,/localStorage\.getItem\('tdr2:renderIsolation'\)==='1'/);
assert.match(isolation,/if\(!videoPrefs\(\)\.renderIsolation\)return result;/);
assert.match(isolation,/this\._isoNextReport=now\+750/);
console.info('PASS: photo-native skips legacy surfaces; render isolation is opt-in');
