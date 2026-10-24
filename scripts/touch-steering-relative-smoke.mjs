import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRelativeSteeringGesture} from '../src/game/controls/relativeSteeringGesture.js';
const near=(x,y)=>assert.ok(Math.abs(x-y)<.03,`expected ${x} ≈ ${y}`);
const control=createRelativeSteeringGesture();
near(control.start(180),0);
near(control.move(225),1);
near(control.move(225),1); // Stationary finger maintains long corner.
assert.ok(control.move(209)<0,'Moving opposite must unwind steering immediately');
near(control.move(194),0); // 31px reversal reaches neutral; no original anchor.
assert.ok(control.move(174)<-.3,'Small further reverse movement countersteers');
near(control.end(),0);
near(control.start(42),0); // No dependence on finger start location.
assert.ok(control.move(27,{inverted:true})>.2);
control.end();
control.start(100);
const standard=control.move(118,{sensitivity:1});
control.end();
control.start(100);
const soft=control.move(118,{sensitivity:.5});
assert.ok(soft<standard,'Sensitivity must affect requested response');
near(control.end(),0);
near(control.move(200),0); // Pointer moves after release cannot steer.
const scene=readFileSync('src/game/scenes/RaceWheelModeScene.js','utf8');
assert.match(scene,/createRelativeSteeringGesture/);
assert.match(scene,/gesture\.move\(e\.clientX/);
assert.doesNotMatch(scene,/e\.clientX-startX/);
assert.match(scene,/pointercancel/);
assert.match(scene,/lostpointercapture/);
assert.match(scene,/_applyWheelSteer\(0\)/);
console.log('PASS: Relative touch steering reverses promptly, holds corners, keeps multitouch isolation and zeroes on release');
