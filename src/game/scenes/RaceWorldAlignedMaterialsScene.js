import { RaceScene as RealSurfaceRaceScene } from './RaceRealSurfaceAssetsScene.js';

// Karting Tenerife: el asfalto se crea como UNA sola superficie continua de mundo
// y se recorta con UNA mascara global construida a partir de la geometria logica.
// Los chunks siguen existiendo solo hasta el momento del bake por compatibilidad
// con la cadena heredada, pero ya no participan en el render final del asfalto.
export class RaceScene extends RealSurfaceRaceScene {
  _worldPoint(pt) {
    if (Array.isArray(pt)) return { x: Number(pt[0]), y: Number(pt[1]) };
    return { x: Number(pt?.x), y: Number(pt?.y) };
  }

  _buildWholeTrackMask() {
    const cells = this.track?.geom?.cells;
    const cellSize = Number(this.track?.geom?.cellSize || this.track?.meta?.cellSize || 400);
    if (!(cells instanceof Map) || !Number.isFinite(cellSize) || cellSize <= 0) return null;

    const g = this.add.graphics().setDepth(-10000);
    g.fillStyle(0xffffff, 1);

    let polyCount = 0;
    for (const [key, cd] of cells.entries()) {
      const polys = cd?.polys;
      if (!Array.isArray(polys) || !polys.length) continue;

      const [sx, sy] = String(key).split(',');
      const cx = Number(sx);
      const cy = Number(sy);
      const oxCell = Number.isFinite(cx) ? cx * cellSize : 0;
      const oyCell = Number.isFinite(cy) ? cy * cellSize : 0;

      for (const poly of polys) {
        if (!Array.isArray(poly) || poly.length < 3) continue;
        const p0 = this._worldPoint(poly[0]);
        if (!Number.isFinite(p0.x) || !Number.isFinite(p0.y)) continue;

        // Misma heuristica usada por la logica de superficie del RaceScene base:
        // algunos ribbons almacenan puntos mundo y otros locales a la celda.
        const looksWorld =
          (p0.x > cellSize * 1.5) || (p0.y > cellSize * 1.5) ||
          (p0.x < -cellSize * 0.5) || (p0.y < -cellSize * 0.5);

        const ox = looksWorld ? 0 : oxCell;
        const oy = looksWorld ? 0 : oyCell;
        const pts = [];
        for (const p of poly) {
          const q = this._worldPoint(p);
          if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) continue;
          pts.push({ x: q.x + ox, y: q.y + oy });
        }
        if (pts.length < 3) continue;
        g.fillPoints(pts, true);
        polyCount++;
      }
    }

    if (!polyCount) {
      g.destroy();
      return null;
    }

