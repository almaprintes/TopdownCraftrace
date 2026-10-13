import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';

// Active race-chain controller. Only the Juanicar uses this deliberately arcade
// front-axle handbrake pivot. Other vehicles keep their original physics.
export class RaceScene extends CurrentRaceScene {
  create(data){
    this._juanicarHairpinAnchor=null;
    return super.create(data);
  }

  update(time,delta){
    const car=this.carBody;
    const active=this.carId==='veloce_juanicar_c220' && this._raceStarted && this._tdrHandbrake===true;
    const dt=Math.max(.001,Math.min(.05,Number(delta||16.67)/1000));
    if(active && car?.body?.velocity){
      if(!this._juanicarHairpinAnchor){
        const rot=Number(car.rotation||0);
        const length=Math.max(54,Math.min(150,Math.max(Number(car.displayWidth)||0,Number(car.displayHeight)||0,76)));
        const front=length*.27;
        this._juanicarHairpinAnchor={x:car.x+Math.cos(rot)*front,y:car.y+Math.sin(rot)*front,front};
      }
    }else this._juanicarHairpinAnchor=null;

    super.update(time,delta);

    const body=this.carBody;
    if(!active || !this._juanicarHairpinAnchor || !body?.body?.velocity)return;
    const steer=Math.max(-1,Math.min(1,Number(this._steerForHandbrake?.()||0)));
    const rot=Number(body.rotation||0);
    const yaw=steer*8.5*dt;
    const next=rot+yaw;
    const anchor=this._juanicarHairpinAnchor;
    body.rotation=next;
    body.x=anchor.x-Math.cos(next)*anchor.front;
    body.y=anchor.y-Math.sin(next)*anchor.front;
    body.body.setVelocity?.(0,0);
    body.body.velocity.x=0;
    body.body.velocity.y=0;
    if(this.carRig?.scene){
      this.carRig.x=body.x;
      this.carRig.y=body.y;
      this.carRig.rotation=next+(this._carVisualRotOffset||0);
    }
  }
}
