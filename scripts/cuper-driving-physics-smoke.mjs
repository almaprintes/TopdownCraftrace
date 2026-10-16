import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CUPER_PHYSICS_VERSION,makeCuperPhysicsState,
  stepCuperDrivingPhysics,installCuperDrivingPhysics
} from '../src/game/cars/cuperDrivingPhysics.js';

assert.equal(CUPER_PHYSICS_VERSION,'cuper-dev-1');
const direct=makeCuperPhysicsState();
const basic={vx:280,vy:0,preVx:280,preVy:0,angle:0,
  steer:0,throttle:1,brake:0,maxSpeed:780,accel:760,surfaceGrip:1};
assert.equal(stepCuperDrivingPhysics(direct,basic,0),null,'No physics at dt=0');
assert.equal(stepCuperDrivingPhysics(direct,basic,1/60),direct);
assert.equal(direct.vx,280,'Straight acceleration must remain owned by Arcade');
assert.equal(direct.vy,0,'Straight driving must not create side slip');
assert.equal(direct.angle,0);

const turn=makeCuperPhysicsState();
const theta=.15,speed=320;
const corner={vx:speed*Math.cos(theta),vy:speed*Math.sin(theta),
  preVx:speed,preVy:0,angle:theta,
  steer:.95,throttle:.9,brake:0,maxSpeed:780,accel:760,surfaceGrip:1};
stepCuperDrivingPhysics(turn,corner,1/60);
assert.ok(turn.vx>0&&turn.vy>=0,'Forward motion remains finite and correctly oriented');
assert.ok(Math.hypot(turn.vx,turn.vy)<=speed+1e-8,'Tyre dynamics must not add kinetic energy');
assert.ok(turn.slipAngle>.005,'Cornering must retain some lateral inertia');
assert.ok(Number.isFinite(turn.angle));

const braking={...corner,brake:1,throttle:0};
stepCuperDrivingPhysics(turn,braking,1/60);
assert.ok(turn.lift>0,'Throttle lift builds forward load transfer');
assert.ok(turn.yaw>0,'Right steering + loaded rear produces progressive yaw');
assert.ok(Math.abs(turn.angle-braking.angle)<.011,'Supplemental yaw stays bounded');
assert.ok(turn.slipAngle>=0&&turn.slipAngle<Math.PI/2);

function coastAt(hz){
  const s=makeCuperPhysicsState();
  let vx=200,vy=45;
  for(let i=0;i<hz;i++){
    const r=stepCuperDrivingPhysics(s,{
      vx,vy,preVx:vx,preVy:vy,angle:0,steer:0,throttle:0,brake:0,
      maxSpeed:780,accel:760,surfaceGrip:1
    },1/hz);
    vx=r.vx;vy=r.vy;
  }
  return {vx,vy,angle:s.angle};
}
const at30=coastAt(30),at60=coastAt(60);
assert.ok(Math.abs(at30.vy-at60.vy)<.05,'Lateral tyre decay must be FPS independent');
assert.ok(Math.abs(at30.vx-at60.vx)<.05,'Longitudinal resistance must be FPS independent');
for(const val of [-12,NaN,Infinity]) {
  const s=makeCuperPhysicsState();
  assert.equal(stepCuperDrivingPhysics(s,corner,val),null,'Bad dt must not mutate physics');
}
assert.equal(stepCuperDrivingPhysics(makeCuperPhysicsState(),{...corner,vx:NaN},1/60),null);

class FakeRace {
  create(data) {
    this.carId=data?.carId;
    this._raceStarted=true;
    this._surface='TRACK';
    this.touch={steer:.95,throttle:.9,brake:0};
    this.keys={};
    this.carParams={maxFwd:780,accel:760};
    this.carBody={scene:true,rotation:0,body:{velocity:{x:290,y:0}}};
    this.carRig={scene:true,rotation:0};
    return 'created';
  }
  update() {
    this.carBody.rotation=.18;
    this.carBody.body.velocity.x=290*Math.cos(.18);
    this.carBody.body.velocity.y=290*Math.sin(.18);
    return 'base-update';
  }
}
assert.equal(installCuperDrivingPhysics(FakeRace),true);
assert.equal(installCuperDrivingPhysics(FakeRace),false,'Must not install twice');
const legacy=()=>{
  const x=290*Math.cos(.18),y=290*Math.sin(.18);
  return {vx:x,vy:y,rotation:.18};
};
const old=legacy();
for(const carId of ['crown_axis','crown_vector','helix_spark']){
  const car=new FakeRace();car.create({carId});
  assert.equal(car.update(0,16.667),'base-update');
  assert.equal(car.carBody.body.velocity.x,old.vx,'Other vehicles stay EXACTLY unchanged');
  assert.equal(car.carBody.body.velocity.y,old.vy);
  assert.equal(car.carBody.rotation,old.rotation);
  assert.equal(car._cuperPhysics?.active,false);
}
const cuper=new FakeRace();assert.equal(cuper.create({carId:'crown_cuper'}),'created');
assert.equal(cuper.update(0,16.667),'base-update');
assert.ok(cuper._cuperPhysics.active,'Cuper must receive the experimental solver');
assert.ok(Math.hypot(cuper.carBody.body.velocity.x,cuper.carBody.body.velocity.y)<=290+1e-8);
assert.notEqual(cuper.carBody.body.velocity.y,old.vy,'Cuper gets different lateral motion');
assert.equal(cuper.carRig.rotation,cuper.carBody.rotation,'Visual rig follows corrected heading');
cuper.create({carId:'crown_cuper'});
assert.equal(cuper._cuperPhysics.active,false,'New session resets accumulated slip');
for(const flag of [{_raceStarted:false},{_tdrEmbeddedReplay:true},
  {_tdrHandbrake:true},{_tdrStatsReplay:{playing:true}},{_sessionFinalizing:true}]){
  const car=new FakeRace();car.create({carId:'crown_cuper'});
  Object.assign(car,flag);car.update(0,16.667);
  assert.equal(car.carBody.body.velocity.y,old.vy,'Special race/handbrake/replay modes untouched');
  assert.equal(car._cuperPhysics.active,false);
}
const game=readFileSync('src/game/game.js','utf8');
assert.ok(game.includes("if(!IS_PROD_BUILD)installCuperDrivingPhysics(RaceScene)"),
  'Only DEV installs Cuper dynamics; public build remains bit-for-bit legacy');
const spec=readFileSync('src/game/cars/carSpecs.js','utf8');
assert.ok(spec.includes("crown_cuper: {")&&spec.includes("maxFwd: 560.7,"),
  'Cuper identity and original shop/upgrades remain untouched');
console.log('CUPER PHYSICS DEV OK: independent car, no public install, lateral drift, scrub, lift yaw, reset, 30/60fps, handbrake/replay bypass');
