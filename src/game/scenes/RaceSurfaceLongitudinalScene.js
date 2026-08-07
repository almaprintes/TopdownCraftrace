import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Mobile-safe premium surface pass.
// World-space detail follows the track tangent; shoulder uses broad, low-alpha overlapping quads
// so it reads as one dirty edge rather than visible geometric blocks.
export class RaceScene extends MaterialRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    if (this.textures.exists(key)) this.textures.remove(key);

    const size = 768;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x5a91e3c7) || Math.random;

    ctx.fillStyle = '#30452c';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 42; i++) {
      const x = rand() * size, y = rand() * size, r = 45 + rand() * 120;
      const pick = rand();
      const c = pick > 0.84 ? '112,91,53' : pick > 0.52 ? '35,69,33' : pick > 0.24 ? '69,94,49' : '23,48,24';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.018 + rand() * 0.028})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 18000; i++) {
      const x = rand() * size, y = rand() * size;
      const dry = rand() > 0.93;
      ctx.strokeStyle = dry
        ? `rgba(151,126,72,${0.025 + rand() * 0.042})`
        : (rand() > 0.5 ? `rgba(100,132,73,${0.026 + rand() * 0.045})` : `rgba(13,43,18,${0.028 + rand() * 0.048})`);
      ctx.lineWidth = 0.38 + rand() * 0.34;
      const a = rand() * Math.PI, l = 0.65 + rand() * 1.45;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }

    for (let i = 0; i < 1900; i++) {
      ctx.fillStyle = rand() > 0.56 ? `rgba(120,94,55,${0.018 + rand() * 0.032})` : `rgba(8,30,12,${0.018 + rand() * 0.030})`;
      ctx.fillRect(rand() * size, rand() * size, 0.45 + rand() * 0.8, 0.35 + rand() * 0.7);
    }
    tex.refresh();
  }

  ensureAsphaltTexture() {
    const key = 'asphalt';
    if (this.textures.exists(key)) this.textures.remove(key);

    const size = 768;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x6f41a2d9) || Math.random;

    ctx.fillStyle = '#393532';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 34; i++) {
      const x = rand() * size, y = rand() * size, r = 85 + rand() * 185;
      const c = rand() > 0.58 ? '83,70,58' : '18,17,16';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.009 + rand() * 0.014})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 5200; i++) {
      const light = rand() > 0.79;
      ctx.fillStyle = light ? `rgba(166,157,146,${0.004 + rand() * 0.009})` : `rgba(0,0,0,${0.005 + rand() * 0.011})`;
      const s = 0.22 + rand() * 0.34;
      ctx.fillRect(rand() * size, rand() * size, s, s);
    }
    tex.refresh();
  }

  ensureAsphaltOverlayTexture() {
    const key = 'asphaltOverlay';
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, 8, 8);
    tex.getContext().clearRect(0, 0, 8, 8);
    tex.refresh();
  }

  create() {
    super.create();
    this._materialEdgeWear?.destroy?.();
    this._materialEdgeWear = null;

    try {
      const defaultTrackW = Number(this.track?.meta?.trackWidth || 160);
      const toPoint = (p, fallbackW = defaultTrackW) => Array.isArray(p)
        ? { x: Number(p[0]), y: Number(p[1]), width: fallbackW }
        : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || fallbackW) };

      const center = (this.track?.geom?.center || []).map((p) => toPoint(p)).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      const left = (this.track?.geom?.left || []).map((p) => toPoint(p)).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      const right = (this.track?.geom?.right || []).map((p) => toPoint(p)).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (center.length < 12) return;

      const rand = this._rng?.(0x2d934b71) || Math.random;
      const roadWear = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      const shoulder = this.add.graphics().setDepth(10.02).setScrollFactor(1);
      this.uiCam?.ignore?.([roadWear, shoulder]);
      this._longitudinalAsphaltWear = roadWear;
      this._premiumShoulder = shoulder;

      const tangentAt = (i) => {
        const p0 = center[Math.max(0, i - 3)], p1 = center[Math.min(center.length - 1, i + 3)];
        const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1;
        return { tx: dx / d, ty: dy / d };
      };

      // Sparse driven-line wear; tiny command count.
      for (let i = 5; i < center.length - 5; i += 8) {
        const p = center[i];
        const { tx, ty } = tangentAt(i);
        const nx = -ty, ny = tx;
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        for (let k = 0; k < 2; k++) {
          const laneBias = (k ? 1 : -1) * Math.min(half * 0.18, 15) + (rand() - 0.5) * 8;
          const x = p.x + nx * laneBias, y = p.y + ny * laneBias;
          const l = 18 + rand() * 30;
          roadWear.lineStyle(1.2 + rand() * 1.5, 0x151311, 0.010 + rand() * 0.010);
          roadWear.beginPath();
          roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
          roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
          roadWear.strokePath();
        }
      }

      if (left.length === center.length && right.length === center.length) {
        const paintEdgeSoil = (edgePts) => {
          const step = 5;
          for (let i = step; i < center.length - step; i += step) {
            const c = center[i], e = edgePts[i];
            if (!c || !e) continue;

            const { tx, ty } = tangentAt(i);
            let ox = e.x - c.x, oy = e.y - c.y;
            const od = Math.hypot(ox, oy) || 1;
            ox /= od; oy /= od;

            // Length adapts to local spacing so neighbouring samples overlap naturally.
            const prev = center[Math.max(0, i - step)];
            const next = center[Math.min(center.length - 1, i + step)];
            const localSpan = Math.max(18, Math.min(48, Math.hypot(next.x - prev.x, next.y - prev.y) * 0.62));
            const halfLen = localSpan * 0.5;

            // Slightly different widths at both ends remove the repeated-rectangle look.
            const inner0 = 0.8 + rand() * 1.2;
            const inner1 = 0.8 + rand() * 1.2;
            const outer0 = 6.0 + rand() * 3.0;
            const outer1 = 6.0 + rand() * 3.0;

            const a0x = e.x - tx * halfLen + ox * inner0;
            const a0y = e.y - ty * halfLen + oy * inner0;
            const a1x = e.x + tx * halfLen + ox * inner1;
            const a1y = e.y + ty * halfLen + oy * inner1;
            const b1x = e.x + tx * halfLen + ox * outer1;
            const b1y = e.y + ty * halfLen + oy * outer1;
            const b0x = e.x - tx * halfLen + ox * outer0;
            const b0y = e.y - ty * halfLen + oy * outer0;

            const color = rand() > 0.5 ? 0x604b38 : 0x705940;
            shoulder.fillStyle(color, 0.055 + rand() * 0.035);
            shoulder.beginPath();
            shoulder.moveTo(a0x, a0y);
            shoulder.lineTo(a1x, a1y);
            shoulder.lineTo(b1x, b1y);
            shoulder.lineTo(b0x, b0y);
            shoulder.closePath();
            shoulder.fillPath();

            // Very faint dusty outer feather, still one cheap quad.
            const dust0 = outer0 + 5 + rand() * 3;
            const dust1 = outer1 + 5 + rand() * 3;
            shoulder.fillStyle(0x8b714c, 0.025 + rand() * 0.020);
            shoulder.beginPath();
            shoulder.moveTo(e.x - tx * halfLen + ox * outer0, e.y - ty * halfLen + oy * outer0);
            shoulder.lineTo(e.x + tx * halfLen + ox * outer1, e.y + ty * halfLen + oy * outer1);
            shoulder.lineTo(e.x + tx * halfLen + ox * dust1, e.y + ty * halfLen + oy * dust1);
            shoulder.lineTo(e.x - tx * halfLen + ox * dust0, e.y - ty * halfLen + oy * dust0);
            shoulder.closePath();
            shoulder.fillPath();
          }
        };

        paintEdgeSoil(left);
        paintEdgeSoil(right);
      }
    } catch (err) {
      console.warn('[TDR2] Mobile-safe premium surface pass failed', err);
    }
  }
}
