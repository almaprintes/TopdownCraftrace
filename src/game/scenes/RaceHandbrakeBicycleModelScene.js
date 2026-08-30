import { RaceScene as CurrentRaceScene } from './RaceCleanLapScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Experimental handbrake model.
// Uses a simplified bicycle model: front axle keeps lateral authority,
// rear axle loses most of it under handbrake. The same equations are used
// for left and right turns; only the steering sign changes.
export class RaceScene extends CurrentRaceScene {
  create(data){
    this._hbBicycleYawRate=0;
    return super.create(data);
  }

  _applyHandbrakePhysics(delta){
    const body=this.carBody;
    const vel=body?.body?.velocity;
    if(!body?.scene||!vel)return;

    const dt=clamp(Number(delta||16.67)/1000,.001,.05);

    if(!this._tdrHandbrake||!this._raceStarted){
      this._hbBicycleYawRate*=Math.exp(-dt*8.5);
      return;
    }

    const speed=Math.hypot(Number(vel.x)||0,Number(vel.y)||0);
    if(speed<24)return;

    const rot=Number(body.rotation||0);
    const fx=Math.cos(rot),fy=Math.sin(rot);
    const rx=-fy,ry=fx;

    const u=vel.x*fx+vel.y*fy;
    const v=vel.x*rx+vel.y*ry;
    const absU=Math.max(55,Math.abs(u));
    const steer=clamp(Number(this._steerForHandbrake?.()||0),-1,1);

    const longSide=Math.max(Number(body.displayWidth||0),Number(body.displayHeight||0),54);
    const wheelbase=clamp(longSide*.62,30,64);
    const lf=wheelbase*.47;
    const lr=wheelbase*.53;

    // Front road-wheel angle. Kept deliberately below visual full-lock.
    const steerAngle=steer*.36;
    let yawRate=Number(this._hbBicycleYawRate||0);

    // Slip angles at front and rear axles.
    const alphaF=Math.atan2(v+lf*yawRate,absU)-steerAngle;
    const alphaR=Math.atan2(v-lr*yawRate,absU);

    // Front axle retains cornering force; locked/sliding rear retains little.
    const frontCornering=5.6;
    const rearCornering=.72;
    const frontForce=clamp(-frontCornering*alphaF,-1.35,1.35);
    const rearForce=clamp(-rearCornering*alphaR,-.34,.34);

    const maxFwd=Math.max(180,Number(this.maxFwd||this.carParams?.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1);

    // Convert normalized tyre forces into stable arcade-scale accelerations.
    const lateralAccel=(frontForce+rearForce)*speed*(.78+.34*speed01);
    const yawAccel=((lf*frontForce)-(lr*rearForce))/wheelbase*(4.0+2.0*speed01);

    yawRate+=yawAccel*dt;
    yawRate*=Math.exp(-dt*.42);
    yawRate=clamp(yawRate,-2.8,2.8);
    this._hbBicycleYawRate=yawRate;

    // Apply lateral tyre force in world space without rotating the velocity vector
    // with the body. This preserves momentum and allows genuine slip angle.
    vel.x+=rx*lateralAccel*dt;
    vel.y+=ry*lateralAccel*dt;

    // Handbrake slows the car, but never creates speed.
    const beforeClamp=speed;
    const longitudinalDrag=Math.exp(-dt*(.34+.34*speed01));
    vel.x*=longitudinalDrag;
    vel.y*=longitudinalDrag;

    const after=Math.hypot(vel.x,vel.y);
    const maxAllowed=beforeClamp*1.001;
    if(after>maxAllowed&&after>1e-6){
      const k=maxAllowed/after;
      vel.x*=k;vel.y*=k;
    }

    body.rotation=rot+yawRate*dt;

    if(this.carRig?.scene){
      this.carRig.x=body.x;
      this.carRig.y=body.y;
      this.carRig.rotation=body.rotation+(this._carVisualRotOffset||0);
    }
  }
}
