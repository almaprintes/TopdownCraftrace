import { RaceScene as CurrentRaceScene } from './RaceTimingCelebrationVisibleScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
function wrapPi(a){
  while(a>Math.PI)a-=Math.PI*2;
  while(a<-Math.PI)a+=Math.PI*2;
  return a;
}
function smoothstep01(t){
  t=clamp(t,0,1);
  return t*t*(3-2*t);
}

// Handling preview: kinematic bicycle steering + rear-axle pivot.
// Isolated as a top layer so it can be tuned or removed without touching
// throttle, braking, surface penalties, crafting upgrades or timing logic.
export class RaceScene extends CurrentRaceScene {
  constructor(){
    super();
    this._bikeHandlingEnabled=true;
    this._bikeSteerFiltered=0;
    this._bikeYawFiltered=0;
    this._racePhysicsWakeDone=false;
  }

  create(data){
    const result=super.create(data);

    // Defensive reset for scene re-entry. If Arcade Physics was left paused by a
    // previous race/orientation transition, game logic can still increase the
    // velocity vector while the body never integrates its position. That exact
    // state looks like "speedometer rises, car turns, but it does not advance".
    try { this.physics?.world?.resume?.(); } catch (_) {}
    const b=this.carBody?.body;
    if(b){
      b.enable=true;
      b.moves=true;
      b.immovable=false;
      if('pushable' in b) b.pushable=true;
    }
    this._racePhysicsWakeDone=false;

    return result;
  }

  _ensureRacePhysicsLive(){
    if(this._racePhysicsWakeDone || !this._raceStarted) return;

    // Do this once, exactly when the countdown has actually released the car.
    // We deliberately do not touch velocity or position, so normal starts and
    // collisions remain physically identical.
    try { this.physics?.world?.resume?.(); } catch (_) {}

    const b=this.carBody?.body;
    if(b){
      b.enable=true;
      b.moves=true;
      b.immovable=false;
      if('pushable' in b) b.pushable=true;
    }

    try { this.carBody?.setActive?.(true); } catch (_) {}
    this._racePhysicsWakeDone=true;
  }

  _bikeVisualLength(){
    const sprite=this.carRig?.list?.find?.(o=>o?.texture) || this.carRig?.list?.[0];
    const w=Number(sprite?.displayWidth || sprite?.width || 0);
    if(Number.isFinite(w) && w>20) return clamp(w,58,150);
    const spec=CAR_SPECS[this.carId] || CAR_SPECS.stock;
    return clamp(92*(Number(spec?.visualScale)||1),58,150);
  }

  _bikeSteerInput(rawYaw,dt){
    const t=this.touch || {};
    let steer=Number(t.steer || 0);

    // Keyboard fallback.
    if(Math.abs(steer)<0.02){
      const k=this.keys || {};
      const left=!!(k.left?.isDown || k.left2?.isDown);
      const right=!!(k.right?.isDown || k.right2?.isDown);
      if(left!==right) steer=right?1:-1;
    }

    // Last fallback: infer driver intention from the steering that the base
    // controller just applied. This preserves absolute-stick modes.
    if(Math.abs(steer)<0.02 && Math.abs(rawYaw)>1e-5){
      const spec=CAR_SPECS[this.carId] || CAR_SPECS.stock;
      const maxBase=Math.max(0.001,Number(this.carParams?.turnRate || spec?.turnRate || 4)*dt);
      steer=clamp(rawYaw/maxBase,-1,1);
    }

    steer=clamp(steer,-1,1);

    // Wider neutral zone: small thumb movements are trajectory corrections,
    // not immediate nose rotation.
    const dead=0.11;
    const sign=Math.sign(steer);
    let mag=Math.abs(steer);
    mag=mag<=dead?0:(mag-dead)/(1-dead);

    // Strong progressive curve. The first half of stick travel is deliberately
    // soft, while the outer edge still reaches full lock for tight corners.
    mag=Math.pow(mag,1.75);
    const shaped=sign*mag;

    // Slower, framerate-independent steering filter for a more analogue feel.
    const alpha=1-Math.exp(-dt*6.2);
    this._bikeSteerFiltered += (shaped-this._bikeSteerFiltered)*alpha;
    if(Math.abs(shaped)<0.001 && Math.abs(this._bikeSteerFiltered)<0.0015) this._bikeSteerFiltered=0;

    return clamp(this._bikeSteerFiltered,-1,1);
  }

