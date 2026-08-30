import { RaceScene as CurrentRaceScene } from './RaceCleanLapScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Final shared handbrake correction.
// The rear axle is allowed to rotate/sweep, while the front axle keeps lateral grip.
// This runs after the normal race update so it applies to BASE 1.0 and every derived setup.
export class RaceScene extends CurrentRaceScene {
  _applyHandbrakeFrontAxleGrip(delta){
    if(!this._tdrHandbrake||!this._raceStarted)return;
    const body=this.carBody;
    const vel=body?.body?.velocity;
    if(!body?.scene||!vel)return;

    const speed=Math.hypot(Number(vel.x)||0,Number(vel.y)||0);
    if(speed<24)return;

    const dt=clamp(Number(delta||16.67)/1000,.001,.05);
    const rot=Number(body.rotation||0);
    const fx=Math.cos(rot),fy=Math.sin(rot);
    const rx=-fy,ry=fx;

    let vf=vel.x*fx+vel.y*fy;
    let vl=vel.x*rx+vel.y*ry;

    const maxFwd=Math.max(180,Number(this.maxFwd||this.carParams?.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1);

    // Front tyres retain lateral authority while the locked rear is rotating.
    // Damp only whole-car lateral translation; do not reduce the handbrake yaw itself.
    const frontAxleGrip=6.0+3.5*speed01;
    vl*=Math.exp(-dt*frontAxleGrip);

    vel.x=fx*vf+rx*vl;
    vel.y=fy*vf+ry*vl;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._applyHandbrakeFrontAxleGrip(delta);
    return result;
  }
}
