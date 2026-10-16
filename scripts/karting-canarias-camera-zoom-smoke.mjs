// DEV camera-only framing check for Karting Canarias.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KARTING_CANARIAS_ZOOM_FACTOR,
  raceCameraZoomFactor,
  raceCameraZoomTarget
} from '../src/game/tracks/raceCameraZoom.js';

assert.equal(KARTING_CANARIAS_ZOOM_FACTOR,0.84);
assert.equal(raceCameraZoomFactor('karting-canarias'),0.84);
for (const key of ['karting-americas','karting-tenerife','rally-arafo-los-loros',
  'santa-cruz','circuito-atlantico','karting-tenerife-studio',null]) {
  assert.equal(raceCameraZoomFactor(key),1,'Unrelated race zoom must stay unchanged: '+key);
}
for (const speedFraction of [0,.25,.5,.75,1]) {
  const base = 1.06 - (1.06 - .62)*speedFraction;
  assert.ok(Math.abs(raceCameraZoomTarget('karting-canarias',base)-base*.84)<1e-12);
  assert.equal(raceCameraZoomTarget('karting-tenerife',base),base);
}
const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
assert.match(race,/import \{ raceCameraZoomTarget \} from '\.\.\/tracks\/raceCameraZoom\.js';/);
const dynamic=race.slice(race.indexOf('    // === ZOOM DINÁMICO ==='),race.indexOf('// DEV HUD info (derecha)'));
assert.match(dynamic,/const targetZoom = raceCameraZoomTarget\([\s\S]*?this\.trackKey,[\s\S]*?this\._zoomGameplayMax/);
assert.match(dynamic,/this\._zoomCurrent = Phaser\.Math\.Linear\([\s\S]*?targetZoom/);
assert.match(dynamic,/this\.cameras\.main\.setZoom\(this\.zoom\)/,
  'Must apply track-specific factor to the dynamic target every frame');
const wide=readFileSync('src/game/scenes/RaceWideCameraPreviewScene.js','utf8');
assert.match(wide,/if \(this\.track\?\.meta\?\.renderMode !== 'image-native'\) \{[\s\S]*?installKartingCanariasDividers\(this\)/,
  'Legacy collider paths must not appear over the updated photo');
const photo=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias/track.json','utf8'));
const source=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json','utf8'));
assert.deepEqual([photo.worldW,photo.worldH],[2048,3072]);
assert.deepEqual(photo.centerline,source.gameTrack.centerline);
assert.deepEqual(photo.trackShape,source.gameTrack.trackShape);
assert.equal(photo.carScale,1,'Vehicle scale remains stock');
assert.deepEqual(photo.checkpoints.length,2);
console.log('Karting Canarias zoom: 0.84 of normal dynamic zoom, all other race cameras unchanged, no vehicle/road scaling and no old photo collider overlays.');
