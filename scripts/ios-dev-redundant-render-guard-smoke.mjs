import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  skipIosDevPhotoMaterialSync,
  skipIosDevPreUpdateSteeringScan
} from '../src/game/performance/iosDevRedundantPassGuard.js';

const truthy={isProd:false,isIphone:true,beautyLayerActive:true,embedded:false};
assert.equal(skipIosDevPhotoMaterialSync(truthy),true);
assert.equal(skipIosDevPhotoMaterialSync({...truthy,isProd:true}),false);
assert.equal(skipIosDevPhotoMaterialSync({...truthy,isIphone:false}),false);
assert.equal(skipIosDevPhotoMaterialSync({...truthy,beautyLayerActive:false}),false);
assert.equal(skipIosDevPhotoMaterialSync(),false);
assert.equal(skipIosDevPreUpdateSteeringScan(truthy),true);
assert.equal(skipIosDevPreUpdateSteeringScan({...truthy,isProd:true}),false);
assert.equal(skipIosDevPreUpdateSteeringScan({...truthy,isIphone:false}),false);
assert.equal(skipIosDevPreUpdateSteeringScan({...truthy,embedded:true}),false);
assert.equal(skipIosDevPreUpdateSteeringScan(),false);

const photo=readFileSync(new URL('../src/game/scenes/RaceRealSurfaceAssetsScene.js',import.meta.url),'utf8');
const gamepad=readFileSync(new URL('../src/game/scenes/RaceEmbeddedReplaySceneV2.js',import.meta.url),'utf8');
// Runtime guards must be evaluated once when the scene is created, not
// by constructing options objects or querying the user agent on every frame.
assert.match(photo,/create\(data\).*_tdrIphoneDevMaterialGuard=skipIosDevPhotoMaterialSync/);
assert.match(photo,/update\(time,delta\)\{super\.update\?\.\(time,delta\);if\(this\._tdrIphoneDevMaterialGuard===true&&this\._beautyLayerActive===true\)return;this\._applyAtlanticoSurfacePresentation\(\);\}/);
assert.match(gamepad,/this\._tdrIphoneDevSteeringGuard=skipIosDevPreUpdateSteeringScan/);
assert.match(gamepad,/if\(!this\._tdrIphoneDevSteeringGuard\)this\._tdrHideResidualPhaserSteering\(\);/);
assert.match(gamepad,/if\(!androidNormal\)this\._tdrHideResidualPhaserSteering\(\);/);
assert.equal(gamepad.split('_tdrHideResidualPhaserSteering();').length-1,2);
console.log('15 iPhone DEV redundant-pass isolation and integration assertions passed.');
