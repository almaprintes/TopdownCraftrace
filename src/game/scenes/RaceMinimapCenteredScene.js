import { RaceScene as CompetitionRaceScene } from './RaceCompetitionHudScene.js';

// Ajuste óptico final del minimapa premium.
// Mantiene intactos marco, lógica, escala y seguimiento del coche.
export class RaceScene extends CompetitionRaceScene {
  create() {
    super.create();

    try {
      const applyOpticalCenter = () => {
        if (this._minimapOpticalCentered) return;
        const mini = this.minimap;
        if (!mini) return;

        // El panel premium mide 154x104 y el centrado anterior colocaba
        // el trazado al 54% de altura. Subimos 9 px para centrarlo visualmente.
        const dy = -9;

        const pts = Array.isArray(mini.points) ? mini.points : [];
        for (const p of pts) {
          if (!p || !Number.isFinite(p.y)) continue;
          p.y += dy;
        }

        for (const obj of [mini.gfx, mini.flag]) {
          if (!obj?.scene) continue;
          obj.y = Number(obj.y || 0) + dy;
        }

        // El coche del minimapa se recalcula desde mini.points.
        this._miniScreenPos = null;
        this._minimapOpticalCentered = true;
      };

      applyOpticalCenter();
      this.time.delayedCall(0, applyOpticalCenter);
      this.time.delayedCall(100, applyOpticalCenter);
    } catch (err) {
      console.warn('[TDR2] Minimap optical centering failed', err);
    }
  }
}
