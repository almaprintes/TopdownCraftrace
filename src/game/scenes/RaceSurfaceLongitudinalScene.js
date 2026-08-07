import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// Priority: believable asphalt -> dirty shoulder -> grass transition without road-like edge dashes.
export class RaceScene extends MaterialRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    if (this.textures.exists(key)) this.textures.remove(key);

    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x5a91e3c7) || Math.random;

    ctx.fillStyle = '#30452c';
    ctx.fillRect(0, 0, size, size);

    // Larger organic colour drift so the field does not read as flat green carpet.
    for (let i = 0; i < 135; i++) {
      const x = rand() * size, y = rand() * size, r = 34 + rand() * 135;
      const pick = rand();
      const c = pick > 0.80 ? '129,105,58' : pick > 0.48 ? '32,67,31' : pick > 0.20 ? '74,101,52' : '24,49,25';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.045 + rand() * 0.075})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Fine short blades.
    for (let i = 0; i < 70000; i++) {
      const x = rand() * size, y = rand() * size;
      const dry = rand() > 0.88;
      ctx.strokeStyle = dry
        ? `rgba(163,137,77,${0.050 + rand() * 0.085})`
        : (rand() > 0.50 ? `rgba(108,143,79,${0.045 + rand() * 0.080})` : `rgba(15,47,19,${0.045 + rand() * 0.085})`);
      ctx.lineWidth = 0.42 + rand() * 0.52;
      const a = rand() * Math.PI, l = 0.8 + rand() * 2.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }

    // Small bare/dry spots, irregular and sparse.
    for (let i = 0; i < 11000; i++) {
      const dry = rand() > 0.45;
      ctx.fillStyle = dry ? `rgba(130,103,59,${0.035 + rand() * 0.070})` : `rgba(7,29,12,${0.030 + rand() * 0.060})`;
      ctx.fillEllipse(rand() * size, rand() * size, 0.5 + rand() * 2.2, 0.4 + rand() * 1.7);
    }
    tex.refresh();
  }

  ensureAsphaltTexture() {
    const key = 'asphalt';
    if (this.textures.exists(key)) this.textures.remove(key);
    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x6f41a2d9) || Math.random;
    ctx.fillStyle = '#383431'; ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 62; i++) {
      const x = rand() * size, y = rand() * size, r = 90 + rand() * 225;
      const c = rand() > 0.58 ? '77,65,55' : '20,19,18';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.011 + rand() * 0.017})`); grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 7800; i++) {
      ctx.fillStyle = rand() > 0.82 ? `rgba(155,148,138,${0.004 + rand() * 0.009})` : `rgba(0,0,0,${0.005 + rand() * 0.010})`;
      ctx.fillRect(rand() * size, rand() * size, 0.35, 0.35);
    }
    tex.refresh();
  }

  ensureAsphaltOverlayTexture() {
    const key = 'asphaltOverlay';
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, 8, 8);
    tex.getContext().clearRect(0, 0, 8, 8); tex.refresh();
  }

  create() {
    super.create();
    this._materialEdgeWear?.destroy?.();
    this._materialEdgeWear = null;

    try {
      const defaultTrackW = Number(this.track?.meta?.trackWidth || 160);
      const center = (this.track?.geom?.center || []).map((p) => Array.isArray(p)
        ? { x: Number(p[0]), y: Number(p[1]), width: defaultTrackW }
        : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || defaultTrackW) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (center.length < 12) return;

      const rand = this._rng?.(0x2d934b71) || Math.random;
      const roadWear = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      const shoulder = this.add.graphics().setDepth(9.92).setScrollFactor(1);
      this.uiCam?.ignore?.([roadWear, shoulder]);
      this._longitudinalAsphaltWear = roadWear;
      this._premiumShoulder = shoulder;

      const tangentAt = (i) => {
        const p0 = center[Math.max(0, i - 2)], p1 = center[Math.min(center.length - 1, i + 2)];
        const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1;
        return { tx: dx / d, ty: dy / d, nx: -dy / d, ny: dx / d };
      };

      // Subtle longitudinal wear: shorter, softer and less rail-like.
      for (let i = 3; i < center.length - 3; i += 2) {
        const p = center[i];
        const { tx, ty, nx, ny } = tangentAt(i);
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        const strokes = 3 + Math.floor(rand() * 4);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.28, 80);
          const along = (rand() - 0.5) * 24;
          const x = p.x + nx * laneBias + tx * along, y = p.y + ny * laneBias + ty * along;
          const l = 24 + rand() * 56, dark = rand() > 0.20;
          roadWear.lineStyle(1.5 + rand() * 3.2, dark ? 0x181513 : 0x74695d, dark ? 0.012 + rand() * 0.020 : 0.006 + rand() * 0.010);
          roadWear.beginPath(); roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5); roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5); roadWear.strokePath();
        }
      }

      // Stronger organic shoulder: a visible but irregular strip of compacted dirt fading into grass.
      for (let i = 2; i < center.length - 2; i += 2) {
        const p = center[i];
        const { tx, ty, nx, ny } = tangentAt(i);
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        for (const side of [-1, 1]) {
          const ex = p.x + nx * half * side, ey = p.y + ny * half * side;
          const ox = nx * side, oy = ny * side;

          // Core dirt hugs the asphalt and overlaps enough to read continuously.
          for (let s = 0; s < 20; s++) {
            const along = (rand() - 0.5) * 28;
            const out = 0.5 + rand() * 12;
            const x = ex + tx * along + ox * out, y = ey + ty * along + oy * out;
            const pick = rand();
            const color = pick > 0.72 ? 0x7a6348 : pick > 0.34 ? 0x5d4936 : 0x45382d;
            shoulder.fillStyle(color, 0.12 + rand() * 0.20);
            shoulder.fillEllipse(x, y, 4 + rand() * 9, 1.6 + rand() * 4.4);
          }

          // Dry, dusty transition beyond the compacted band.
          for (let s = 0; s < 9; s++) {
            const along = (rand() - 0.5) * 32;
            const out = 10 + rand() * 28;
            const x = ex + tx * along + ox * out, y = ey + ty * along + oy * out;
            const color = rand() > 0.50 ? 0x9a8053 : 0x69553c;
            shoulder.fillStyle(color, 0.08 + rand() * 0.15);
            shoulder.fillEllipse(x, y, 1 + rand() * 3.2, 0.6 + rand() * 2.2);
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