    const mask = g.createGeometryMask();
    g.setVisible(false);
    return { gfx: g, mask, polyCount };
  }

  _bakeAsphaltNow() {
    const map = this.track?.gfxByCell;
    const logicalCells = this.track?.geom?.cells;
    if (!(map instanceof Map) || !(logicalCells instanceof Map)) return;

    const worldW = Math.max(1, Math.ceil(Number(this.track?.meta?.worldW || this.physics?.world?.bounds?.width || 0)));
    const worldH = Math.max(1, Math.ceil(Number(this.track?.meta?.worldH || this.physics?.world?.bounds?.height || 0)));
    if (!worldW || !worldH) throw new Error('world bounds no disponibles');

    const maskBundle = this._buildWholeTrackMask();
    if (!maskBundle) throw new Error('no se pudo crear mascara global de pista');

    // UNA unica superficie de asfalto para todo el mundo. La textura ya es un WebP
    // real cargado por Phaser. Al no existir TileSprite por celda, no puede haber
    // reinicios de fase ni costuras de chunk.
    const asphalt = this.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
      .setOrigin(0, 0)
      .setDepth(10)
      .setScrollFactor(1);
    asphalt.tilePositionX = 0;
    asphalt.tilePositionY = 0;
    asphalt.setMask(maskBundle.mask);

    const sources = [asphalt];
    let asphaltOverlay = null;
    if (this.textures.exists('asphaltOverlay')) {
      asphaltOverlay = this.add.tileSprite(0, 0, worldW, worldH, 'asphaltOverlay')
        .setOrigin(0, 0)
        .setDepth(11)
        .setScrollFactor(1)
        .setAlpha(0.10)
        .setMask(maskBundle.mask);
      sources.push(asphaltOverlay);
    }

    // Detalles estaticos existentes se absorben tambien en el bake y despues
    // desaparecen completamente como GameObjects vivos.
    const staticSurfaceDetails = [];
    for (const obj of [this._materialEdgeWear, this._environmentEdgeWear, this._semiSimBrakeMarks]) {
      if (!obj?.scene) continue;
      obj.setVisible?.(true);
      obj.active = true;
      sources.push(obj);
      staticSurfaceDetails.push(obj);
    }

    const tileMax = 2048;
    const baked = [];
    for (let y = 0; y < worldH; y += tileMax) {
      for (let x = 0; x < worldW; x += tileMax) {
        const w = Math.min(tileMax, worldW - x);
        const h = Math.min(tileMax, worldH - y);
        const rt = this.add.renderTexture(x, y, w, h)
          .setOrigin(0, 0)
          .setDepth(10)
          .setScrollFactor(1)
          .setVisible(false);
        rt.camera.setZoom(1);
        rt.camera.centerOn(x + w * 0.5, y + h * 0.5);
        rt.camera.roundPixels = false;
        rt.draw(sources);
        baked.push(rt);
      }
    }

    // Destruccion REAL de la superficie temporal global y de su mascara.
    try { asphalt.clearMask?.(true); } catch {}
    try { asphalt.destroy?.(); } catch {}
    try { asphaltOverlay?.clearMask?.(true); } catch {}
    try { asphaltOverlay?.destroy?.(); } catch {}
    try { maskBundle.mask?.destroy?.(); } catch {}
    try { maskBundle.gfx?.destroy?.(); } catch {}

    // Los chunks legacy ya no tienen ninguna funcion visual: se destruyen enteros.
    for (const cell of map.values()) {
      try { cell?.tile?.destroy?.(); } catch {}
      try { cell?.overlay?.destroy?.(); } catch {}
      try { cell?.stroke?.destroy?.(); } catch {}
      try { cell?.mask?.destroy?.(); } catch {}
      try { cell?.maskG?.destroy?.(); } catch {}
    }

    for (const obj of staticSurfaceDetails) {
      try { obj.destroy?.(); } catch {}
    }
    this._materialEdgeWear = null;
    this._environmentEdgeWear = null;
    this._semiSimBrakeMarks = null;

    // Sentinel JS puro por celda logica: evita que el bloque legado vuelva a crear
    // renderables. No es un GameObject y no recibe updates.
    map.clear();
    for (const [key, cd] of logicalCells.entries()) {
      if (!cd?.polys?.length) continue;
      map.set(key, { tile:null, overlay:null, stroke:null, mask:null, maskG:null, baked:true });
    }

    for (const rt of baked) rt.setVisible(true);
    this._bakedAsphaltTiles = baked;
    this._bakedAsphaltDone = true;

    this.track.cullRadiusCells = 0;
    this.track.activeCells = new Set();
    this._cullEnabled = true;
    this._aheadVisible = new Set();
    this._applyDirectionalLookahead = () => {};
    this._centerlineLookaheadCells = () => new Set();

    console.info('[TDR2] whole-surface asphalt baked', {
      track:'karting-tenerife',
      worldW,
      worldH,
      bakedTiles:baked.length,
      logicalCells:map.size,
      maskPolys:maskBundle.polyCount,
      staticSurfaceDetails:staticSurfaceDetails.length
    });
  }
}
