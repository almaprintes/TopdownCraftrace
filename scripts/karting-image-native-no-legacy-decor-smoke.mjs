import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isImageNativeTrackScene,KARTING_IMAGE_PREVIEW_KEY }
  from '../src/game/tracks/imageNativeTrackIdentity.js';

// Regression: this preview slug shares a prefix with legacy Karting Tenerife.
const imageScene={
  trackKey:KARTING_IMAGE_PREVIEW_KEY,
  track:{id:KARTING_IMAGE_PREVIEW_KEY,key:KARTING_IMAGE_PREVIEW_KEY,
    name:'KARTING TENERIFE · TRACKSTUDIO DEV',
    meta:{meta:{localPreview:true,source:'trackstudio-image-native'}}}
};
const officialScene={
  trackKey:'karting-tenerife',
  track:{id:'karting-tenerife',key:'karting-tenerife',name:'KARTING TENERIFE'}
};
assert.equal(isImageNativeTrackScene(imageScene),true);
assert.equal(isImageNativeTrackScene(officialScene),false,'Original track remains unchanged');
assert.equal(isImageNativeTrackScene({trackKey:'karting-canarias'}),false);
assert.equal(isImageNativeTrackScene({trackKey:'track01'}),false);
assert.equal(isImageNativeTrackScene({trackKey:'KARTING-TENERIFE-STUDIO'}),true);
assert.equal(isImageNativeTrackScene({trackKey:'other',track:{meta:{localPreview:true,source:'trackstudio-image-native'}}}),true);
assert.equal(isImageNativeTrackScene({trackKey:'other',track:{meta:{localPreview:true,source:'other'}}}),false);

const guards=[
  ['src/game/scenes/RaceKartingTenerifeIdentityVegetationScene.js','function isKartingTenerife(scene){'],
  ['src/game/scenes/RaceKartingTenerifeStructuresScene.js','function isKartingTenerife(scene){'],
  ['src/game/scenes/RaceKartingTenerifePaddockScene.js','function isKT(scene){'],
  ['src/game/scenes/RaceEnvironmentLayer.js','function isKartingTenerife(scene) {']
];
for(const [path,signature] of guards){
  const src=readFileSync(path,'utf8'),start=src.indexOf(signature);
  assert.ok(start>=0,path+': old track predicate missing');
  const section=src.slice(start,start+270);
  assert.ok(section.includes('if (isImageNativeTrackScene(scene)) return false'),
    path+': decorations must be blocked before prefix/name matching');
}
const identity=readFileSync(guards[0][0],'utf8');
assert.ok(identity.includes("scene.track.id = 'karting-tenerife'"),
  'Official identity remains for old Karting Tenerife');
assert.ok(identity.indexOf('if (isImageNativeTrackScene(scene)) return false')<
          identity.indexOf('function canonicalizeIdentity'),
  'Preview must be excluded from canonical renaming');
const environment=readFileSync('src/game/scenes/RaceEnvironmentLayer.js','utf8');
assert.ok(environment.includes('function placeCuratedEnvironment(scene, center, defaultTrackW) {\n  if (isImageNativeTrackScene(scene)) return []'),
 'Delayed curated placements must be guarded');
assert.ok(environment.includes('export function addCircuitEnvironment(scene, center, defaultTrackW = 160) {\n  if (isImageNativeTrackScene(scene)) return []'));
const authored=readFileSync('src/game/scenes/RaceAuthoredEnvironmentScene.js','utf8');
assert.ok(authored.includes('create(){super.create();if(isImageNativeTrackScene(this))return;'));
const preview=readFileSync('src/game/tracks/localKartingPreview.js','utf8');
for(const key of ['_ktPaddock','_ktStructures','_ktDenseVegetation',
                  '_circuitEnvironment','_authoredEnvironmentObjects']){
  assert.ok(preview.includes("'"+key+"'"),'Failed to clean up '+key);
}
assert.ok(preview.includes('scene._authoredSurfaceZones=[]'));
assert.ok(preview.includes("LOCAL_KARTING_PREVIEW_KEY='karting-tenerife-studio'"),
 'Preview must not share official ranking/storage identifier');
console.log('Karting image preview: legacy props blocked, identity isolated, other tracks preserved: OK');
