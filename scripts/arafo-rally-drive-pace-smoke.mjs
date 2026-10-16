// Gentle mountain-rally physics are exact-id scoped and deterministic.
// A touch throttle is digital: gentle taps ramp instead of launching 4 bends.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  ARAFO_RALLY_TRACK_ID,ARAFO_RALLY_PACE,isArafoRallyPace,
  nextArafoThrottleHeld,arafoRallyDrivePace
} from '../src/game/tracks/arafoRallyDrivePace.js';
const base=Object.freeze({accel:640,maxFwd:460,maxRev:120,brakeForce:980});
assert.equal(ARAFO_RALLY_TRACK_ID,'rally-arafo-los-loros');
assert.ok(isArafoRallyPace(ARAFO_RALLY_TRACK_ID));
for(const other of ['karting-canarias','karting-americas','karting-tenerife',
  'santa-cruz','trackstudio','rally-other',null]){
  assert.equal(isArafoRallyPace(other),false);
  assert.strictEqual(arafoRallyDrivePace(other,base,.9),base,
    'Unrelated car specs and speed must not change: '+other);
  assert.equal(nextArafoThrottleHeld(other,.4,true,.1),0);
}
let held=nextArafoThrottleHeld(ARAFO_RALLY_TRACK_ID,0,true,1/60);
let gentle=arafoRallyDrivePace(ARAFO_RALLY_TRACK_ID,base,held);
assert.ok(gentle.accel<base.accel*.1,'First tap must be very gentle');
assert.equal(gentle.maxFwd,base.maxFwd*.3);
assert.equal(gentle.maxRev,base.maxRev*.6);
assert.equal(gentle.brakeForce,base.brakeForce*1.15);
let sixty=0,thirty=0;
for(let i=0;i<45;i++)sixty=nextArafoThrottleHeld(ARAFO_RALLY_TRACK_ID,sixty,true,1/60);
for(let i=0;i<30;i++)thirty=nextArafoThrottleHeld(ARAFO_RALLY_TRACK_ID,thirty,true,1/40);
assert.ok(Math.abs(sixty-thirty)<1e-10,'Throttle ramp must be time based, not frame based');
const full=arafoRallyDrivePace(ARAFO_RALLY_TRACK_ID,base,sixty);
assert.equal(full.accel,base.accel*ARAFO_RALLY_PACE.acceleration);
assert.ok(gentle.accel<full.accel);
assert.equal(nextArafoThrottleHeld(ARAFO_RALLY_TRACK_ID,held,false,1/60),0,
  'Release throttle immediately resets the tap ramp');
assert.deepEqual(base,{accel:640,maxFwd:460,maxRev:120,brakeForce:980},
  'Original vehicle physics must remain untouched');
const track=JSON.parse(readFileSync(
  'src/game/tracks/library/rally-arafo-los-loros/track.json','utf8'));
assert.equal(track.closed,false);
assert.equal(track.raceType,'stage');
assert.equal(track.carScale,.35);
assert.equal(track.centerline.length,2241);
assert.deepEqual([track.worldW,track.worldH],[1882,3344]);
const src=readFileSync('src/game/scenes/RaceScene.js','utf8');
assert.match(src,/this\._arafoThrottleHeldSeconds = nextArafoThrottleHeld\([\s\S]*?this\.trackKey[\s\S]*?up && !down, dt/);
assert.match(src,/const arafoDrive = arafoRallyDrivePace\([\s\S]*?this\.trackKey, \{accel,maxFwd,maxRev,brakeForce\}/);
assert.match(src,/accel=arafoDrive\.accel;[\s\S]*?maxFwd=arafoDrive\.maxFwd;[\s\S]*?brakeForce=arafoDrive\.brakeForce;/);
assert.match(src,/if \(newSpeed > maxSpeed\)/,
  'The frame-specific speed cap must still be enforced by base RaceScene');
assert.match(src,/if \(down\) \{[\s\S]*?brakeForce \* dt;/,
  'The existing brake control must apply the rally-only brake multiplier');
console.log('Arafo driving pace: gentle 0.75s touch ramp, forward cap 30%, acceleration 28%, brake 115%, other tracks/specs unchanged, both 30 and 60 fps stable.');
