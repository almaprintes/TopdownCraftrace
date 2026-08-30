import { RaceScene as CurrentRaceScene } from './RaceCleanLapScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Experimental shared handbrake model.
// Simplified bicycle dynamics: the front axle keeps lateral authority while
// the rear loses most of it under handbrake. Left/right are the same equations
// with opposite steering sign. No position teleporting and no artificial speed gain.
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
    const steerAngle=steer*.36;

    let yawRate=Number(this._hbBicycleYawRate||0);

    // Axle slip angles. Rear cornering force is intentionally much lower while
    // the handbrake is held, representing the rear tyres sliding/locking first.
    const alphaF=Math.atan2(v+lf*yawRate,absU)-steerAngle;
    const alphaR=Math.atan2(v-lr*yawRate,absU);

    const frontCornering=5.6;
    const rearCornering=.72;
    const frontForce=clamp(-frontCornering*alphaF,-1.35,1.35);
    const rearForce=clamp(-rearCornering*alphaR,-.34,.34);

    const maxFwd=Math.max(180,Number(this.maxFwd||this.carParams?.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1);

    const lateralAccel=(frontForce+rearForce)*speed*(.78+.34*speed01);
    const yawAccel=((lf*frontForce)-(lr*rearForce))/wheelbase*(4.0+2.0*speed01);

    yawRate+=yawAccel*dt;
    yawRate*=Math.exp(-dt*.42);
    yawRate=clamp(yawRate,-2.8,2.8);
    this._hbBicycleYawRate=yawRate;

    // Apply tyre force to the world velocity. We deliberately do NOT rotate the
    // whole velocity vector with the body: body heading and travel direction may differ.
    vel.x+=rx*lateralAccel*dt;
    vel.y+=ry*lateralAccel*dt;

    // Mild longitudinal loss from locked/sliding rear tyres.
    const drag=Math.exp(-dt*(.34+.34*speed01));
    vel.x*=drag;
    vel.y*=drag;

    // Hard safety invariant: the handbrake can never add kinetic speed.
    const after=Math.hypot(vel.x,vel.y);
    const maxAllowed=speed*1.001;
    if(after>maxAllowed&&after>1e-6){
      const k=maxAllowed/after;
      vel.x*=k;
      vel.y*=k;
    }

    body.rotation=rot+yawRate*dt;

    if(this.carRig?.scene){
      this.carRig.x=body.x;
      this.carRig.y=body.y;
      this.carRig.rotation=body.rotation+(this._carVisualRotOffset||0);
    }
  }
}
