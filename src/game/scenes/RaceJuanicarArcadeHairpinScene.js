import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPi=a=>Math.atan2(Math.sin(a),Math.cos(a));

// Active race chain: Juanicar-only, progressive arcade handbrake.
// The front axle continues moving slowly; the rear swings outward in the
// direction established by the actual steering controller.
export class RaceScene extends CurrentRaceScene {
  create(data){
    this._juanicarHairpin=null;
    return super.create(data);
  }

  update(time,delta){
    const car=this.carBody;
    const active=this.carId==='veloce_juanicar_c220' && this._raceStarted && this._tdrHandbrake===true;
    const dt=clamp(Number(delta||16.67)/1000,.001,.05);
    const before=car?.body?.velocity?{
      x:Number(car.x),y:Number(car.y),rotation:Number(car.rotation),
      vx:Number(car.body.velocity.x),vy:Number(car.body.velocity.y)
    }:null;
    if(!active)this._juanicarHairpin=null;
    super.update(time,delta);
    const body=this.carBody;
    if(!active||!before||!body?.body?.velocity)return;

    const rawSteer=clamp(Number(this._steerForHandbrake?.()||0),-1,1);
    // Use the sign of the game's actual turn when it is available. This also
    // supports directional touch steering whose input axis differs from wheel.
    const baseYaw=wrapPi(Number(body.rotation)-before.rotation);
    const direction=Math.abs(baseYaw)>.0002?Math.sign(baseYaw):Math.sign(rawSteer);
    const demand=Math.abs(rawSteer)>.06?Math.abs(rawSteer):Math.abs(baseYaw)>.0002?0.55:0;
    const speed=Math.hypot(before.vx,before.vy);
    if(!this._juanicarHairpin){
      const size=Math.max(54,Math.min(150,Math.max(Number(body.displayWidth)||0,Number(body.displayHeight)||0,76)));
      const front=size*.27;
      this._juanicarHairpin={front,forwardSpeed:Math.min(speed,90),yawRate:0};
    }
    const state=this._juanicarHairpin;
    // Slow rolling front axle, not a hard lock. Strong initial braking then
    // enough forward creep to keep the manoeuvre fluid.
    state.forwardSpeed+=(Math.min(speed,65)-state.forwardSpeed)*(1-Math.exp(-dt*7));
    state.forwardSpeed=Math.max(12,state.forwardSpeed*Math.exp(-dt*1.3));
    const desiredYaw=direction*demand*3.0;
    state.yawRate+=(desiredYaw-state.yawRate)*(1-Math.exp(-dt*9));
    const next=before.rotation+state.yawRate*dt;
    const fx=Math.cos(before.rotation),fy=Math.sin(before.rotation);
    const nfx=Math.cos(next),nfy=Math.sin(next);
    const frontX=before.x+fx*state.front+fx*state.forwardSpeed*dt;
    const frontY=before.y+fy*state.front+fy*state.forwardSpeed*dt;
    body.rotation=next;
    body.x=frontX-nfx*state.front;
    body.y=frontY-nfy*state.front;
    body.body.setVelocity?.(nfx*state.forwardSpeed,nfy*state.forwardSpeed);
    if(this.carRig?.scene){
      this.carRig.x=body.x;
      this.carRig.y=body.y;
      this.carRig.rotation=next+(this._carVisualRotOffset||0);
    }
  }
}
