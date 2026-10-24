import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRelativeSteeringGesture} from '../src/game/controls/relativeSteeringGesture.js';

const near=(a,b,eps=.03)=>assert.ok(Math.abs(a-b)<=eps,`expected ${a} close to ${b}`);
const control=createRelativeSteeringGesture();
near(control.start(180),0);
const small=control.move(192);
assert.ok(small>0&&small<.05,'12px straight correction must be subtle');
const medium=control.move(210);
assert.ok(medium>.16&&medium<.31,'30px should produce a manageable correction');
const corner45=control.move(225);
assert.ok(corner45>.45&&corner45<.52,'45px turn must remain responsive but softer than DEV 1.3.14');
const corner60=control.move(240);
assert.ok(corner60>.79&&corner60<.88,'60px must no longer reach full lock early');
near(control.move(246),1); // Full turning authority remains available.
near(control.move(246),1); // Stationary thumb keeps the chosen turn.
const reduced=control.move(210);
assert.ok(reduced>.16&&reduced<.31,'Returning 30px unwinds without overshoot');
near(control.move(183),0);
for(const x of [181,179,182,180,184,178])near(control.move(x),0); // Finger jitter must not zigzag.
const counter=control.move(165);
assert.ok(counter<-.025&&counter>-.1,'Small reverse stroke stays gentle');
near(control.move(114),-1);
near(control.end(),0);
near(control.move(190),0);
near(control.start(42),0);
near(control.move(44,{inverted:true}),0);
assert.ok(control.move(20,{inverted:true})>.1,'Inversion remains available');
control.end();
control.start(100);
const direct=control.move(130);
control.end();
control.start(100);
for(let x=101;x<=130;x++)control.move(x);
near(control.value,direct,.001); // Consistent regardless of event batching.
control.end();
control.start(100);
const normal=control.move(125,{sensitivity:1});
control.end();
control.start(100);
const soft=control.move(125,{sensitivity:.5});
assert.ok(soft<normal,'Lower sensitivity must require more travel');
control.end();
const producer=readFileSync('src/game/controls/relativeSteeringGesture.js','utf8');
const scene=readFileSync('src/game/scenes/RaceWheelModeScene.js','utf8');
assert.match(producer,/Math\.pow\(normalized,1\.8\)/);
assert.match(scene,/createRelativeSteeringGesture/);
assert.match(scene,/gesture\.move\(e\.clientX/);
assert.doesNotMatch(scene,/straightExitCorrection|centerline|_tdrWheelReleaseAgeMs/);
assert.match(scene,/pointercancel/);
assert.match(scene,/lostpointercapture/);
assert.match(scene,/_applyWheelSteer\(0\)/);
console.log('PASS: DEV 1.3.15 smoother bends at 45/60px, unchanged near-center sensitivity, full lock at 66px, release, inversion');
