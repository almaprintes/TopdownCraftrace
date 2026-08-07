import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// IMPORTANT: the base renderer maps the *same full asphalt image* into every track cell.
// Any visible pattern in that image therefore repeats cell-by-cell. This scene deliberately
// makes the cell texture almost patternless and puts directional wear back in world space.
// Physics, track, cameras, HUD and gameplay remain untouched.
export class RaceScene extends MaterialRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    // Force a fresh material on scene recreation so old cached procedural textures cannot survive.
    if (this.textures.exists(key)) this.textures.remove(key);

    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x5a91e3c7) || Math.random;

    ctx.fillStyle = '#31482f';
    ctx.fillRect(0, 0, size, size);

    // Large soft colour drift, intentionally low contrast.
    for (let i = 0; i < 54; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 65 + rand() * 180;
      const pick = rand();
      const c = pick > 0.72 ? '116,103,61' : pick > 0.38 ? '27,62,30' : '73,98,54';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.018 + rand() * 0.032})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Fine turf. Tiny, short blades with a few dry ones; no large repeated clumps.
    for (let i = 0; i < 44000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const dry = rand() > 0.91;
      ctx.strokeStyle = dry
        ? `rgba(147,124,70,${0.025 + rand() * 0.050})`
        : (rand() > 0.52
          ? `rgba(100,126,72,${0.025 + rand() * 0.050})`
          : `rgba(17,46,21,${0.025 + rand() * 0.055})`);
      ctx.lineWidth = 0.35 + rand() * 0.45;
      const a = rand() * Math.PI;
      const l = 0.7 + rand() * 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    tex.refresh();
  }

  ensureAsphaltTexture() {
    const key = 'asphalt';
    // The texture manager survives scene restarts. Remove any previous asphalt explicitly.
    if (this.textures.exists(key)) this.textures.remove(key);

    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x6f41a2d9) || Math.random;

    // Near-flat warm charcoal. This is deliberate: the base renderer repeats this image
    // once per culling cell, so visible stones/patterns here become an obvious wallpaper.
    ctx.fillStyle = '#373432';
    ctx.fillRect(0, 0, size, size);

    // Broad, almost subliminal value variation only.
    for (let i = 0; i < 46; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 90 + rand() * 220;
      const c = rand() > 0.58 ? '78,67,58' : '17,17,17';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.008 + rand() * 0.015})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // True micrograin: sub-pixel, low alpha, no pebble-sized marks.
    for (let i = 0; i < 5500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.82
        ? `rgba(151,145,135,${0.004 + rand() * 0.009})`
        : `rgba(0,0,0,${0.005 + rand() * 0.010})`;
      ctx.fillRect(x, y, 0.35, 0.35);
    }

    tex.refresh();
  }

  ensureAsphaltOverlayTexture() {
    const key = 'asphaltOverlay';
    // Kill the inherited repeated overlay completely. All useful wear is painted below
    // in world coordinates, aligned to the real road tangent.
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, 8, 8);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 8, 8);
    tex.refresh();
  }

  create() {
    super.create();

    // Remove inherited approximate shoulder dirt: on this geometry it can leak onto asphalt.
    this._materialEdgeWear?.destroy?.();
    this._materialEdgeWear = null;

    try {
      const centerRaw = this.track?.geom?.center || [];
      const defaultTrackW = Number(this.track?.meta?.trackWidth || 160);
      const center = centerRaw
        .map((p) => Array.isArray(p)
          ? { x: Number(p[0]), y: Number(p[1]), width: defaultTrackW }
          : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || defaultTrackW) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      if (center.length < 10) return;

      const g = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._longitudinalAsphaltWear = g;
      const rand = this._rng?.(0x2d934b71) || Math.random;

      for (let i = 3; i < center.length - 3; i += 2) {
        const p = center[i];
        const p0 = center[i - 2];
        const p1 = center[i + 2];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy);
        if (len < 8 || len > 150) continue;

        const tx = dx / len;
        const ty = dy / len;
        const nx = -ty;
        const ny = tx;
        const trackW = Math.max(90, Math.min(250, Number(p.width || defaultTrackW)));
        const half = trackW * 0.5;

        // Long, low-contrast grime that follows the road rather than the screen axes.
        const strokes = 3 + Math.floor(rand() * 4);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.34, 84);
          const along = (rand() - 0.5) * 28;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const streakLen = 34 + rand() * 72;
          const wobble = (rand() - 0.5) * 0.05;
          const ca = Math.cos(wobble);
          const sa = Math.sin(wobble);
          const ux = tx * ca - ty * sa;
          const uy = tx * sa + ty * ca;
          const dark = rand() > 0.16;
          g.lineStyle(2.0 + rand() * 4.0, dark ? 0x151311 : 0x766c61,
            dark ? 0.018 + rand() * 0.026 : 0.008 + rand() * 0.014);
          g.beginPath();
          g.moveTo(x - ux * streakLen * 0.5, y - uy * streakLen * 0.5);
          g.lineTo(x + ux * streakLen * 0.5, y + uy * streakLen * 0.5);
          g.strokePath();
        }

        // Two extremely diffuse usage zones, discontinuous and slightly wandering.
        if (i % 4 === 0 && rand() > 0.20) {
          const lane = Math.min(27, trackW * 0.17);
          for (const side of [-1, 1]) {
            const jitter = (rand() - 0.5) * 10;
            const x = p.x + nx * (lane * side + jitter);
            const y = p.y + ny * (lane * side + jitter);
            const l = 42 + rand() * 72;
            g.lineStyle(9 + rand() * 6, 0x090807, 0.010 + rand() * 0.015);
            g.beginPath();
            g.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
            g.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
            g.strokePath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
