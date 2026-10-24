import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rcAxisValue,rcThrottleBrake} from '../src/game/controls/rcTwinAxis.js';
import {defaultControlLayout,migrateLegacyRcDefaultLayout,readControlLayout} from '../src/game/controls/controlLayout.js';

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

// RC handset handedness: right-handed drivers steer left, drive right.
const right=defaultControlLayout({steeringMode:'rc_twin',leftHanded:false});
const left=defaultControlLayout({steeringMode:'rc_twin',leftHanded:true});
assert.ok(right.steer.x<.5&&right.gas.x>.5,'Right-handed: steering LEFT, throttle/brake RIGHT');
assert.ok(left.steer.x>.5&&left.gas.x<.5,'Left-handed: steering RIGHT, throttle/brake LEFT');
near(right.steer.x,1-left.steer.x);
near(right.gas.x,1-left.gas.x);
// A saved default from DEV 1.3.17-1.3.18 is migrated to corrected positions
// while the user's intentional custom positions remain unchanged.
const oldRight={steer:{x:.73,y:.72,scale:1.25},gas:{x:.18,y:.70,scale:.9},handbrake:{x:.94,y:.77,scale:1}};
const oldLeft={steer:{x:.27,y:.72,scale:1.1},gas:{x:.82,y:.70,scale:1.2}};
const rightMigrated=migrateLegacyRcDefaultLayout(oldRight,{steeringMode:'rc_twin',leftHanded:false});
const leftMigrated=migrateLegacyRcDefaultLayout(oldLeft,{steeringMode:'rc_twin',leftHanded:true});
near(rightMigrated.steer.x,right.steer.x);
near(rightMigrated.gas.x,right.gas.x);
near(leftMigrated.steer.x,left.steer.x);
near(leftMigrated.gas.x,left.gas.x);
near(rightMigrated.steer.scale,1.25);
near(rightMigrated.gas.scale,.9);
near(rightMigrated.handbrake.x,.94);
const custom={steer:{x:.61,y:.74,scale:1},gas:{x:.31,y:.68,scale:1}};
assert.equal(migrateLegacyRcDefaultLayout(custom,{steeringMode:'rc_twin',leftHanded:false}),custom,'Never overwrite deliberate personalized positions');

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
const invisibleLayer=readFileSync('src/game/scenes/RaceInvisibleSteeringScene.js','utf8');
assert.ok(hb.includes("from './RaceInvisibleSteeringScene.js'"),'Handbrake must keep invisible layer in scene chain');
assert.ok(invisibleLayer.includes("from './RaceRcTwinAxisScene.js'"),'Invisible layer must preserve RC and other modes');
assert.match(hb,/if\(!this\._tdrRcMode\)this\._buildPedalRow\(\)/);
assert.match(settings,/dataset\.v='rc_twin'/);
assert.match(settings,/c\.steeringMode==='rc_twin'/);
assert.ok(layout.includes("['stick','buttons','wheel','rc_twin','invisible']"),'Saved control types must include invisible');
assert.match(layout,/\['stick','buttons','wheel','rc_twin'\]/);
assert.match(layout,/mode==='rc_twin'/);
assert.match(wheel,/_tdrWheelMode=prefs\(\)\.steeringMode==='wheel'/);
console.log('PASS: RC handed default layout, preserved custom layouts, migration of old factory positions, independent sticks and other modes');
