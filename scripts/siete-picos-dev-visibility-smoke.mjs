// 7 Picos is editable immediately and drivable only on DEV builds.
// Never make this unpublished circuit an official public track.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const envSelector=read('src/game/scenes/EnvironmentBuilderTrackVisiblePickerScrollScene.js');
assert.match(envSelector,/available\.includes\('siete-picos'\)/);
assert.match(envSelector,/\['siete-picos',\.\.\.available\.filter/);
assert.match(envSelector,/this\._chooseRealTrack\(key\)/);
const source=read('src/game/tracks/library/siete-picos/track.json');
const seven=JSON.parse(source);
assert.equal(seven.name,'7 PICOS');
assert.equal(seven.meta.hiddenFromTrackSelect,true,'Source remains hidden in public builds');
assert.equal(seven.meta.imageNative.worldScale,2.5);
const unlock=read('src/game/tracks/trackUnlocks.js');
assert.match(unlock,/!IS_PROD_BUILD&&key===DEV_SEVEN_PEAKS_ID/);
assert.match(unlock,/!IS_PROD_BUILD&&id===DEV_SEVEN_PEAKS_ID/);
const publication=unlock.match(/export const PUBLISHED_TRACK_IDS[\s\S]*?export const STARTER_TRACK_IDS/);
assert.ok(publication);
assert.doesNotMatch(publication[0],/siete-picos/,'DEV circuit cannot enter public IDs');
const player=read('src/game/scenes/TrackGaragePlayerLightScene.js');
assert.match(player,/!IS_PROD_BUILD&&key==='siete-picos'/);
assert.match(player,/devSevenPeaks\|\|track\?\.meta\?\.hiddenFromTrackSelect!==true/);
assert.match(player,/selectableKey\(key\)/);
console.log('PASS: 7 Picos pinned in Environment Studio; DEV player access only; official public track IDs unchanged.');
