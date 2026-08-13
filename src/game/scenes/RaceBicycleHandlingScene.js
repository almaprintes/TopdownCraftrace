import { RaceScene as CurrentRaceScene } from './RaceTimingCelebrationVisibleScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
function wrapPi(a){
  while(a>Math.PI)a-=Math.PI*2;
  while(a<-Math.PI)a+=Math.PI*2;
  return a;
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

    // Small centre dead-zone so tiny thumb tremors do not wag the nose.
    const dead=0.085;
    const sign=Math.sign(steer);
    let mag=Math.abs(steer);
    mag=mag<=dead?0:(mag-dead)/(1-dead);

    // Progressive response: gentle around centre, full authority near the edge.
    mag=Math.pow(mag,1.45);
    const shaped=sign*mag;

    // Framerate-independent low-pass filtering removes touch quantisation/jitter.
    const alpha=1-Math.exp(-dt*8.5);
    this._bikeSteerFiltered += (shaped-this._bikeSteerFiltered)*alpha;
    if(Math.abs(shaped)<0.001 && Math.abs(this._bikeSteerFiltered)<0.002) this._bikeSteerFiltered=0;

    return clamp(this._bikeSteerFiltered,-1,1);
  }

  update(time,delta){
    const bodyBefore=this.carBody;
    const prevRot=Number(bodyBefore?.rotation);

    super.update(time,delta);

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

    const spec=CAR_SPECS[this.carId] || CAR_SPECS.stock;
    const maxFwd=Math.max(120,Number(this.carParams?.maxFwd || spec?.maxFwd || 520));
    const speed01=clamp(speed/maxFwd,0,1);
    const steer=this._bikeSteerInput(rawYaw,dt);

    const carLength=this._bikeVisualLength();
    const wheelbase=carLength*0.60;

    // Less lock around normal driving speeds, but enough authority for hairpins.
    const maxSteerDeg=29-(16*speed01);
    const maxSteer=maxSteerDeg*Math.PI/180;
    const steerAngle=maxSteer*steer;

    // Kinematic bicycle model: yawRate = v/L * tan(delta).
    let bikeYaw=(signedForward/wheelbase)*Math.tan(steerAngle)*dt;

    // No stationary pirouettes.
    const lowSpeedBlend=clamp((Math.abs(signedForward)-5)/38,0,1);
    bikeYaw*=lowSpeedBlend;

    // Keep only a small amount of the old instantaneous rotation.
    const bicycleWeight=0.90;
    let targetYaw=rawYaw*(1-bicycleWeight)+bikeYaw*bicycleWeight;

    const maxYaw=Math.max(0.018,Number(this.carParams?.turnRate || spec?.turnRate || 4)*dt*0.92);
    targetYaw=clamp(targetYaw,-maxYaw,maxYaw);

    // Smooth angular velocity itself. This removes the frame-to-frame snap that
    // makes the chassis look like it is rotating in little steps.
    const yawAlpha=1-Math.exp(-dt*11.0);
    this._bikeYawFiltered += (targetYaw-this._bikeYawFiltered)*yawAlpha;
    const correctedYaw=clamp(this._bikeYawFiltered,-maxYaw,maxYaw);

    const newRot=wrapPi(prevRot+correctedYaw);

    // Rear-axle pivot, softened slightly to avoid lateral micro-jumps.
    const rearOffset=wheelbase*0.42;
    const pivotStrength=clamp(Math.abs(signedForward)/70,0,1);
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
