import { RaceScene as RealSurfaceRaceScene } from './RaceRealSurfaceAssetsScene.js';
import { getTrackBeautyLayerConfig } from '../tracks/trackBeautyLayers.js';

function trackIdFrom(data, scene) {
  const fromData = data?.trackKey;
  const fromScene = scene?.trackKey || scene?.track?.meta?.id;
  let fromStorage = null;
  try { fromStorage = localStorage.getItem('tdr2:trackKey'); } catch {}
  return String(fromData || fromScene || fromStorage || '').trim().toLowerCase();
}

// Karting Tenerife: el asfalto estable actual se mantiene como fallback.
// Cuando una pista declara Beauty Layer lista, se sustituye SOLO el render visual
// de terreno por tiles horneados de mundo completo. La logica de pista no cambia.
export class RaceScene extends RealSurfaceRaceScene {
  init(data) {
    this._beautyInitData = data || {};
    this._beautyLayerActive = false;
    this._beautyLayerFailed = false;
    this._trackBeautyTiles = [];
    super.init?.(data);
  }

  preload() {
    super.preload?.();
    const cfg = getTrackBeautyLayerConfig(trackIdFrom(this._beautyInitData, this));
    this._beautyPreloadConfig = cfg;
    if (!cfg?.useBeautyLayer || !cfg?.assetsAvailable) return;
    for (const tile of cfg.tiles || []) {
      if (!this.textures.exists(tile.key)) this.load.image(tile.key, tile.path);
    }
  }

  create(data) {
    const result = super.create(data);
    const trackId = trackIdFrom(data, this);
    const cfg = getTrackBeautyLayerConfig(trackId);
    this._beautyConfig = cfg;

    if (!cfg?.useBeautyLayer || !cfg?.assetsAvailable) {
      if (cfg?.useBeautyLayer && !cfg?.assetsAvailable) {
        console.info('[TDR2] beauty layer configured but assets are not in main yet', { track: trackId });
      }
      return result;
    }

    try {
      this._activateTrackBeautyLayer(cfg, trackId);
    } catch (err) {
      this._beautyLayerFailed = true;
      this._beautyLayerActive = false;
      console.warn('[TDR2] beauty layer activation failed; keeping baked fallback', err);
    }
    return result;
  }

  _tryBakeAsphaltPilot() {
    if (this._beautyLayerActive && !this._beautyLayerFailed) return;
    return super._tryBakeAsphaltPilot?.();
  }

  _validateBeautyAssets(cfg, trackId) {
    const worldW = Math.round(Number(this.track?.meta?.worldW || this.physics?.world?.bounds?.width || 0));
    const worldH = Math.round(Number(this.track?.meta?.worldH || this.physics?.world?.bounds?.height || 0));
    if (worldW !== Number(cfg.worldW) || worldH !== Number(cfg.worldH)) {
      throw new Error(`beauty/world mismatch ${trackId}: ${worldW}x${worldH} != ${cfg.worldW}x${cfg.worldH}`);
    }
    for (const tile of cfg.tiles || []) {
      if (!this.textures.exists(tile.key)) throw new Error(`missing beauty texture ${tile.key}`);
      const source = this.textures.get(tile.key)?.getSourceImage?.();
      const sw = Number(source?.naturalWidth || source?.width || 0);
      const sh = Number(source?.naturalHeight || source?.height || 0);
      if (sw !== Number(tile.w) || sh !== Number(tile.h)) {
        throw new Error(`beauty tile size mismatch ${tile.key}: ${sw}x${sh} != ${tile.w}x${tile.h}`);
      }
    }
  }

