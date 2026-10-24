import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {straightExitCorrection} from '../src/game/controls/straightExitAssist.js';

const centerline=[[0,0],[100,0],[200,0],[300,0]];
const baseline={
  centerline,x:150,y:25,heading:.14,speed:210,trackWidth:160,
  onTrack:true,releaseAgeMs:120,deltaMs:16.67
};
const correction=straightExitCorrection(baseline);
assert.ok(correction<0 && Math.abs(correction)<.011,
  'A car pointing away from a straight must receive a small heading correction, not a snap');

let heading=baseline.heading;
for(let i=0;i<50;i++){
  const d=straightExitCorrection({...baseline,heading,releaseAgeMs:30+i*16.67});
  heading+=d;
}
assert.ok(heading<baseline.heading-.025,
  'On release the CAR orientation must converge toward the authored road heading');
assert.ok(heading>-.25,'The help must not violently swing the car toward the centerline');

assert.equal(straightExitCorrection({...baseline,y:0,heading:0}),0,
  'Already aligned and centered must remain undisturbed');
assert.ok(straightExitCorrection({...baseline,heading:Math.PI})>0,
  'Inverted driving direction must align without using circuit IDs');

for(const rejected of [
  {onTrack:false},{speed:35},{releaseAgeMs:1200},{handbrake:true},
  {isStage:true},{heading:1.1},{x:150,y:150},{deltaMs:0}
]) assert.equal(straightExitCorrection({...baseline,...rejected}),0,
  'Must not assist off-road, slow, long-after-release, handbrake, stage or in gross misalignment');

const corner=[[0,0],[100,0],[150,30],[190,95],[230,165]];
assert.equal(straightExitCorrection({...baseline,centerline:corner,x:150,y:30,heading:.6}),0,
  'No auto-drive toward the center in genuine bends');

// The steering producer and vehicle follow-through remain distinct.
const scene=readFileSync('src/game/scenes/RaceWheelModeScene.js','utf8');
assert.match(scene,/this\._tdrWheelReleaseAgeMs=0/);
assert.match(scene,/this\._tdrWheelPressed=true/);
assert.match(scene,/this\._tdrWheelPressed=false/);
assert.match(scene,/straightExitCorrection\(/);
assert.match(scene,/car\.rotation\+=correction/);
assert.match(scene,/handbrake:this\._tdrHandbrake===true/);
assert.match(scene,/isStage:this\._isStage===true/);
assert.match(scene,/onTrack:this\._onTrack===true/);
assert.match(scene,/this\.carRig\.rotation=car\.rotation/);
console.log('PASS: subtle straight-exit CAR-heading assistance only on-road, on straights and after touch release');
