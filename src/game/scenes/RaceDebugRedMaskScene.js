import { RaceScene as BeautyRaceScene } from './RaceWorldAlignedMaterialsScene.js';

function isKartingTenerife(scene, data) {
  const id = String(data?.trackKey || scene?.trackKey || scene?.track?.meta?.id || '').trim().toLowerCase();
  if (id === 'karting-tenerife') return true;
  try { return String(localStorage.getItem('tdr2:trackKey') || '').trim().toLowerCase() === 'karting-tenerife'; } catch { return false; }
}

// Temporary validation scene: draws the exact runtime ribbon in solid red.
// It does not modify track geometry, surface detection, physics, checkpoints or AI.
export class RaceScene extends BeautyRaceScene {
  init(data) {
    this._debugRedMaskGfx = null;
    super.init?.(data);
  }

  create(data) {
    const result = super.create(data);
    if (isKartingTenerife(this, data)) this._drawExactRuntimeRoadMask();
    return result;
  }

  _drawExactRuntimeRoadMask() {
    try { this._debugRedMaskGfx?.destroy?.(); } catch {}
    this._debugRedMaskGfx = null;

    const left = this.track?.geom?.left;
    const right = this.track?.geom?.right;
    const count = Math.min(left?.length || 0, right?.length || 0);
    if (count < 3) return;

    const xy = (p) => Array.isArray(p)
      ? { x: Number(p[0]), y: Number(p[1]) }
      : { x: Number(p?.x), y: Number(p?.y) };

    const g = this.add.graphics()
      .setDepth(10.5)
      .setScrollFactor(1);
    g.fillStyle(0xff1010, 1);

    // One exact quad per logical ribbon segment. Same left/right arrays used by
    // runtime track geometry; no texture, no expansion and no artistic inference.
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const l0 = xy(left[i]);
      const r0 = xy(right[i]);
      const r1 = xy(right[j]);
      const l1 = xy(left[j]);
      if (![l0, r0, r1, l1].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) continue;
      g.fillPoints([l0, r0, r1, l1], true);
    }

    this.uiCam?.ignore?.(g);
    this._debugRedMaskGfx = g;
    this.events.once('shutdown', () => {
      try { this._debugRedMaskGfx?.destroy?.(); } catch {}
      this._debugRedMaskGfx = null;
    });

    console.info('[TDR2] exact runtime asphalt mask debug active', { samples: count });
  }
}
