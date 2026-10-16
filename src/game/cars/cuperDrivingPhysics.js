// Crown Cuper — isolated DEV handling experiment (vehicle id: crown_cuper).
//
// Original adaptation of top-down driving concepts documented in:
// https://github.com/ishanmanjrekar/topdown-2d-car-engine (MIT, © 2026 Ishan Manjrekar)
// https://github.com/oseiskar/js-car (MIT, © 2019 Otto Seiskari)
// Models: local velocity decomposition, lateral tire relaxation, corner scrub,
// controlled lift-off/rear breakaway. No upstream code is copied.
// Arcade Physics retains exclusive ownership of integration, collisions and position.
// No clock, rendering, timers or dynamic allocations inside the numeric step.

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const u=clamp(x,0,1);return u*u*(3-2*u);};
const relax=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));

export const CUPER_PHYSICS_VERSION='cuper-dev-3';
 
// DEV-only power tune. The racing baseline used the CROWN Axis values,
// which are not adequate for evaluating Cuper's revised cornering on the
// authored full-size kart tracks. Keep all yaw/lateral response coefficients.
export const CUPER_DEV_POWER=Object.freeze({
  accelMult:1.50,
  topSpeedMult:1.20,
  dragMult:0.65
});
export function applyCuperDevPower(scene){
  if(!scene||scene.carId!=='crown_cuper'||!scene.carParams)return false;
  if(scene._cuperPowerApplied===true)return false;
  const p=scene.carParams;
  const accel=Number(p.accel),maxFwd=Number(p.maxFwd),drag=Number(p.linearDrag);
  if(![accel,maxFwd,drag].every(Number.isFinite))return false;
  p.accel=accel*CUPER_DEV_POWER.accelMult;
  p.maxFwd=maxFwd*CUPER_DEV_POWER.topSpeedMult;
  p.linearDrag=drag*CUPER_DEV_POWER.dragMult;
  scene.accel=p.accel;
  scene.maxFwd=p.maxFwd;
  scene.linearDrag=p.linearDrag;
  // The dirt/asphalt surface layer caches the baseline during create(). Rebase
  // that cache as well so it can't silently restore the Cuper's old power.
  if(scene._tdrSurfaceBase){
    scene._tdrSurfaceBase.accel=p.accel;
    scene._tdrSurfaceBase.maxFwd=p.maxFwd;
    scene._tdrSurfaceBase.linearDrag=p.linearDrag;
  }
  scene._cuperPowerApplied=true;
  return true;
}

export function makeCuperPhysicsState(){
  return {yaw:0,lift:0,previousThrottle:0,slipAngle:0,
    vx:0,vy:0,angle:0,drifting:false,active:false};
}

