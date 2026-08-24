import { RaceScene as WorldAlignedRaceScene } from './RaceWorldAlignedMaterialsScene.js';
import { getTrackBeautyLayerConfig } from '../tracks/trackBeautyLayers.js';

function trackIdFrom(data, scene) {
  const fromData = data?.trackKey;
  const fromScene = scene?.trackKey || scene?.track?.meta?.id;
  let fromStorage = null;
  try { fromStorage = localStorage.getItem('tdr2:trackKey'); } catch {}
  return String(fromData || fromScene || fromStorage || '').trim().toLowerCase();
}

// Final visual wrapper for baked full-world track art.
// It replaces terrain RENDER only. Physics, centerline, checkpoints, sectors,
// laps, kerb surface detection and all vehicle systems remain inherited.
export class RaceScene extends WorldAlignedRaceScene {
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

  // RaceBakedAsphaltScene schedules this polymorphically after create().
  // Once Beauty is live, the inherited baking path must never run underneath it.
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
    // Full-world OFF/GRASS terrain and its mask.
    try { this.bgGrass?.clearMask?.(false); } catch {}
    try { this.bgGrass?.destroy?.(); } catch {}
    try { this.bgOff?.destroy?.(); } catch {}
    this.bgGrass = null;
    this.bgOff = null;

    try { this._grassMask?.destroy?.(); } catch {}
    try { this._grassMaskGfx?.destroy?.(); } catch {}
    this._grassMask = null;
    this._grassMaskGfx = null;

    // Any previously baked terrain must not survive a Beauty activation.
    for (const obj of this._bakedAsphaltTiles || []) {
      try { obj?.destroy?.(); } catch {}
    }
    this._bakedAsphaltTiles = [];

    // Destroy chunk render objects and masks, then leave JS-only sentinels so
    // inherited culling cannot recreate visual terrain.
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
          map.set(key, { tile: null, overlay: null, stroke: null, mask: null, maskG: null, beauty: true });
        }
      }
    }

    // Ground-only decoration created by the previous material pipeline.
    for (const key of ['_materialEdgeWear', '_environmentEdgeWear', '_semiSimBrakeMarks']) {
      try { this[key]?.destroy?.(); } catch {}
      this[key] = null;
    }

    // Disable all asphalt visual culling/lookahead work. Logical cells stay alive.
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
      // Build the replacement first, hidden. The swap below is then atomic.
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

      // Scene shutdown destroys the replacement explicitly and removes this
      // one-shot listener. No hidden GameObjects or update hooks survive.
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
}
