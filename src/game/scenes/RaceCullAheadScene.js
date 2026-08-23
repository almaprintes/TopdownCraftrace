import { RaceScene as CurrentRaceScene } from './RaceDuelLapReplayScene.js';

// Capa final de rendimiento para la pista.
// - Mantiene más asfalto preparado alrededor del coche para evitar pop-in.
// - Evita que el culling vuelva a recorrer/reactivar el mismo conjunto en cada frame.
// No modifica física, cronometraje, IA ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create() {
    super.create();

    try {
      if (this.track) {
        // Antes eran 2 celdas. Cuatro deja un colchón amplio fuera de cámara,
        // especialmente útil en rectas largas y a alta velocidad.
        this.track.cullRadiusCells = 4;
      }
      this._tdrCullLastCellKey = null;
      this._tdrCullPendingCellKey = null;
    } catch (_) {}
  }

  update(time, delta) {
    const geom = this.track?.geom;
    const realCells = geom?.cells;
    const cellSize = Number(geom?.cellSize || 0);
    const car = this.carBody || this.car;

    let bypassRepeatedCull = false;
    let savedCullEnabled = this._cullEnabled;
    let pendingKey = null;

    try {
      if (
        realCells &&
        car &&
        cellSize > 0 &&
        this._cullEnabled !== false &&
        this.track?.activeCells?.size
      ) {
        const cx = Math.floor(Number(car.x || 0) / cellSize);
        const cy = Math.floor(Number(car.y || 0) / cellSize);
        pendingKey = `${cx},${cy}`;

        // El bloque heredado solo necesita recalcular el conjunto visible al
        // cambiar de celda. Dentro de la misma celda, le presentamos una vista
        // del Map cuya enumeración contiene únicamente las celdas ya activas.
        // get()/has()/values() siguen consultando el Map real, por lo que la
        // detección de superficie y el resto de lógica continúan normales.
        if (this._tdrCullLastCellKey === pendingKey) {
          const active = this.track.activeCells;
          const cellsView = new Proxy(realCells, {
            get(target, prop) {
              if (prop === 'keys') return () => active.values();
              const value = Reflect.get(target, prop, target);
              return typeof value === 'function' ? value.bind(target) : value;
            }
          });

          geom.cells = cellsView;
          // En el bloque heredado, OFF significa enumerar cells.keys().
          // Como keys() devuelve solo las activas, el resultado es exactamente
          // el conjunto actual y no hay creación/ocultación/reactivación repetida.
          this._cullEnabled = false;
          bypassRepeatedCull = true;
        }
      }

      super.update(time, delta);
    } finally {
      if (bypassRepeatedCull && geom) {
        geom.cells = realCells;
        this._cullEnabled = savedCullEnabled;
      }
      if (pendingKey) this._tdrCullLastCellKey = pendingKey;
    }
  }
}
