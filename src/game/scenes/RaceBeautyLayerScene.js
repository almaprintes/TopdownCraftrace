import { RaceScene as WorldAlignedRaceScene } from './RaceWorldAlignedMaterialsScene.js';

// Visual-only world skin. Physics, centerline, checkpoints, sectors and surface
// queries continue to come from the existing logical track geometry.
//
// Keep a track disabled until every referenced asset is present in /public.
// Enabling it replaces the legacy terrain render atomically after super.create().
const BEAUTY_TRACKS = Object.freeze({
  'karting-tenerife': Object.freeze({
    useBeautyLayer: false, // enable only when all four WebP files exist in main
    worldW: 2813,
    worldH: 2602,
    depth: -80,
    tiles: Object.freeze([
      Object.freeze({ key: 'beauty-karting-tenerife-0', url: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-0.webp', x: 0, y: 0, w: 1407, h: 1301 }),
      Object.freeze({ key: 'beauty-karting-tenerife-1', url: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-1.webp', x: 1407, y: 0, w: 1406, h: 1301 }),
      Object.freeze({ key: 'beauty-karting-tenerife-2', url: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-2.webp', x: 0, y: 1301, w: 1407, h: 1301 }),
      Object.freeze({ key: 'beauty-karting-tenerife-3', url: 'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-3.webp', x: 1407, y: 1301, w: 1406, h: 1301 })
    ])
  })
});

function normalizeTrackKey(value) {
  return String(value || '').trim().toLowerCase();
}

function storedTrackKey() {
  try { return normalizeTrackKey(localStorage.getItem('tdr2:trackKey')); }
  catch { return ''; }
}

export class RaceScene extends WorldAlignedRaceScene {
  init(data) {
    super.init?.(data);
    this._beautyInitData = data || null;
    const requested = normalizeTrackKey(data?.trackKey || data?.key || storedTrackKey());
    this._beautyPreloadConfig = BEAUTY_TRACKS[requested] || null;
  }

  preload() {
    super.preload?.();
    const cfg = this._beautyPreloadConfig;
    if (!cfg?.useBeautyLayer) return;

    for (const tile of cfg.tiles || []) {
      if (!this.textures.exists(tile.key)) this.load.image(tile.key, tile.url);
    }
  }

  create(data) {
    const result = super.create(data);

    const trackId = normalizeTrackKey(this.trackKey || this.track?.meta?.id || this.track?.meta?.slug || this._beautyInitData?.trackKey || storedTrackKey());
    const cfg = BEAUTY_TRACKS[trackId] || null;
    this._beautyConfig = cfg;
    this._beautyLayerActive = false;
    this._beautyTiles = [];

    if (!cfg?.useBeautyLayer) return result;

    const missing = (cfg.tiles || []).filter((tile) => !this.textures.exists(tile.key));
    if (missing.length) {
      console.warn('[TDR2] beauty layer unavailable; keeping legacy terrain', {
        track: trackId,
        missing: missing.map((tile) => tile.url)
      });
      return result;
    }

    try {
      this._activateBeautyLayer(cfg, trackId);
    } catch (err) {
      console.warn('[TDR2] beauty layer activation failed; legacy terrain kept', err);
    }

    return result;
  }

  _activateBeautyLayer(cfg, trackId) {
    const worldW = Math.ceil(Number(this.track?.meta?.worldW || this.worldW || 0));
    const worldH = Math.ceil(Number(this.track?.meta?.worldH || this.worldH || 0));
    if (worldW !== Number(cfg.worldW) || worldH !== Number(cfg.worldH)) {
      throw new Error(`beauty/world mismatch ${worldW}x${worldH} != ${cfg.worldW}x${cfg.worldH}`);
    }

    // Build the replacement first. Nothing legacy is destroyed until all four
    // images exist as GameObjects, so activation is atomic from the player's view.
    const beauty = [];
    for (const tile of cfg.tiles) {
      const image = this.add.image(tile.x, tile.y, tile.key)
        .setOrigin(0, 0)
        .setDisplaySize(tile.w, tile.h)
        .setScrollFactor(1)
        .setDepth(Number(cfg.depth ?? -80));
      this.uiCam?.ignore?.(image);
      beauty.push(image);
    }

    // Stop the inherited Karting Tenerife bake before its delayed callback runs.
    this._bakedAsphaltPilot = false;
    this._bakedAsphaltDone = true;

    this._destroyLegacyTerrainRender();

    // Pure JS sentinels preserve the logical cell map contract without leaving
    // renderable or updateable GameObjects alive for the old chunk renderer.
    const map = this.track?.gfxByCell;
    const logicalCells = this.track?.geom?.cells;
    if (map instanceof Map && logicalCells instanceof Map) {
      map.clear();
      for (const [key, cell] of logicalCells.entries()) {
        if (!cell?.polys?.length) continue;
        map.set(key, { tile: null, overlay: null, stroke: null, mask: null, maskG: null, beauty: true });
      }
    }

    if (this.track) {
      this.track.cullRadiusCells = 0;
      this.track.activeCells = new Set();
    }
    this._cullEnabled = true;
    this._aheadVisible = new Set();
    this._applyDirectionalLookahead = () => {};
    this._centerlineLookaheadCells = () => new Set();

    this._beautyTiles = beauty;
    this._beautyLayerActive = true;

    console.info('[TDR2] beauty layer active', {
      track: trackId,
      worldW,
      worldH,
      tiles: beauty.length
    });
  }

  _destroyLegacyTerrainRender() {
    // World backgrounds.
    for (const key of ['bgOff', 'bgGrass']) {
      const obj = this[key];
      try { obj?.clearMask?.(true); } catch {}
      try { obj?.destroy?.(); } catch {}
      this[key] = null;
    }

    try { this._grassMask?.destroy?.(); } catch {}
    try { this._grassMaskGfx?.destroy?.(); } catch {}
    this._grassMask = null;
    this._grassMaskGfx = null;

    // Any already-baked terrain from an inherited experiment.
    for (const obj of this._bakedAsphaltTiles || []) {
      try { obj?.destroy?.(); } catch {}
    }
    this._bakedAsphaltTiles = [];

    // Chunk terrain. Geometry in track.geom is deliberately untouched.
    const map = this.track?.gfxByCell;
    if (map instanceof Map) {
      for (const cell of map.values()) {
        for (const key of ['tile', 'overlay', 'stroke', 'maskG']) {
          try { cell?.[key]?.destroy?.(); } catch {}
        }
        try { cell?.mask?.destroy?.(); } catch {}
      }
    }

    // Static surface-only overlays from the current wrapper chain. These are
    // visual decoration, not physics/surface classifiers or dynamic props.
    for (const key of [
      '_materialEdgeWear',
      '_environmentEdgeWear',
      '_semiSimBrakeMarks',
      '_longitudinalAsphaltWear',
      '_premiumShoulder',
      '_edgeProbe',
      '_cornerCurbs'
    ]) {
      try { this[key]?.destroy?.(); } catch {}
      this[key] = null;
    }
  }
}
