import { RaceScene as CurrentRaceScene } from './RacePracticeAreaSurfaceVisualScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene{
  _capturePracticeSurfaceBaseline(){
    super._capturePracticeSurfaceBaseline();
    if(this._practiceSurfaceBase)this._practiceSurfaceBase.turnRate=Number(this.turnRate);
  }

  _applyPracticeMaterial(material,body){
    if(!this._practiceAreaMode){
      super._applyPracticeMaterial(material,body);
      return;
    }

    const base=this._practiceSurfaceBase;
    if(!base)return;

    // Área de Pruebas replica la jerarquía estándar de los circuitos normales:
    // ASPHALT = TRACK sin penalización, GRASS = penalización suave,
    // DIRT visual = OFF-road con penalización dura. Raven Hollow es la excepción.
    this._restorePracticeAsphaltBase();
    if(Number.isFinite(base.turnRate))this.turnRate=base.turnRate;

    if(material==='ASPHALT')return;

    const grass=material==='GRASS';
    if(Number.isFinite(base.accel))this.accel=base.accel*(grass?.65:.35);
    if(Number.isFinite(base.maxFwd))this.maxFwd=base.maxFwd*(grass?.90:.75);
    if(Number.isFinite(base.turnRate))this.turnRate=base.turnRate*(grass?.80:.60);
  }

  _applyPracticeRollingResistance(material,body,delta){
    if(!this._practiceAreaMode||material==='ASPHALT')return;
    const vel=body?.body?.velocity;
    if(!vel)return;

    const dt=clamp(Number(delta||16.67)/1000,.001,.05);
    // Misma pérdida exponencial usada por RaceScene en circuitos normales.
    const extra=Math.pow(material==='GRASS'?.55:.18,dt);
    vel.x*=extra;
    vel.y*=extra;
  }
}