// The base race update already accelerates, brakes and steers the Arcade body.
// This step only adjusts the resulting velocity and a small, limited yaw delta.
// It never integrates position, never increases speed, never changes hitboxes.
export function stepCuperDrivingPhysics(state,frame,dt){
  if(!state||!frame||!Number.isFinite(dt)||dt<=0)return null;
  const vx=Number(frame.vx),vy=Number(frame.vy),angle=Number(frame.angle);
  const preVx=Number(frame.preVx),preVy=Number(frame.preVy);
  if(![vx,vy,angle,preVx,preVy].every(Number.isFinite))return null;
  dt=clamp(dt,0,.05);

  const steer=clamp(Number(frame.steer)||0,-1,1);
  const throttle=clamp(Number(frame.throttle)||0,0,1);
  const brake=clamp(Number(frame.brake)||0,0,1);
  const speed=Math.hypot(vx,vy);
  const maxSpeed=Math.max(80,Number(frame.maxSpeed)||560);
  const accel=Math.max(0,Number(frame.accel)||0);
  const speed01=clamp(speed/maxSpeed,0,1);
  const load=Math.abs(steer)*smooth((speed-42)/185);
  const surfaceGrip=clamp(Number(frame.surfaceGrip)||1,.25,1.10);

  // Drop in throttle while cornering causes a short forward load transfer.
  const throttleDrop=Math.max(0,state.previousThrottle-throttle);
  state.previousThrottle=throttle;
  state.lift=Math.max(state.lift*Math.exp(-dt*4.5),
    throttleDrop>.08?throttleDrop*load:0);
  state.lift=clamp(state.lift,0,1);

  // Distinct conceptual axle reserves: braking/lift unloads the rear and
  // hard acceleration while steering can saturate the front.
  const frontGrip=clamp(1-.28*load*speed01-.12*throttle*load,.48,1);
  const rearGrip=clamp(1-.38*brake*load-.55*state.lift-.12*load,.25,1);
  const rearBreakaway=clamp(frontGrip-rearGrip,0,.85);
  const rx=-Math.sin(angle),ry=Math.cos(angle),fx=Math.cos(angle),fy=Math.sin(angle);
  const forward=vx*fx+vy*fy;
  const postSide=vx*rx+vy*ry;
  const priorSide=preVx*rx+preVy*ry;

  // The old controller cancels sideways motion very aggressively on steering.
  // Restore a bounded portion of the pre-step lateral inertia and relax it
  // exponentially; do not apply a second tyre solver on top of Arcade Physics.
  const retention=clamp((.18+.34*load+.35*rearBreakaway)*surfaceGrip,0,.72);
  let side=postSide+(priorSide-postSide)*retention;
  side*=Math.exp(-dt*(3.1+3.8*(1-load)+3.2*brake)*surfaceGrip);
  // Avoid sudden numerical/visual lateral jumps after teleport or collision.
  const maxSide=Math.max(18,speed*.36);
  side=clamp(side,-maxSide,maxSide);

  // The DEV 1.2.230 model applied corner scrub on EVERY frame, including
  // full throttle, and lost additional speed by shortening the lateral vector.
  // At a tight karting corner that stacked with the original Arcade tyre drag
  // and made the car too slow to evaluate its handling.
  // Keep Arcade's speed as the authority when the driver is accelerating.
  // Only lifting or braking introduces a small, deliberately bounded scrub.
  const slipRatio=clamp(Math.abs(side)/Math.max(35,speed),0,1);
  const coastFactor=(1-throttle)*(1-throttle);
  // Exponential, time-normalized scrub: the previous per-frame percentage
  // multiplied at 60 Hz and 30 Hz differently, making low-FPS driving slower.
  const scrubRate=(.08*load+.12*slipRatio)*coastFactor;
  const scrubRatio=1-Math.exp(-scrubRate*dt);
  const reducedForward=forward;
  let outVx=fx*reducedForward+rx*side;
  let outVy=fy*reducedForward+ry*side;
  const outSpeed=Math.hypot(outVx,outVy);
  if(outSpeed>1e-6){
    // Exactly preserve the base motor's speed on full gas; otherwise allow a
    // mild time-normalized scrub while sliding without throttle. Never exceed
    // the speed produced by the existing engine, collisions or surface system.
    const desiredSpeed=speed*(1-scrubRatio);
    const k=desiredSpeed/outSpeed;
    outVx*=k;outVy*=k;
  }

  // Light chassis response. The bicycle controller handles primary steering;
  // this applies only a bounded differential for rear slip under lift/braking.
  const desiredYaw=Math.sign(steer)*load*speed01*
    (rearBreakaway*.68+brake*.12-state.lift*.06);
  state.yaw=relax(state.yaw,desiredYaw,5.8,dt);
  if(Math.abs(steer)<.035)state.yaw*=Math.exp(-dt*7);
  const yawDelta=clamp(state.yaw*dt,-.010,.010);
  const resultAngle=angle+yawDelta;
  const resultSpeed=Math.hypot(outVx,outVy);
  state.slipAngle=Math.atan2(Math.abs(side),Math.max(12,Math.abs(reducedForward)));
  state.vx=outVx;state.vy=outVy;state.angle=resultAngle;
  state.drifting=state.slipAngle>.15&&resultSpeed>85;
  state.active=true;
  return state;
}

