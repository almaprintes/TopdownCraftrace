import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Mobile-safe premium surface pass.
// Keep the semi-realistic look, but cap persistent Phaser Graphics commands aggressively.
// The previous edge treatment created thousands of circles/lines that WebGL had to redraw
// every frame on iPhone, causing the sudden frame-time spikes reported during driving.
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

    // Canvas work happens once at scene creation; still keep it reasonably light for mobile.
    for (let i = 0; i < 58; i++) {
      const x = rand() * size, y = rand() * size, r = 34 + rand() * 105;
      const pick = rand();
      const c = pick > 0.82 ? '116,98,57' : pick > 0.50 ? '31,66,31' : pick > 0.22 ? '72,99,52' : '24,50,25';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.026 + rand() * 0.040})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 22000; i++) {
      const x = rand() * size, y = rand() * size;
      const dry = rand() > 0.91;
      ctx.strokeStyle = dry
        ? `rgba(157,132,75,${0.030 + rand() * 0.050})`
        : (rand() > 0.50 ? `rgba(105,137,77,${0.030 + rand() * 0.050})` : `rgba(15,47,19,${0.032 + rand() * 0.055})`);
      ctx.lineWidth = 0.40 + rand() * 0.40;
      const a = rand() * Math.PI, l = 0.7 + rand() * 1.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    for (let i = 0; i < 2600; i++) {
      const dry = rand() > 0.50;
      ctx.fillStyle = dry ? `rgba(126,99,57,${0.020 + rand() * 0.042})` : `rgba(7,29,12,${0.020 + rand() * 0.038})`;
      ctx.fillRect(rand() * size, rand() * size, 0.5 + rand(), 0.4 + rand() * 0.9);
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

    ctx.fillStyle = '#383431';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 38; i++) {
      const x = rand() * size, y = rand() * size, r = 70 + rand() * 175;
      const c = rand() > 0.58 ? '77,65,55' : '20,19,18';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.010 + rand() * 0.015})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = rand() > 0.82 ? `rgba(155,148,138,${0.004 + rand() * 0.008})` : `rgba(0,0,0,${0.005 + rand() * 0.009})`;
      ctx.fillRect(rand() * size, rand() * size, 0.35, 0.35);
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

      // Much lower persistent command count: sample every 6 points and draw only 2 strokes.
      for (let i = 4; i < center.length - 4; i += 6) {
        const p = center[i];
        const { tx, ty } = tangentAt(i);
        const nx = -ty, ny = tx;
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        for (let k = 0; k < 2; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.10, 68);
          const x = p.x + nx * laneBias, y = p.y + ny * laneBias;
          const l = 22 + rand() * 40;
          roadWear.lineStyle(1.5 + rand() * 2.0, 0x171513, 0.010 + rand() * 0.012);
          roadWear.beginPath();
          roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
          roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
          roadWear.strokePath();
        }
      }

      // Exact edge anchoring, but only every 6th point and with a handful of larger soft marks.
      // This reduces persistent edge draw commands by roughly an order of magnitude.
      if (left.length === center.length && right.length === center.length) {
        const paintEdgeSoil = (edgePts) => {
          for (let i = 3; i < center.length - 3; i += 6) {
            const c = center[i], e = edgePts[i];
            if (!c || !e) continue;
            const { tx, ty } = tangentAt(i);
            let ox = e.x - c.x, oy = e.y - c.y;
            const od = Math.hypot(ox, oy) || 1;
            ox /= od; oy /= od;

            // 4 overlapping compact-soil ellipses instead of 18 circles.
            for (let s = 0; s < 4; s++) {
              const along = (rand() - 0.5) * 28;
              const out = 2 + rand() * 10;
              const x = e.x + tx * along + ox * out;
              const y = e.y + ty * along + oy * out;
              const pick = rand();
              const color = pick > 0.70 ? 0x765f45 : pick > 0.32 ? 0x5a4735 : 0x43372c;
              shoulder.fillStyle(color, 0.15 + rand() * 0.18);
              shoulder.fillEllipse(x, y, 5 + rand() * 9, 2.5 + rand() * 5);
            }

            // 2 sparse dusty flecks for the grass transition.
            for (let s = 0; s < 2; s++) {
              const along = (rand() - 0.5) * 30;
              const out = 12 + rand() * 18;
              const x = e.x + tx * along + ox * out;
              const y = e.y + ty * along + oy * out;
              shoulder.fillStyle(rand() > 0.5 ? 0x947b50 : 0x68543c, 0.08 + rand() * 0.11);
              shoulder.fillEllipse(x, y, 2 + rand() * 4, 1 + rand() * 3);
            }
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
