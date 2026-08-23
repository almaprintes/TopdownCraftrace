import { RaceScene as SustainedRaceScene } from './RaceSustainedPerformanceScene.js';

// Capa final de limpieza de HUD.
// Todo HUD sustituido se destruye y se desconecta por completo: no queda
// invisible, no conserva listeners y no sigue ejecutando updates heredados.
export class RaceScene extends SustainedRaceScene {
  create(data) {
    const result = super.create(data);

    try {
      // RaceStyledHudScene crea raceInfoHudV2 (MARCHA / SUPERFICIE) y además
      // lo fija/sincroniza en cada update. Ya no forma parte de la interfaz.
      const oldV2 = this.raceInfoHudV2;
      if (oldV2) {
        try { this._fixedUiRoots?.delete?.(oldV2); } catch {}
        try { this._fixedUiState?.delete?.(oldV2); } catch {}
        try { oldV2.destroy?.(true); } catch {}
      }
      this.raceInfoHudV2 = null;
      this._raceInfoHudV2State = null;

      // Eliminar el listener de resize instalado por la capa antigua.
      try {
        if (this._onResizeRaceInfoHudV2) {
          this.scale?.off?.('resize', this._onResizeRaceInfoHudV2);
        }
      } catch {}
      this._onResizeRaceInfoHudV2 = null;

      // Cortar completamente las rutas por-frame heredadas.
      this._layoutRaceInfoHudV2 = () => {};
      this._pinRaceInfoHudV2 = () => {};
      this._syncRaceInfoHudV2 = () => {};

      // El HUD inferior vigente es únicamente raceInfoHud, creado por la capa
      // de rendimiento con VELOCIDAD + TIEMPO.
      this._pinRaceInfoHud?.();
      this._updateRaceInfoHud?.();
    } catch (err) {
      console.warn('[TDR2] clean HUD teardown failed', err);
    }

    return result;
  }
}
