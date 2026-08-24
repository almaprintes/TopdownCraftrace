import { RaceScene as BeautyRaceScene } from './RaceWorldAlignedMaterialsScene.js';

function isKartingTenerife(scene, data) {
  const id = String(data?.trackKey || scene?.trackKey || scene?.track?.meta?.id || '').trim().toLowerCase();
  if (id === 'karting-tenerife') return true;
  try { return String(localStorage.getItem('tdr2:trackKey') || '').trim().toLowerCase() === 'karting-tenerife'; } catch { return false; }
}

// Validation bridge: the red test proved track.geom.left/right is the exact visual
// road edge. Reuse those same runtime arrays as the mask for textured asphalt.
// Physics, collision, checkpoints, AI and the underlying Beauty Layer stay untouched.
export class RaceScene extends BeautyRaceScene {
  init(data) {
    this._exactRuntimeAsphaltTiles = [];
    super.init?.(data);
  }

  create(data) {
    const result = super.create(data);
    if (isKartingTenerife(this, data)) this._bakeExactRuntimeAsphalt();
    return result;
  }

  _xy(pt) {
    return Array.isArray(pt)
      ? { x: Number(pt[0]), y: Number(pt[1]) }
      : { x: Number(pt?.x), y: Number(pt?.y) };
  }

  _buildExactRuntimeRoadMask() {
    const left = this.track?.geom?.left;
    const right = this.track?.geom?.right;
    const count = Math.min(left?.length || 0, right?.length || 0);
    if (count < 3) return null;

    const g = this.add.graphics().setDepth(-10000).setScrollFactor(1);
    g.fillStyle(0xffffff, 1);
    let quads = 0;

    // Identical geometry to the red validation: one quad between each pair of
    // runtime left/right samples. No expansion, no offline reconstruction.
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const l0 = this._xy(left[i]);
      const r0 = this._xy(right[i]);
      const r1 = this._xy(right[j]);
      const l1 = this._xy(left[j]);
      if (![l0, r0, r1, l1].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) continue;
      g.fillPoints([l0, r0, r1, l1], true);
      quads++;
    }

    if (!quads) {
      g.destroy();
      return null;
    }

    const mask = g.createGeometryMask();
    g.setVisible(false);
    return { gfx: g, mask, quads };
  }

  _bakeExactRuntimeAsphalt() {
    for (const tile of this._exactRuntimeAsphaltTiles || []) {
      try { tile?.destroy?.(); } catch {}
    }
    this._exactRuntimeAsphaltTiles = [];

    if (!this._beautyLayerActive || !this.textures.exists('asphalt')) return;

    const worldW = Math.max(1, Math.ceil(Number(this.track?.meta?.worldW || this.physics?.world?.bounds?.width || 0)));
    const worldH = Math.max(1, Math.ceil(Number(this.track?.meta?.worldH || this.physics?.world?.bounds?.height || 0)));
    const bundle = this._buildExactRuntimeRoadMask();
    if (!bundle || !worldW || !worldH) return;

    const asphalt = this.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
      .setOrigin(0, 0)
      .setDepth(10.35)
      .setScrollFactor(1)
      .setMask(bundle.mask);
    asphalt.tilePositionX = 0;
    asphalt.tilePositionY = 0;

    const sources = [asphalt];
    let overlay = null;
    if (this.textures.exists('asphaltOverlay')) {
      overlay = this.add.tileSprite(0, 0, worldW, worldH, 'asphaltOverlay')
        .setOrigin(0, 0)
        .setDepth(10.4)
        .setScrollFactor(1)
        .setAlpha(0.14)
        .setMask(bundle.mask);
      overlay.tilePositionX = 0;
      overlay.tilePositionY = 0;
      sources.push(overlay);
    }

    // Freeze the exact masked material into only four world render textures.
    // Source tileSprites and mask objects are then truly destroyed.
    const splitX = Math.ceil(worldW / 2);
    const splitY = Math.ceil(worldH / 2);
    const rects = [
      { x: 0, y: 0, w: splitX, h: splitY },
      { x: splitX, y: 0, w: worldW - splitX, h: splitY },
      { x: 0, y: splitY, w: splitX, h: worldH - splitY },
      { x: splitX, y: splitY, w: worldW - splitX, h: worldH - splitY }
    ];

    const baked = [];
    try {
      for (const r of rects) {
        if (r.w <= 0 || r.h <= 0) continue;
        const rt = this.add.renderTexture(r.x, r.y, r.w, r.h)
          .setOrigin(0, 0)
          .setDepth(10.35)
          .setScrollFactor(1)
          .setVisible(false);
        rt.camera.setZoom(1);
        rt.camera.centerOn(r.x + r.w * 0.5, r.y + r.h * 0.5);
        rt.camera.roundPixels = false;
        rt.draw(sources);
        this.uiCam?.ignore?.(rt);
        baked.push(rt);
      }
    } finally {
      try { asphalt.clearMask?.(false); } catch {}
      try { asphalt.destroy?.(); } catch {}
      try { overlay?.clearMask?.(false); } catch {}
      try { overlay?.destroy?.(); } catch {}
      try { bundle.mask?.destroy?.(); } catch {}
      try { bundle.gfx?.destroy?.(); } catch {}
    }

    for (const rt of baked) rt.setVisible(true);
    this._exactRuntimeAsphaltTiles = baked;

    this.events.once('shutdown', () => {
      for (const tile of this._exactRuntimeAsphaltTiles || []) {
        try { tile?.destroy?.(); } catch {}
      }
      this._exactRuntimeAsphaltTiles = [];
    });

    console.info('[TDR2] exact runtime asphalt texture active', {
      samples: Math.min(this.track?.geom?.left?.length || 0, this.track?.geom?.right?.length || 0),
      quads: bundle.quads,
      bakedTiles: baked.length
    });
  }
}
