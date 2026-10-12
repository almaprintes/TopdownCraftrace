import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const content=path=>readFileSync(path,'utf8');
const pass=content('src/game/scenes/raceExactRuntimeBeautyPass.js');
const native=content('src/game/tracks/localKartingPreview.js');
const baked=content('src/game/scenes/RaceBakedAsphaltScene.js');
const installer=content('scripts/install-karting-tenerife-source.mjs');
const workflow=content('src/game/scenes/EnvironmentBuilderCollisionWorkflowScene.js');
const nativeCheck=pass.indexOf('if (isImageNativeTrackScene(scene)) return;');
const oldBeautyCheck=pass.indexOf('if (scene?._beautyLayerActive === true)');
const textureCheck=pass.indexOf("if (!scene.textures?.exists?.('asphalt')) return;");
assert.ok(nativeCheck>0&&nativeCheck<oldBeautyCheck&&nativeCheck<textureCheck,
  'Image-native photos must bypass exact runtime asphalt BEFORE the async Beauty Layer has mounted');
assert.ok(native.includes('const pass=scene._exactRuntimeBeautyPass;') &&
  native.includes('scene._exactRuntimeBeautyPass=null;'),
  'Photo mount must cleanup any legacy road created before async decode');
assert.ok(baked.includes("trackId === 'karting-tenerife' && !isImageNativeTrackScene(this)"),
  'Legacy asphalt baker must never run for photo-native Karting');
assert.ok(installer.includes('const spawnHeading=Math.atan2(dy,dx)') &&
  installer.includes('start:authoredSpawn'), 'Game spawn orientation must follow the centerline, not the zero-angle source placeholder');
assert.ok(workflow.includes('_hasUnfinishedCollisionDraft(){') &&
  workflow.includes('PLUMA SIN TERMINAR') &&
  workflow.includes('if(this._hasUnfinishedCollisionDraft())return;'),
  'Editor should warn when the exported JSON would silently omit uncommitted pen/zone geometry');
const environment=JSON.parse(content('src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json'));
assert.equal(environment.collisionZones.length,17);
assert.equal(environment.collisionLines.length,5,
  'Latest finished Environment Studio export must retain all five authored pen walls');
console.log('Karting DEV photo: no centerline asphalt overpaint, correct spawn orientation, seventeen zones and five pen walls preserved, unfinished-pen export guarded');