  _destroyLegacyGroundRender() {
    try { this.bgGrass?.clearMask?.(false); } catch {}
    try { this.bgGrass?.destroy?.(); } catch {}
    try { this.bgOff?.destroy?.(); } catch {}
    this.bgGrass = null;
    this.bgOff = null;

    try { this._grassMask?.destroy?.(); } catch {}
    try { this._grassMaskGfx?.destroy?.(); } catch {}
    this._grassMask = null;
    this._grassMaskGfx = null;

    for (const obj of this._bakedAsphaltTiles || []) {
      try { obj?.destroy?.(); } catch {}
    }
    this._bakedAsphaltTiles = [];

    const map = this.track?.gfxByCell;
    const logicalCells = this.track?.geom?.cells;
    if (map instanceof Map) {
      for (const cell of map.values()) {
        try { cell?.tile?.destroy?.(); } catch {}
        try { cell?.overlay?.destroy?.(); } catch {}
        try { cell?.stroke?.destroy?.(); } catch {}
        try { cell?.mask?.destroy?.(); } catch {}
        try { cell?.maskG?.destroy?.(); } catch {}
      }
      map.clear();
      if (logicalCells instanceof Map) {
        for (const [key, cd] of logicalCells.entries()) {
          if (!cd?.polys?.length) continue;
          map.set(key, { tile:null, overlay:null, stroke:null, mask:null, maskG:null, beauty:true });
        }
      }
    }

    for (const key of ['_materialEdgeWear', '_environmentEdgeWear', '_semiSimBrakeMarks']) {
      try { this[key]?.destroy?.(); } catch {}
      this[key] = null;
    }

    if (this.track) {
      this.track.cullRadiusCells = 0;
      this.track.activeCells = new Set();
    }
    this._cullEnabled = true;
    this._aheadVisible = new Set();
    this._applyDirectionalLookahead = () => {};
    this._centerlineLookaheadCells = () => new Set();
  }

  _activateTrackBeautyLayer(cfg, trackId) {
    this._validateBeautyAssets(cfg, trackId);
    const tiles = [];
    try {
      for (const tile of cfg.tiles || []) {
        const image = this.add.image(tile.x, tile.y, tile.key)
          .setOrigin(0, 0)
          .setDisplaySize(tile.w, tile.h)
          .setScrollFactor(1)
          .setDepth(Number(cfg.depth ?? 9))
          .setVisible(false);
        this.uiCam?.ignore?.(image);
        tiles.push(image);
      }

      this._destroyLegacyGroundRender();
      for (const image of tiles) image.setVisible(true);
      this._trackBeautyTiles = tiles;
      this._beautyLayerActive = true;
      this._beautyLayerFailed = false;
      this._bakedAsphaltPilot = false;
      this._bakedAsphaltDone = true;
      this.events.once('shutdown', this._destroyTrackBeautyLayer, this);

      console.info('[TDR2] track beauty layer active', {
        track: trackId,
        worldW: cfg.worldW,
        worldH: cfg.worldH,
        tiles: tiles.length,
        replaces: cfg.replaces
      });
    } catch (err) {
      for (const image of tiles) {
        try { image?.destroy?.(); } catch {}
      }
      throw err;
    }
  }

  _destroyTrackBeautyLayer() {
    for (const image of this._trackBeautyTiles || []) {
      try { image?.destroy?.(); } catch {}
    }
    this._trackBeautyTiles = [];
    this._beautyLayerActive = false;
  }

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

    const staticSurfaceDetails = [];
    for (const obj of [this._materialEdgeWear, this._environmentEdgeWear, this._semiSimBrakeMarks]) {
      if (!obj?.scene) continue;
      obj.setVisible?.(true);
      obj.active = true;
      sources.push(obj);
      staticSurfaceDetails.push(obj);
    }

    const tileMax = 2048;
    const overlap = 2;
    const stride = tileMax - overlap;
    const baked = [];
    for (let y = 0; y < worldH; y += stride) {
      for (let x = 0; x < worldW; x += stride) {
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

    try { asphalt.clearMask?.(true); } catch {}
    try { asphalt.destroy?.(); } catch {}
    try { asphaltOverlay?.clearMask?.(true); } catch {}
    try { asphaltOverlay?.destroy?.(); } catch {}
    try { maskBundle.mask?.destroy?.(); } catch {}
    try { maskBundle.gfx?.destroy?.(); } catch {}

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
      track:'karting-tenerife', worldW, worldH, bakedTiles:baked.length,
      logicalCells:map.size, maskPolys:maskBundle.polyCount,
      staticSurfaceDetails:staticSurfaceDetails.length, overlap
    });
  }
}
