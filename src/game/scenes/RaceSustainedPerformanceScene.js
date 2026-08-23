import { RaceScene as CurrentRaceScene } from './RaceCullAheadScene.js';

// Optimización de carga sostenida, especialmente para iOS y dispositivos antiguos.
// No modifica física, IA, cronometraje ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    try {
      // RaceFixedScene conserva un descubridor histórico de HUD que recorre toda
      // la Display List. Como los chunks de pista quedan cacheados, hacerlo cada
      // frame se vuelve progresivamente más caro. Lo mantenemos disponible para
      // UI creada en caliente, pero como máximo 4 veces por segundo.
      if (typeof this._discoverFixedHud === 'function') {
        const discover = this._discoverFixedHud.bind(this);
        let lastDiscover = -Infinity;
        discover();
        this._discoverFixedHud = () => {
          const now = performance.now();
          if (now - lastDiscover < 250) return;
          lastDiscover = now;
          discover();
        };
      }

      // El minimapa heredado queda oculto por RaceMinimapCenteredScene, que ya
      // tiene su propio marcador world->map. Evitamos seguir proyectando el
      // marcador antiguo contra toda la centerline en cada frame.
      if (this.minimapUnifiedPanel?.scene) {
        this._pinMinimapMarker = () => {};
      }

      // Mantener la posición del HUD a frecuencia de frame, pero refrescar los
      // Text de velocidad/marcha/superficie a 20 Hz. Phaser Text puede regenerar
      // textura al cambiar, por lo que 60 actualizaciones/s son innecesarias.
      if (typeof this._updateRaceInfoHud === 'function') {
        const updateInfo = this._updateRaceInfoHud.bind(this);
        let lastInfo = -Infinity;
        updateInfo();
        this._updateRaceInfoHud = () => {
          const now = performance.now();
          if (now - lastInfo < 50) return;
          lastInfo = now;
          updateInfo();
        };
      }
    } catch (err) {
      console.warn('[TDR2] sustained performance setup failed', err);
    }

    return result;
  }
}
