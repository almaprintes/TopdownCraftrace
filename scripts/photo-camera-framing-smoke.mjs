// Camera A/B regression: open up ONLY DEV photo-native racing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {raceCameraZoomFactor,raceCameraZoomTarget,DEV_PHOTO_CAMERA_MAX_ZOOM}
  from '../src/game/tracks/raceCameraZoom.js';
import {isImageNativeTrackScene} from '../src/game/tracks/imageNativeTrackIdentity.js';
assert.equal(DEV_PHOTO_CAMERA_MAX_ZOOM,0.86);
const photoRuntime={trackKey:'siete-picos',
  track:{meta:{id:'siete-picos',meta:{renderMode:'image-native',imageNative:{schema:1}}}}};
assert.equal(photoRuntime.track.meta.renderMode,undefined);
assert.equal(isImageNativeTrackScene(photoRuntime),true,'Photographic track nested metadata');
assert.equal(isImageNativeTrackScene({...photoRuntime,trackKey:'different-track'}),false);
assert.equal(raceCameraZoomFactor('siete-picos'),1);
for(const track of ['siete-picos','siete-picos-inverso','karting-tenerife',
 'karting-americas','karting-canarias','santa-cruz','circuito-atlantico']){
  for(const raw of [.62,.70,.86,.96,1.06]){
    assert.equal(raceCameraZoomTarget(track,raw),raw,'Legacy and production camera must be unchanged');
    assert.equal(raceCameraZoomTarget(track,raw,true),Math.min(raw,.86),'DEV photo-only camera');
  }
}
assert.equal(raceCameraZoomTarget('siete-picos',1.06,true),.86);
assert.equal(raceCameraZoomTarget('siete-picos',.62,true),.62);
assert.equal(raceCameraZoomTarget('siete-picos',1.06,false),1.06);
const race=fs.readFileSync('src/game/scenes/RaceScene.js','utf8');
const camera=race.slice(race.indexOf('    // === ZOOM DINÁMICO ==='),race.indexOf('// DEV HUD info (derecha)'));
assert.ok(camera.includes("!IS_PROD_BUILD&&isImageNativeTrackScene(this)"));
assert.equal(race.split('!IS_PROD_BUILD&&isImageNativeTrackScene(this)').length-1,2);
assert.ok(!race.includes("this.track?.meta?.renderMode==='image-native'"));
assert.match(camera,/raceCameraZoomTarget\([\s\S]*?this\.trackKey,[\s\S]*?this\._zoomGameplayMax/);
assert.ok(camera.includes('this.cameras.main.setZoom(this.zoom)'));
assert.ok(race.includes('this._zoomCurrent=this.zoom;'),'Initial camera should not start overly enlarged');
assert.ok(race.includes('this.cameras?.main?.zoom ?? this.zoom'),'DEV diagnostics must read the real camera');
const wide=fs.readFileSync('src/game/scenes/RaceWideCameraPreviewScene.js','utf8');
assert.ok(wide.includes('this._zoomGameplayMin = 0.62'));
assert.ok(wide.includes('this._zoomGameplayMax = 1.06'));
const memory=fs.readFileSync('src/game/performance/iosPhotoTileBudget.js','utf8');
assert.ok(memory.includes('IOS_PHOTO_TILE_SCALE=0.65'),'Image memory budget must be unchanged for first camera test');
const loader=fs.readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
assert.ok(loader.includes('photoTileWorldScale(w,img.naturalWidth)'),'Do not modify photo registration');
console.log('PASS: correct nested photo metadata enables zoom cap in DEV; real camera diagnostic; PRODUCTION unaffected.');
