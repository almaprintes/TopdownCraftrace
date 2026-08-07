import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// Current priority: a clean believable road/soil/grass transition. No decorative road-edge
// dashes or procedural kerb blocks until we have a continuous geometry-safe kerb solution.
export class RaceScene extends MaterialRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    if (this.textures.exists(key)) this.textures.remove(key);

    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x5a91e3c7) || Math.random;

    ctx.fillStyle = '#31472d';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 90; i++) {
      const x = rand() * size, y = rand() * size, r = 42 + rand() * 150;
      const pick = rand();
      const c = pick > 0.75 ? '116,96,54' : pick > 0.40 ? '27,62,29' : '70,98,50';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.030 + rand() * 0.055})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 62000; i++) {
      const x = rand() * size, y = rand() * size;
      const dry = rand() > 0.91;
      ctx.strokeStyle = dry
        ? `rgba(159,134,75,${0.040 + rand() * 0.070})`
        : (rand() > 0.50 ? `rgba(106,139,77,${0.035 + rand() * 0.065})` : `rgba(16,48,20,${0.040 + rand() * 0.070})`);
      ctx.lineWidth = 0.42 + rand() * 0.46;
      const a = rand() * Math.PI, l = 0.8 + rand() * 2.0;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }

    for (let i = 0; i < 7000; i++) {
      ctx.fillStyle = rand() > 0.55 ? `rgba(122,94,52,${0.025 + rand() * 0.055})` : `rgba(8,31,13,${0.024 + rand() * 0.050})`;
      ctx.fillRect(rand() * size, rand() * size, 0.5 + rand() * 1.5, 0.5 + rand() * 1.2);
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

    for (let i = 0; i < 58; i++) {
      const x = rand() * size, y = rand() * size, r = 85 + rand() * 230;
      const c = rand() > 0.58 ? '79,66,55' : '19,18,17';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.010 + rand() * 0.018})`); grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 7600; i++) {
      ctx.fillStyle = rand() > 0.82 ? `rgba(155,148,138,${0.004 + rand() * 0.010})` : `rgba(0,0,0,${0.005 + rand() * 0.012})`;
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

      // Longitudinal road use only: no transverse decorative marks.
      for (let i = 3; i < center.length - 3; i += 2) {
        const p = center[i];
        const { tx, ty, nx, ny } = tangentAt(i);
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        const strokes = 4 + Math.floor(rand() * 5);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.30, 82);
          const along = (rand() - 0.5) * 28;
          const x = p.x + nx * laneBias + tx * along, y = p.y + ny * laneBias + ty * along;
          const l = 34 + rand() * 78, dark = rand() > 0.18;
          roadWear.lineStyle(2 + rand() * 4.2, dark ? 0x151311 : 0x766b60, dark ? 0.018 + rand() * 0.028 : 0.008 + rand() * 0.014);
          roadWear.beginPath(); roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5); roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5); roadWear.strokePath();
        }
      }

      // Soft organic shoulder. Nothing is drawn on the asphalt edge itself: this deliberately
      // avoids the dashed-line look and leaves a natural, imperfect road-to-earth boundary.
      for (let i = 2; i < center.length - 2; i += 2) {
        const p = center[i];
        const { tx, ty, nx, ny } = tangentAt(i);
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        for (const side of [-1, 1]) {
          const ex = p.x + nx * half * side, ey = p.y + ny * half * side;
          const ox = nx * side, oy = ny * side;

          // Dense near-edge soil creates continuity through overlap, but stays irregular.
          for (let s = 0; s < 11; s++) {
            const along = (rand() - 0.5) * 24;
            const out = 1.5 + rand() * 13;
            const x = ex + tx * along + ox * out, y = ey + ty * along + oy * out;
            const pick = rand();
            const color = pick > 0.70 ? 0x735d43 : pick > 0.32 ? 0x584634 : 0x44382d;
            shoulder.fillStyle(color, 0.10 + rand() * 0.17);
            shoulder.fillEllipse(x, y, 3 + rand() * 8, 1.5 + rand() * 4);
          }

          // Sparse dry material farther into the turf gives a soft fade instead of a cutout.
          for (let s = 0; s < 5; s++) {
            const along = (rand() - 0.5) * 28;
            const out = 12 + rand() * 24;
            const x = ex + tx * along + ox * out, y = ey + ty * along + oy * out;
            shoulder.fillStyle(rand() > 0.5 ? 0x927b50 : 0x63523a, 0.08 + rand() * 0.13);
            shoulder.fillCircle(x, y, 0.6 + rand() * 1.6);
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
