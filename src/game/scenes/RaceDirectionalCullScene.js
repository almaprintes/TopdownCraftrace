import { RaceScene as CleanHudRaceScene } from './RaceCleanHudScene.js';

// Culling direccional real:
// - el culling base conserva radio 2 (~25 chunks alrededor del coche)
// - añadimos solo una pequeña "lengua" visible por delante siguiendo la
//   centerline real del circuito
// - no crea objetos nuevos: trabaja únicamente con chunks ya creados por el
//   culling base y limpia los adelantados que dejan de ser necesarios
export class RaceScene extends CleanHudRaceScene {
  create(data) {
    const result = super.create(data);
    this._aheadVisible = new Set();
    this._aheadCullLastSig = '';
    return result;
  }

  _centerlineLookaheadCells() {
    const geom = this.track?.geom;
    const cells = geom?.cells;
    const cl = this.track?.meta?.centerline;
    const cum = this._ttCl?.cum;
    const total = Number(this._ttCl?.total || 0);
    const cellSize = Number(geom?.cellSize || 0);
    const n = cl?.length || 0;
    if (!cells || !cellSize || n < 2 || !Array.isArray(cum) || !total) return new Set();

    const getXY = (p) => {
      if (!p) return null;
      if (Array.isArray(p) && p.length >= 2) return { x:Number(p[0]), y:Number(p[1]) };
      if (Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) return { x:Number(p.x), y:Number(p.y) };
      return null;
    };

    // _ttProg.idx ya sigue al coche mediante búsqueda local barata.
    let base = Number(this._ttProg?.idx || 0);
    base = Math.max(0, Math.min(n - 1, base));
    const baseDist = Number(cum[base] || 0);

    const indexAtDistanceAhead = (aheadPx) => {
      let target = baseDist + aheadPx;
      if (target >= total) target -= total * Math.floor(target / total);

      // Avanzamos desde el índice actual; el lookahead es corto y el array circular.
      let i = base;
      for (let step = 0; step < n; step++) {
        const ni = (i + 1) % n;
        const d0 = Number(cum[i] || 0);
        const d1raw = Number(cum[ni] || 0);
        const d1 = ni <= i ? d1raw + total : d1raw;
        const t = target < baseDist ? target + total : target;
        if (t >= d0 && t <= d1) return ni;
        i = ni;
      }
      return base;
    };

    const out = new Set();
    // Muestras desde ~2.2 hasta ~4.8 celdas por delante. Cubrimos el punto
    // central y una celda lateral a cada lado para curvas/pista ancha.
    for (const mul of [2.2, 3.0, 3.8, 4.8]) {
      const idx = indexAtDistanceAhead(cellSize * mul);
      const p = getXY(cl[idx]);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);

      // Tangente local para obtener perpendicular aproximada y cubrir ancho.
      const pPrev = getXY(cl[(idx - 1 + n) % n]) || p;
      const pNext = getXY(cl[(idx + 1) % n]) || p;
      const tx = pNext.x - pPrev.x;
      const ty = pNext.y - pPrev.y;
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;

      for (const side of [-0.75, 0, 0.75]) {
        const sx = Math.floor((p.x + nx * cellSize * side) / cellSize);
        const sy = Math.floor((p.y + ny * cellSize * side) / cellSize);
        const key = `${sx},${sy}`;
        if (cells.has(key)) out.add(key);
      }
    }
    return out;
  }

  _applyDirectionalLookahead() {
    const map = this.track?.gfxByCell;
    if (!(map instanceof Map)) return;

    const wanted = this._centerlineLookaheadCells();
    const baseActive = this.track?.activeCells instanceof Set ? this.track.activeCells : new Set();

    // Apagar únicamente los chunks extra que ya no necesitamos y que tampoco
    // forman parte del radio 2 normal.
    for (const key of this._aheadVisible || []) {
      if (wanted.has(key) || baseActive.has(key)) continue;
      const cell = map.get(key);
      if (!cell) continue;
      cell.tile?.setVisible?.(false);
      cell.overlay?.setVisible?.(false);
      cell.stroke?.setVisible?.(false);
      if (cell.tile) cell.tile.active = false;
      if (cell.overlay) cell.overlay.active = false;
      if (cell.stroke) cell.stroke.active = false;
    }

    const next = new Set();
    for (const key of wanted) {
      if (baseActive.has(key)) continue; // ya lo muestra el culling normal
      const cell = map.get(key);
      if (!cell) continue; // todavía no existe: no creamos nada aquí
      cell.tile?.setVisible?.(true);
      cell.overlay?.setVisible?.(true);
      cell.stroke?.setVisible?.(true);
      if (cell.tile) cell.tile.active = true;
      if (cell.overlay) cell.overlay.active = true;
      if (cell.stroke) cell.stroke.active = true;
      next.add(key);
    }

    this._aheadVisible = next;
  }

  update(time, delta) {
    const result = super.update(time, delta);

    try {
      this._applyDirectionalLookahead();
    } catch (err) {
      if (!this._dirCullErrLogged) {
        this._dirCullErrLogged = true;
        console.warn('[TDR2] directional cull lookahead failed', err);
      }
    }

    return result;
  }
}
