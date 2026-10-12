import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const precision=readFileSync('src/game/scenes/EnvironmentBuilderPrecisionScene.js','utf8');
const legacy=readFileSync('src/game/scenes/EnvironmentBuilderRealTrackScene.js','utf8');
const editor=readFileSync('src/game/scenes/EnvironmentBuilderRealTrackCleanScene.js','utf8');
const registry=readFileSync('src/game/tracks/trackRegistry.js','utf8');
const generated=readFileSync('src/game/tracks/trackBeautyLayers.generated.js','utf8');

const start=precision.indexOf('  _drawRealTrack(){');
assert.ok(start>=0,'PrecisionScene must own final road/curb painter');
const paint=precision.slice(start);
const guard=paint.indexOf("const photoNative=t.meta?.renderMode==='image-native'");
const clear=paint.indexOf('g.clear();m.clear();');
const off=paint.indexOf('g.setVisible(!photoNative);');
const skip=paint.indexOf('if(photoNative)return;');
const polygon=paint.indexOf('buildTrackRibbon(');
const curbs=paint.indexOf('Mobile-friendly red/white kerbs');
const finish=paint.indexOf('Checkered finish reference');
assert.ok(guard>clear&&off>guard&&skip>off&&polygon>skip,
  'Photo-native guard must clear old pixels and return before road ribbon');
assert.ok(curbs>skip&&finish>skip,
  'Native photo must skip both kerbs and finish stripe');
assert.ok(paint.includes('m.setVisible(!photoNative)'),
  'Painted finish must be hidden in photo native mode');
assert.ok(legacy.includes('  _drawRealTrack(){'),
  'Classic track artist remains intact');
assert.ok(editor.includes('getTrackBeautyLayerConfig(this._trackId)'),
  'Environment Studio keeps showing the loaded photograph');
assert.ok(registry.includes('meta:{...(json.meta||{})'),
  'Registry must propagate image-native metadata to Environment Studio');
assert.ok(generated.includes('karting-tenerife-trackstudio-0.webp'),
  'Karting track must retain baked picture assets');
console.log('Environment Studio: native Karting photo without procedural kerbs, asphalt or duplicated finish: OK');
