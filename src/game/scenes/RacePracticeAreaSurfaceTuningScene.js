import { RaceScene as CurrentRaceScene } from './RacePracticeAreaSurfaceVisualScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene{
  _applyPracticeMaterial(material,body){
    if(!this._practiceAreaMode){
      super._applyPracticeMaterial(material,body);
      return;
    }

    const base=this._practiceSurfaceBase;
    if(!base)return;

    // Área de Pruebas usa una jerarquía deliberadamente clara:
    // asfalto = referencia BASE, hierba = penalización suave,
    // tierra/off-road = penalización fuerte.
    if(material==='ASPHALT'){
      this._restorePracticeAsphaltBase();
      return;
    }

    const mildGrass=material==='GRASS';
    const accelFactor=mildGrass?.86:.48;
    const brakeFactor=mildGrass?.90:.68;
    const speedFactor=mildGrass?.92:.72;
    const dragFactor=mildGrass?1.08:1.34;
    const gripFactor=mildGrass?.82:.52;

    if(Number.isFinite(base.accel))this.accel=base.accel*accelFactor;
    if(Number.isFinite(base.brakeForce))this.brakeForce=base.brakeForce*brakeFactor;
    if(Number.isFinite(base.maxFwd))this.maxFwd=base.maxFwd*speedFactor;
    if(Number.isFinite(base.linearDrag))this.linearDrag=base.linearDrag*dragFactor;
    if(Number.isFinite(base.lateralGrip))this.lateralGrip=base.lateralGrip*gripFactor;
    if(this.carParams?.steering&&Number.isFinite(base.steeringLateralGrip)){
      this.carParams.steering.lateralGrip=Math.max(.18,base.steeringLateralGrip*gripFactor);
    }
  }

  _applyPracticeRollingResistance(material,body,delta){
    if(!this._practiceAreaMode||material==='ASPHALT')return;
    const vel=body?.body?.velocity;
    if(!vel)return;

    const speed=Math.hypot(Number(vel.x||0),Number(vel.y||0));
    if(speed<.01)return;

    const dt=clamp(Number(delta||16.67)/1000,.001,.05);
    const decel=material==='GRASS'?5:30;
    const next=Math.max(0,speed-decel*dt);
    const k=next/speed;
    vel.x*=k;
    vel.y*=k;
  }
}
