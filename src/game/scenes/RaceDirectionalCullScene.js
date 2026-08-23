import { RaceScene as CleanHudRaceScene } from './RaceCleanHudScene.js';

// Precarga direccional de pista.
// Mantiene el culling activo en radio 2 (~25 celdas renderizadas), pero crea
// por adelantado y en estado oculto/inactivo los chunks situados delante del
// coche. La creación se reparte en el tiempo: como máximo un chunk por pulso.
export class RaceScene extends CleanHudRaceScene {
  create(data) {
    const result = super.create(data);

    this._dirCullLastAt = 0;
    this._dirCullQueue = [];
    this._dirCullQueued = new Set();

    return result;
  }

  _queueDirectionalPrewarm() {
    const geom = this.track?.geom;
    const cells = geom?.cells;
    const car = this.car;
    const body = car?.body;
    const cellSize = Number(geom?.cellSize || 0);
    if (!cells || !car || !body || !cellSize || !(this.track?.gfxByCell instanceof Map)) return;

    const cx = Math.floor(car.x / cellSize);
    const cy = Math.floor(car.y / cellSize);

    let vx = Number(body.velocity?.x || 0);
    let vy = Number(body.velocity?.y || 0);
    const speed = Math.hypot(vx, vy);

    if (speed < 30) {
      const rot = Number(car.rotation || 0);
      vx = Math.cos(rot);
      vy = Math.sin(rot);
    }

    let dx = 0;
    let dy = 0;
    if (Math.abs(vx) >= Math.abs(vy) * 0.55) dx = Math.sign(vx) || 0;
    if (Math.abs(vy) >= Math.abs(vx) * 0.55) dy = Math.sign(vy) || 0;
    if (dx === 0 && dy === 0) return;

    // Vector lateral entero, perpendicular a la dirección cuantizada.
    const lx = -dy;
    const ly = dx;

    // Radio activo = 2. Preparamos las franjas 3, 4 y 5 por delante.
    // Anchura lateral 5 celdas para cubrir rectas y entrada a curvas.
    for (let forward = 3; forward <= 5; forward++) {
      for (let side = -2; side <= 2; side++) {
        const tx = cx + dx * forward + lx * side;
        const ty = cy + dy * forward + ly * side;
        const key = `${tx},${ty}`;
        if (!cells.has(key)) continue;
        if (this.track.gfxByCell.has(key)) continue;
        if (this._dirCullQueued.has(key)) continue;
        this._dirCullQueued.add(key);
        this._dirCullQueue.push(key);
      }
    }
  }

  _prewarmOneDirectionalCell() {
    const geom = this.track?.geom;
    const cells = geom?.cells;
    const map = this.track?.gfxByCell;
    const cellSize = Number(geom?.cellSize || 0);
    if (!cells || !(map instanceof Map) || !cellSize) return;

    while (this._dirCullQueue.length) {
      const key = this._dirCullQueue.shift();
      this._dirCullQueued.delete(key);
      if (map.has(key)) continue;

      const cellData = cells.get(key);
      if (!cellData?.polys?.length) continue;

      const [ix, iy] = key.split(',').map(Number);
      const x = ix * cellSize;
      const y = iy * cellSize;
      const px = Math.round(x - 1);
      const py = Math.round(y - 1);

      const tile = this.add.image(px, py, 'asphalt')
        .setOrigin(0, 0)
        .setDisplaySize(cellSize + 2, cellSize + 2)
        .setScrollFactor(1)
        .setDepth(10)
        .setVisible(false);
      tile.active = false;

      let overlay = null;
      if (this.textures?.exists?.('asphaltOverlay')) {
        overlay = this.add.image(px, py, 'asphaltOverlay')
          .setOrigin(0, 0)
          .setDisplaySize(cellSize + 2, cellSize + 2)
          .setScrollFactor(1)
          .setDepth(11)
          .setAlpha(0.16)
          .setVisible(false);
        overlay.active = false;
      }

      const maskG = this.make.graphics({ x, y, add: false });
      maskG.clear();
      maskG.fillStyle(0xffffff, 1);

      const getXY = (pt) => {
        if (!pt) return { x: NaN, y: NaN };
        if (typeof pt.x === 'number' && typeof pt.y === 'number') return { x: pt.x, y: pt.y };
        if (Array.isArray(pt) && pt.length >= 2) return { x: pt[0], y: pt[1] };
        return { x: NaN, y: NaN };
      };

      for (const poly of cellData.polys) {
        if (!poly || poly.length < 3) continue;
        const p0 = getXY(poly[0]);
        if (!Number.isFinite(p0.x) || !Number.isFinite(p0.y)) continue;

        maskG.beginPath();
        maskG.moveTo(p0.x - px, p0.y - py);
        for (let i = 1; i < poly.length; i++) {
          const p = getXY(poly[i]);
          if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
          maskG.lineTo(p.x - px, p.y - py);
        }
        maskG.closePath();
        maskG.fillPath();
      }

      const mask = maskG.createGeometryMask();
      tile.setMask(mask);
      overlay?.setMask?.(mask);

      this.uiCam?.ignore?.(tile);
      this.uiCam?.ignore?.(maskG);
      this.uiCam?.ignore?.(overlay);

      // map.set puede estar envuelto por el perfil BAJA para destruir overlay.
      // El chunk queda creado, invisible e inactivo hasta que el culling base
      // lo solicite y simplemente lo reactive.
      map.set(key, { tile, overlay, stroke: null, maskG, mask });
      return;
    }
  }

  update(time, delta) {
    // Antes del update base: preparar cola según posición/dirección actual.
    const now = performance.now();
    if (now - this._dirCullLastAt >= 80) {
      this._dirCullLastAt = now;
      try {
        this._queueDirectionalPrewarm();
        this._prewarmOneDirectionalCell();
      } catch (err) {
        if (!this._dirCullErrLogged) {
          this._dirCullErrLogged = true;
          console.warn('[TDR2] directional cull prewarm failed', err);
        }
      }
    }

    return super.update(time, delta);
  }
}
