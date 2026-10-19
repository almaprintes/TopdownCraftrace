// Rally profile regression: track isolation, reverse-like feel, and frame independence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
import {ARAFO_RALLY_TRACK_ID,RALLY_DRIVING_PROFILE,getRallyDrivingProfile,
  nextRallyThrottleHeld,applyRallyDriveProfile} from '../src/game/tracks/rallyDrivingProfile.js';
import {ARAFO_RALLY_PACE,isArafoRallyPace,
  nextArafoThrottleHeld,arafoRallyDrivePace} from '../src/game/tracks/arafoRallyDrivePace.js';
const p=RALLY_DRIVING_PROFILE;
assert.equal(ARAFO_RALLY_TRACK_ID,'rally-arafo-los-loros');
assert.strictEqual(ARAFO_RALLY_PACE,p);
assert.strictEqual(getRallyDrivingProfile(ARAFO_RALLY_TRACK_ID),p);
assert.ok(isArafoRallyPace(ARAFO_RALLY_TRACK_ID));
assert.deepEqual([p.acceleration,p.forwardSpeed,p.reverseSpeed,p.brakeForce,
  p.throttleRampSeconds,p.initialThrottleFraction,p.steering,p.artificialBrakeYaw],
  [1,.22,.6,1.15,.22,.75,1.35,false]);
assert.strictEqual(getRallyDrivingProfile('next-rally',
  {closed:false,raceType:'stage',drivingProfile:'RALLY'}),p);
for(const other of ['karting-canarias','karting-americas','karting-tenerife',
  'santa-cruz','trackstudio','rally-other',null])
  assert.strictEqual(getRallyDrivingProfile(other),null,'Normal track: '+other);
for(const meta of [
  {closed:true,raceType:'circuit',drivingProfile:'RALLY'},
  {closed:false,raceType:'stage'},
  {closed:true,raceType:'stage',drivingProfile:'RALLY'},
  {closed:false,raceType:'circuit',drivingProfile:'RALLY'}
])assert.strictEqual(getRallyDrivingProfile('other',meta),null,'No accidental opt-in');
const base=Object.freeze({accel:640,maxFwd:460,maxRev:260,brakeForce:980});
assert.strictEqual(applyRallyDriveProfile(null,base,1),base);
const start=applyRallyDriveProfile(p,base,0),full=applyRallyDriveProfile(p,base,p.throttleRampSeconds);
assert.equal(start.accel,base.accel*.75);
assert.equal(full.accel,base.accel);
assert.equal(full.maxFwd,base.maxFwd*.22);
assert.equal(full.maxRev,base.maxRev*.60);
assert.equal(full.brakeForce,base.brakeForce*1.15);
assert.equal(nextRallyThrottleHeld(p,.15,false,1/60),0);
for(const hz of [30,40,60,120]){
  let held=0;
  for(let i=0;i<hz;i++)held=nextRallyThrottleHeld(p,held,true,1/hz);
  assert.equal(held,p.throttleRampSeconds,'Time based ramp at '+hz+' fps');
}
assert.strictEqual(arafoRallyDrivePace('other',base,1),base);
assert.equal(nextArafoThrottleHeld(ARAFO_RALLY_TRACK_ID,0,true,.1),.1);
assert.equal(arafoRallyDrivePace(ARAFO_RALLY_TRACK_ID,base,.22).maxFwd,base.maxFwd*.22);
const cars=[CAR_SPECS.helix_spark,CAR_SPECS.helix_comet,CAR_SPECS.helix_vortex];
for(const car of cars){
  const frame=applyRallyDriveProfile(p,{accel:car.accel,maxFwd:car.maxFwd*1.4,
    maxRev:car.maxRev,brakeForce:car.brakeForce},p.throttleRampSeconds);
  assert.ok(frame.accel>0&&frame.maxFwd>0);
  assert.ok(Math.abs(frame.maxFwd/(car.maxFwd*1.4)-p.forwardSpeed)<1e-10);
  assert.ok(Math.abs(frame.accel/car.accel-p.acceleration)<1e-10);
}
assert.ok(cars[1].maxFwd>cars[0].maxFwd,'Car hierarchy preserved');
const spark=cars[0];
assert.ok(Math.abs(spark.maxFwd*1.4*p.forwardSpeed-spark.maxRev*p.reverseSpeed)<12,
  'Spark forward maximum is near the comfortably handled reverse maximum');
assert.deepEqual(base,{accel:640,maxFwd:460,maxRev:260,brakeForce:980});
assert.ok(Object.isFrozen(p));
const track=JSON.parse(readFileSync('src/game/tracks/library/rally-arafo-los-loros/track.json','utf8'));
assert.equal(track.closed,false);assert.equal(track.raceType,'stage');
assert.equal(track.carScale,.35);assert.equal(track.centerline.length,2241);
assert.deepEqual([track.worldW,track.worldH],[1882,3344]);
assert.equal(track.checkpoints.length,2);
for(const key of ['startLine','finishLine'])assert.ok(track[key]?.a&&track[key]?.b);
const src=readFileSync('src/game/scenes/RaceScene.js','utf8');
const brake=readFileSync('src/game/scenes/RaceProgressiveBrakeScene.js','utf8');
assert.match(src,/const rallyProfile = getRallyDrivingProfile\(this\.trackKey, this\.track\?\.meta\)/);
assert.match(src,/this\._rallyThrottleHeldSeconds = nextRallyThrottleHeld\(/);
assert.match(src,/const rallyDrive = applyRallyDriveProfile\(/);
assert.match(src,/if \(rallyProfile\) turnFactor \*= rallyProfile\.steering;/);
assert.match(src,/if \(!rallyProfile && \(this\.track\?\.meta\?\.closed === false/);
assert.match(brake,/getRallyDrivingProfile\(this\.trackKey, this\.track\?\.meta\)/);
assert.match(brake,/\(rallyProfile\?\.brakeForce \?\? 1\)/);
assert.match(src,/if \(newSpeed > maxSpeed\)/);
console.log('RALLY smoke OK: physics, legacy shim, individual cars, 30-120fps, opt-in and Arafo geometry.');
