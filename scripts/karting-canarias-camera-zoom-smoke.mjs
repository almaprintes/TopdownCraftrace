// Physical Karting Canarias x2.5 scale replaces the obsolete camera-only workaround.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KARTING_CANARIAS_ZOOM_FACTOR,
  raceCameraZoomFactor,
  raceCameraZoomTarget
} from '../src/game/tracks/raceCameraZoom.js';

assert.equal(KARTING_CANARIAS_ZOOM_FACTOR,1);
assert.equal(raceCameraZoomFactor('karting-canarias'),1);
for (const key of ['karting-americas','karting-tenerife','rally-arafo-los-loros',
  'santa-cruz','circuito-atlantico','karting-tenerife-studio',null]) {
  assert.equal(raceCameraZoomFactor(key),1,'Unrelated race zoom must stay unchanged: '+key);
}
for (const speedFraction of [0,.25,.5,.75,1]) {
  const base = 1.06 - (1.06 - .62)*speedFraction;
  assert.ok(Math.abs(raceCameraZoomTarget('karting-canarias',base)-base)<1e-12);
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
assert.deepEqual([photo.worldW,photo.worldH],[5120,7680]);
assert.deepEqual(photo.centerline,source.gameTrack.centerline.map(p=>({...p,x:p.x*2.5,y:p.y*2.5,width:p.width*2.5})));
assert.equal(photo.trackShape.leftEdge.length,source.gameTrack.trackShape.leftEdge.length);
assert.equal(photo.trackShape.leftEdge[0].x,source.gameTrack.trackShape.leftEdge[0].x*2.5);
assert.equal(photo.carScale,1,'Vehicle scale remains stock');
assert.deepEqual(photo.checkpoints.length,2);
console.log('Karting Canarias camera restored to normal while physical road and photo enlarge 2.5x; all cars and camera speed curve unchanged.');