  update(time,delta){
    const bodyBefore=this.carBody;
    const prevRot=Number(bodyBefore?.rotation);

    super.update(time,delta);
    this._ensureRacePhysicsLive();

    if(!this._bikeHandlingEnabled) return;
    const body=this.carBody;
    if(!body?.scene || !body.body?.velocity || !Number.isFinite(prevRot)) return;

    const dt=clamp(Number(delta||16.67)/1000,0.001,0.05);
    const baseRot=Number(body.rotation||0);
    const rawYaw=wrapPi(baseRot-prevRot);

    // Ignore resets/teleports/grid placement rather than turning them into steering.
    if(Math.abs(rawYaw)>0.65){
      this._bikeYawFiltered=0;
      return;
    }

    const vx=Number(body.body.velocity.x||0);
    const vy=Number(body.body.velocity.y||0);
    const prevFx=Math.cos(prevRot), prevFy=Math.sin(prevRot);
    const signedForward=vx*prevFx+vy*prevFy;
    const speed=Math.hypot(vx,vy);
    const absForward=Math.abs(signedForward);

    const spec=CAR_SPECS[this.carId] || CAR_SPECS.stock;
    const maxFwd=Math.max(120,Number(this.carParams?.maxFwd || spec?.maxFwd || 520));
    const speed01=clamp(speed/maxFwd,0,1);
    const steer=this._bikeSteerInput(rawYaw,dt);

    const carLength=this._bikeVisualLength();
    const wheelbase=carLength*0.60;

    // Very low speed must not behave like a tank pivot. Steering authority is
    // almost zero near standstill, then returns progressively as the car rolls.
    const steerStart=10;
    const steerFull=62;
    const lowSpeedAuthority=smoothstep01((absForward-steerStart)/(steerFull-steerStart));

    // Reduced lock overall, especially at speed. Full stick still gives enough
    // angle for hairpins but normal corrections are much calmer.
    const maxSteerDeg=26-(14*speed01);
    const maxSteer=maxSteerDeg*Math.PI/180;
    const steerAngle=maxSteer*steer;

    // Kinematic bicycle model: yawRate = v/L * tan(delta).
    let bikeYaw=(signedForward/wheelbase)*Math.tan(steerAngle)*dt;
    bikeYaw*=lowSpeedAuthority;

    // The legacy controller is also gated by road speed. This is the important
    // part: it prevents the old controller from rotating the chassis while the
    // bicycle model is correctly trying to keep it almost still.
    const bicycleWeight=0.96;
    const legacyYaw=rawYaw*(1-bicycleWeight)*lowSpeedAuthority;
    let targetYaw=legacyYaw+bikeYaw*bicycleWeight;

    // At walking pace, aggressively bleed any residual angular velocity instead
    // of letting the previous frame keep turning the car after it has slowed down.
    if(absForward<steerStart){
      targetYaw=0;
      const settle=1-Math.exp(-dt*18);
      this._bikeYawFiltered += (0-this._bikeYawFiltered)*settle;
    }

    const baseTurnRate=Math.max(0,Number(this.carParams?.turnRate || spec?.turnRate || 4));
    const maxYaw=baseTurnRate*dt*0.82*lowSpeedAuthority;
    targetYaw=clamp(targetYaw,-maxYaw,maxYaw);

    // Heavy angular-velocity smoothing removes visible stepping.
    const yawAlpha=1-Math.exp(-dt*7.5);
    this._bikeYawFiltered += (targetYaw-this._bikeYawFiltered)*yawAlpha;
    if(absForward<4 || (Math.abs(targetYaw)<0.00015 && Math.abs(this._bikeYawFiltered)<0.00015)) this._bikeYawFiltered=0;
    const correctedYaw=clamp(this._bikeYawFiltered,-maxYaw,maxYaw);

    const newRot=wrapPi(prevRot+correctedYaw);

    // Softer rear-axle pivot to avoid tiny lateral nudges while steering.
    const rearOffset=wheelbase*0.38;
    const pivotStrength=smoothstep01(clamp((absForward-8)/82,0,1));
    const newFx=Math.cos(newRot), newFy=Math.sin(newRot);
    body.x += (newFx-prevFx)*rearOffset*pivotStrength;
    body.y += (newFy-prevFy)*rearOffset*pivotStrength;
    body.rotation=newRot;

    if(this.carRig?.scene){
      this.carRig.x=body.x;
      this.carRig.y=body.y;
      this.carRig.rotation=body.rotation+(this._carVisualRotOffset||0);
    }
  }
}
