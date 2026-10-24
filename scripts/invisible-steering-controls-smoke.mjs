import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInvisibleSteeringGesture} from '../src/game/controls/invisibleSteeringGesture.js';
import {defaultControlLayout,controlLayoutKey} from '../src/game/controls/controlLayout.js';
const near=(x,v,eps=.025)=>assert.ok(Math.abs(x-v)<=eps,`expected ${x} close to ${v}`);

const gesture=createInvisibleSteeringGesture({travelPx:92});
near(gesture.start(190),0);
near(gesture.move(190),0);  // Never jump when first touching the region.
const right=gesture.move(236);
assert.ok(right>.35&&right<.48,'Right movement generates progressive steering');
near(gesture.move(236),right); // Still finger means stable car heading request.
near(gesture.move(190),0);    // Returning to gesture anchor restores neutral.
assert.ok(gesture.move(144)<-.35,'A LEFT swipe from any origin steers LEFT');
near(gesture.end(),0);     // Instantly neutral, without UI or animation.
near(gesture.move(300),0); // Released pointer must never steer.
near(gesture.start(40),0); // Fresh finger has a fresh, local center.
assert.ok(gesture.move(132)>.99,'Full steer reached by deliberate 92px movement');
near(gesture.end(),0);

const inverse=createInvisibleSteeringGesture({travelPx:92,sensitivity:1,inverted:true});
inverse.start(220);
assert.ok(inverse.move(250)<0,'Invert direction honored');
inverse.end();
const low=createInvisibleSteeringGesture({travelPx:92,sensitivity:.5});
const high=createInvisibleSteeringGesture({travelPx:92,sensitivity:1.5});
low.start(100);high.start(100);
assert.ok(low.move(140)<high.move(140),'Existing sensitivity preference is honored');
low.end();high.end();
assert.equal(controlLayoutKey({steeringMode:'invisible',leftHanded:false}),'invisible:right');
assert.equal(controlLayoutKey({steeringMode:'invisible',leftHanded:true}),'invisible:left');
const layout=defaultControlLayout({steeringMode:'invisible',leftHanded:false});
assert.ok(layout.gas.x>.5&&layout.brake.x>.5,'Original pedals remain on right');
assert.equal(layout.steer,undefined,'Do not render or calibrate any visible joystick');
const scene=readFileSync('src/game/scenes/RaceInvisibleSteeringScene.js','utf8');
const hb=readFileSync('src/game/scenes/RaceHandbrakeScene.js','utf8');
const menu=readFileSync('src/game/scenes/SettingsWheelModeScene.js','utf8');
const visual=readFileSync('src/main.js','utf8');
assert.match(scene,/this\._tdrInvisibleSteeringMode=pref\.steeringMode==='invisible'/);
assert.match(scene,/width:50vw/);
assert.match(scene,/background:transparent/);
assert.match(scene,/createInvisibleSteeringGesture/);
assert.match(scene,/pointerdown/);assert.match(scene,/pointermove/);
assert.match(scene,/pointerup/);assert.match(scene,/pointercancel/);
assert.match(scene,/lostpointercapture/);assert.match(scene,/setPointerCapture/);
assert.match(scene,/window\.addEventListener\('blur',blur\)/);
assert.match(scene,/document\.addEventListener\('visibilitychange',onVisibility\)/);
assert.match(scene,/_applyWheelSteer\(steer\)/);
assert.match(scene,/this\.turnRate=previousRate\*Math\.abs\(steer\)/);
assert.doesNotMatch(scene,/setInterval\(|requestAnimationFrame\(|centerline|roadGeometry|track\.meta/);
assert.match(hb,/from '.\/RaceInvisibleSteeringScene\.js'/);
assert.match(hb,/if\(!this\._tdrRcMode\)this\._buildPedalRow\(\)/);
assert.match(hb,/!this\._tdrInvisibleSteeringMode/);
assert.match(menu,/dataset\.v='invisible'/);
assert.match(menu,/c\.steeringMode==='invisible'/);
assert.match(visual,/invisibleMode=race\?\._tdrInvisibleSteeringMode===true/);
assert.match(visual,/rcMode\?'none':'block'/); // Existing pedal behavior unchanged.
console.log('PASS: full invisible touch half, floating 1D neutral, precise left/right, release, prefs, original pedals & no new frame work');
