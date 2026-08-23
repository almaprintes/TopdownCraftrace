import { RaceScene as DirectionalRaceScene } from './RaceDirectionalCullScene.js';

// Piloto de terreno horneado para Karting Tenerife.
// Durante la preparación se fuerza la creación de todos los chunks de asfalto,
// se rasterizan en 4 RenderTextures (máx. 2048x2048) y después se destruyen
// por completo los GameObjects/máscaras originales. La geometría lógica queda
// intacta para superficie, checkpoints y vueltas.
export class RaceScene extends DirectionalRaceScene {
  create(data) {
    const result = super.create(data);

    const trackId = String(this.trackKey || this.track?.meta?.id || '').toLowerCase();
    this._bakedAsphaltPilot = trackId === 'karting-tenerife';
    this._bakedAsphaltDone = false;
    this._bakedAsphaltTiles = [];
    this._bakedAsphaltStartedAt = performance.now();

    if (this._bakedAsphaltPilot) {
      // Durante la preparación dejamos al culling base crear todas las celdas.
      this._cullEnabled = false;
      this.time?.delayedCall?.(80, () => this._tryBakeAsphaltPilot());
    }

    return result;
  }

  _tryBakeAsphaltPilot() {
    if (!this._bakedAsphaltPilot || this._bakedAsphaltDone || !this.scene?.isActive?.()) return;

    const cells = this.track?.geom?.cells;
    const map = this.track?.gfxByCell;
    if (!cells || !(map instanceof Map)) return;

    let expected = 0;
    for (const cd of cells.values()) if (cd?.polys?.length) expected++;

    const elapsed = performance.now() - Number(this._bakedAsphaltStartedAt || 0);
    if (map.size < expected) {
      if (elapsed < 2200) {
        this.time?.delayedCall?.(60, () => this._tryBakeAsphaltPilot());
      } else {
        console.warn('[TDR2] baked asphalt pilot timeout', map.size, expected);
        this._cullEnabled = true;
      }
      return;
    }

    try {
      this._bakeAsphaltNow();
    } catch (err) {
      console.warn('[TDR2] baked asphalt pilot failed', err);
      this._cullEnabled = true;
    }
  }

  _bakeAsphaltNow() {
    const map = this.track?.gfxByCell;
    const logicalCells = this.track?.geom?.cells;
    if (!(map instanceof Map) || !logicalCells) return;

    const worldW = Math.max(1, Math.ceil(Number(this.track?.meta?.worldW || this.physics?.world?.bounds?.width || 0)));
    const worldH = Math.max(1, Math.ceil(Number(this.track?.meta?.worldH || this.physics?.world?.bounds?.height || 0)));
    if (!worldW || !worldH) throw new Error('world bounds no disponibles');

    const sources = [];
    for (const cell of map.values()) {
      for (const obj of [cell?.tile, cell?.overlay]) {
        if (!obj?.scene) continue;
        obj.setVisible?.(true);
        obj.active = true;
        sources.push(obj);
      }
    }

    // Todo detalle estático de superficie que sobreviva a la calidad elegida se
    // mete dentro del bake. Después se destruye: no queda Graphics invisible.
    const staticSurfaceDetails = [];
    for (const obj of [this._materialEdgeWear, this._environmentEdgeWear, this._semiSimBrakeMarks]) {
      if (!obj?.scene) continue;
      obj.setVisible?.(true);
      obj.active = true;
      sources.push(obj);
      staticSurfaceDetails.push(obj);
    }

    if (!sources.length) throw new Error('sin chunks de asfalto para hornear');

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

    // A partir de aquí el reemplazo es atómico: primero están los baked listos,
    // después desaparecen por completo chunks, overlays y máscaras originales.
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

    // Sentinel JS puro por celda lógica: evita que el bloque legado vuelva a
    // crear GameObjects. No renderiza, no tiene textura y no recibe updates.
    map.clear();
    for (const [key, cd] of logicalCells.entries()) {
      if (!cd?.polys?.length) continue;
      map.set(key, { tile:null, overlay:null, stroke:null, mask:null, maskG:null, baked:true });
    }

    for (const rt of baked) rt.setVisible(true);
    this._bakedAsphaltTiles = baked;
    this._bakedAsphaltDone = true;

    // Ya no necesitamos culling visual ni lookahead para el asfalto.
    this.track.cullRadiusCells = 0;
    this.track.activeCells = new Set();
    this._cullEnabled = true;
    this._aheadVisible = new Set();
    this._applyDirectionalLookahead = () => {};
    this._centerlineLookaheadCells = () => new Set();

    console.info('[TDR2] baked asphalt ready', {
      track:'karting-tenerife',
      worldW, worldH,
      bakedTiles:baked.length,
      logicalCells:map.size,
      staticSurfaceDetails:staticSurfaceDetails.length
    });
  }
}
