import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rcAxisValue,rcThrottleBrake} from '../src/game/controls/rcTwinAxis.js';

const near=(v,expected,eps=.001)=>assert.ok(Math.abs(v-expected)<eps,`expected ${v} ~= ${expected}`);
near(rcAxisValue(100,100,80),0);
near(rcAxisValue(101,100,80),0);
near(rcAxisValue(100+80,100,80),1);
near(rcAxisValue(100-80,100,80),-1);
near(rcAxisValue(180,100,80,{inverted:true}),-1);
near(rcAxisValue(125,100,80,{sensitivity:.5}),rcAxisValue(112.5,100,80));
assert.ok(rcAxisValue(120,100,80)>0&&rcAxisValue(120,100,80)<.3,'gentle analog steering');
near(-rcAxisValue(20,100,80),1); // vertical thumb up = gas
near(-rcAxisValue(180,100,80),-1); // vertical thumb down = brake
assert.deepEqual(rcThrottleBrake(0),{throttle:0,brake:0});
assert.deepEqual(rcThrottleBrake(.8),{throttle:.8,brake:0});
assert.deepEqual(rcThrottleBrake(-.4),{throttle:0,brake:.4});
assert.deepEqual(rcThrottleBrake(2),{throttle:1,brake:0});
assert.deepEqual(rcThrottleBrake(-2),{throttle:0,brake:1});
assert.deepEqual(rcThrottleBrake(NaN),{throttle:0,brake:0});

const rc=readFileSync('src/game/scenes/RaceRcTwinAxisScene.js','utf8');
const hb=readFileSync('src/game/scenes/RaceHandbrakeScene.js','utf8');
const settings=readFileSync('src/game/scenes/SettingsWheelModeScene.js','utf8');
const layout=readFileSync('src/game/controls/controlLayout.js','utf8');
const wheel=readFileSync('src/game/scenes/RaceWheelModeScene.js','utf8');

assert.match(rc,/steeringMode==='rc_twin'/);
assert.match(rc,/createTouchControls\(\)/);
assert.match(rc,/bind\(steer,'steer'\)/);
assert.match(rc,/bind\(drive,'drive'\)/);
assert.match(rc,/e\.clientX/);
assert.match(rc,/e\.clientY/);
assert.match(rc,/setPointerCapture/);
assert.match(rc,/lostpointercapture/);
assert.match(rc,/pointercancel/);
assert.match(rc,/window\.addEventListener\('blur',clear\)/);
assert.match(rc,/this\._applyWheelSteer\(this\._tdrRcSteer\)/);
assert.match(rc,/this\.accel=oldAccel\*clamp\(this\._tdrRcGas/);
assert.match(rc,/this\.brakeForce=oldBrakeForce\*clamp\(this\._tdrRcBrake/);
assert.match(rc,/if\(!this\._tdrRcMode\)return super\.update\(time,delta\)/);
assert.doesNotMatch(rc,/setInterval|requestAnimationFrame|centerline|track\.geom/);
assert.match(hb,/from '.\/RaceRcTwinAxisScene\.js'/);
assert.match(hb,/if\(!this\._tdrRcMode\)this\._buildPedalRow\(\)/);
assert.match(settings,/data\.v='rc_twin'/);
assert.match(settings,/c\.steeringMode==='rc_twin'/);
assert.match(layout,/rc_twin:\{steer:/);
assert.match(layout,/\['stick','buttons','wheel','rc_twin'\]/);
assert.match(layout,/mode==='rc_twin'/);
assert.match(wheel,/_tdrWheelMode=prefs\(\)\.steeringMode==='wheel'/);
console.log('PASS: RC two independent absolute spring-centered single-axis sticks, analog gas/brake, inversion, calibration and original modes intact');
