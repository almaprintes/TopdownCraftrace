// 7 Picos and 7 Picos Inverso are official published race identities.
// No alternate card in selector; same physical photo and environment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const picker=read('src/game/scenes/EnvironmentBuilderTrackVisiblePickerScrollScene.js');
assert.match(picker,/available\.includes\('siete-picos'\)/);
assert.match(picker,/this\._chooseRealTrack\(key\)/);
const track=JSON.parse(read('src/game/tracks/library/siete-picos/track.json'));
assert.deepEqual([track.worldW,track.worldH],[4344,3258]);
assert.equal(track.meta.hiddenFromTrackSelect,false);
assert.equal(track.meta.imageNative.worldScale,undefined);
const ids=read('src/game/tracks/trackUnlocks.js');
assert.match(ids,/'siete-picos','siete-picos-inverso'/);
assert.doesNotMatch(ids,/DEV_SEVEN_PEAKS_ID/);
const player=read('src/game/scenes/TrackGaragePlayerLightScene.js');
assert.match(player,/!isCircuitAlternate\(key\)/);
const names=read('src/game/tracks/trackPublicNames.js');
assert.match(names,/'siete-picos':'7 PICOS'/);
assert.match(names,/'siete-picos-inverso':'7 PICOS INVERSO'/);
const variants=read('src/game/tracks/trackReverseVariant.js');
assert.match(variants,/base:'siete-picos',alternate:'siete-picos-inverso'/);
console.log('PASS: 7 Picos official, inverse selectable, separate ranking identities; shared environment/photo.');