const eligible=scene=>scene?.carId==='crown_cuper'&&
  scene._raceStarted===true&&scene._tdrEmbeddedReplay!==true&&
  !scene._tdrStatsReplay&&!scene._sessionFinalizing&&
  scene._tdrHandbrake!==true;

function controls(scene){
  const t=scene.touch||{},k=scene.keys||{};
  const keySteer=(!!(k.right?.isDown||k.right2?.isDown)?1:0)-
    (!!(k.left?.isDown||k.left2?.isDown)?1:0);
  const turn=Number(t.steer??t.stickX??0);
  return {
    steer:clamp(Number.isFinite(turn)&&Math.abs(turn)>.02?turn:keySteer,-1,1),
    throttle:Math.max(clamp(Number(t.throttle)||0,0,1),k.up?.isDown||k.up2?.isDown?1:0),
    brake:Math.max(clamp(Number(t.brake)||0,0,1),k.down?.isDown||k.down2?.isDown?1:0)
  };
}

// Install on the lazily loaded final race scene *only* in the DEV build.
// The public build never invokes this installer. All other cars are bypassed
// before any numeric stepping or mutation of body/controls.
export function installCuperDrivingPhysics(RaceScene){
  if(!RaceScene?.prototype||RaceScene.prototype.__tdrCuperPhysicsInstalled)return false;
  const proto=RaceScene.prototype;
  const create=proto.create,update=proto.update;
  if(typeof create!=='function'||typeof update!=='function')return false;
  proto.create=function(...args){
    this._cuperPhysics=makeCuperPhysicsState();
    this._cuperPowerApplied=false;
    const result=create.apply(this,args);
    // Refresh once after the real scene has resolved its garage upgrades.
    // The road-specific speed penalties remain applied by the old controller.
    applyCuperDevPower(this);
    return result;
  };
  proto.update=function(time,delta){
    const shouldProcess=eligible(this);
    // Image-native races defer create() until the photo is decoded. The power
    // tune belongs to the completed car init, never to a loading placeholder.
    if(shouldProcess)applyCuperDevPower(this);
    const body=shouldProcess?this.carBody:null;
    const vel=body?.body?.velocity;
    const valid=vel&&Number.isFinite(vel.x)&&Number.isFinite(vel.y);
    // Collect the previous real momentum before the legacy handling step.
    const preVx=valid?vel.x:0,preVy=valid?vel.y:0;
    const result=update.call(this,time,delta);
    if(!shouldProcess||!valid||!eligible(this))return result;
    const actual=this.carBody;
    if(actual!==body||!actual?.scene||!actual.body?.velocity)return result;
    const v=actual.body.velocity,angle=Number(actual.rotation);
    if(![v.x,v.y,angle].every(Number.isFinite))return result;
    const dt=Number(delta)/1000;
    if(!Number.isFinite(dt)||dt<=0||dt>.10)return result;
    // Surface behaviour stays with the original car×surface resolver.
    const surface=String(this._surface||'TRACK').toUpperCase();
    const grip=Number(this._tdrDynamicLatCapacity);
    const surfaceGrip=Number.isFinite(grip)?grip:
      surface==='OFF'?.40:surface==='GRASS'?.57:surface==='DIRT'?.71:1;
    const input=controls(this);
    const step=stepCuperDrivingPhysics(this._cuperPhysics||(this._cuperPhysics=makeCuperPhysicsState()),{
      vx:v.x,vy:v.y,angle,preVx,preVy,
      steer:input.steer,throttle:input.throttle,brake:input.brake,
      surfaceGrip,maxSpeed:Number(this.maxFwd||this.carParams?.maxFwd)||560,
      accel:Number(this.accel||this.carParams?.accel)||760
    },dt);
    if(!step)return result;
    v.x=step.vx;v.y=step.vy;
    actual.rotation=step.angle;
    if(this.carRig?.scene){
      this.carRig.rotation=step.angle+(this._carVisualRotOffset||0);
    }
    return result;
  };
  Object.defineProperty(proto,'__tdrCuperPhysicsInstalled',{value:true});
  return true;
}
