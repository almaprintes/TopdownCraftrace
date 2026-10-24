import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRelativeSteeringGesture} from '../src/game/controls/relativeSteeringGesture.js';

const near=(a,b,eps=.03)=>assert.ok(Math.abs(a-b)<=eps,`expected ${a} close to ${b}`);
const control=createRelativeSteeringGesture();
// Full steering takes deliberate movement, unlike DEV 1.3.12's twitchy 15px.
near(control.start(180),0);
assert.ok(control.move(210)>.3&&control.value<.6,'30px should produce a controllable moderate turn');
near(control.move(240),1);
near(control.move(240),1); // Holding the thumb still keeps a long bend.
const half=control.move(210);
assert.ok(half>.3&&half<.6,'30px correction should not overshoot neutral');
near(control.move(183),0); // Close to initial coordinate is a stable neutral.
for(const x of [181,179,182,180,184,178])near(control.move(x),0); // Jitter on a straight.
const counter=control.move(165);
assert.ok(counter<-.08&&counter>-.35,'Controlled countersteer follows a deliberate 15px movement');
near(control.move(120),-1);
near(control.end(),0);
near(control.move(190),0); // No stale input after release.

// Neutral point is relative to the latest gesture, not a fixed screen location.
near(control.start(42),0);
near(control.move(44,{inverted:true}),0);
assert.ok(control.move(22,{inverted:true})>.15,'Inverted steering and scaled motion work');
control.end();

// Dividing one deliberate gesture into many pointer events must not change its
// output; no per-event jitter threshold should lose slow finger motion.
control.start(100);
const direct=control.move(130);
control.end();
control.start(100);
for(let x=101;x<=130;x++)control.move(x);
near(control.value,direct,.001);
control.end();

// Existing sensitivity preference must remain effective.
control.start(100);
const normal=control.move(125,{sensitivity:1});
control.end();
control.start(100);
const soft=control.move(125,{sensitivity:.5});
assert.ok(soft<normal,'Lower sensitivity must use more travel for the same turn');
control.end();

// Gameplay wiring and cancellation must remain pointer-specific.
const scene=readFileSync('src/game/scenes/RaceWheelModeScene.js','utf8');
assert.match(scene,/createRelativeSteeringGesture/);
assert.match(scene,/gesture\.move\(e\.clientX/);
assert.doesNotMatch(scene,/e\.clientX-startX/);
assert.match(scene,/pointercancel/);
assert.match(scene,/lostpointercapture/);
assert.match(scene,/_applyWheelSteer\(0\)/);
console.log('PASS: precise 60px steering travel, 5px stable straight center, reversal, sensitivity, inversion and pointer cleanup');
