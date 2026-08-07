import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// The base renderer repeats one asphalt image per culling cell, so this scene keeps that
// texture nearly neutral and paints the useful visual information in world coordinates.
// Physics, track geometry, cameras, HUD and gameplay remain untouched.
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

    // Soft field variation: avoids the flat green carpet look.
    for (let i = 0; i < 84; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 45 + rand() * 150;
      const pick = rand();
      const c = pick > 0.76 ? '113,95,54' : pick > 0.40 ? '27,63,28' : '70,96,49';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.030 + rand() * 0.055})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Dense fine turf. Short enough not to look like spaghetti at race zoom.
    for (let i = 0; i < 56000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const dry = rand() > 0.90;
      ctx.strokeStyle = dry
        ? `rgba(158,132,72,${0.040 + rand() * 0.075})`
        : (rand() > 0.50
          ? `rgba(105,137,76,${0.035 + rand() * 0.070})`
          : `rgba(16,48,20,${0.040 + rand() * 0.075})`);
      ctx.lineWidth = 0.45 + rand() * 0.50;
      const a = rand() * Math.PI;
      const l = 0.8 + rand() * 2.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    // Sparse bare speckles and dry fragments.
    for (let i = 0; i < 6200; i++) {
      ctx.fillStyle = rand() > 0.55
        ? `rgba(120,91,51,${0.025 + rand() * 0.055})`
        : `rgba(8,31,13,${0.024 + rand() * 0.050})`;
      ctx.fillRect(rand() * size, rand() * size, 0.5 + rand() * 1.6, 0.5 + rand() * 1.3);
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

    // Matte warm charcoal, deliberately patternless at cell scale.
    ctx.fillStyle = '#383431';
    ctx.fillRect(0, 0, size, size);

    // Broad low-contrast tonal drift only.
    for (let i = 0; i < 54; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 85 + rand() * 230;
      const c = rand() > 0.58 ? '79,66,55' : '19,18,17';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.010 + rand() * 0.018})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Sub-pixel micrograin. No visible stones.
    for (let i = 0; i < 7200; i++) {
      ctx.fillStyle = rand() > 0.82
        ? `rgba(155,148,138,${0.004 + rand() * 0.010})`
        : `rgba(0,0,0,${0.005 + rand() * 0.012})`;
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

    // Remove inherited approximate shoulder dirt. We rebuild edges from the exact ribbon below.
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

      if (center.length < 10) return;

      const rand = this._rng?.(0x2d934b71) || Math.random;

      // ---------------------------------------------------------
      // 1) ASPHALT USE IN WORLD SPACE
      // ---------------------------------------------------------
      const roadWear = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      this.uiCam?.ignore?.(roadWear);
      this._longitudinalAsphaltWear = roadWear;

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

        const strokes = 4 + Math.floor(rand() * 5);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.32, 84);
          const along = (rand() - 0.5) * 30;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const streakLen = 38 + rand() * 82;
          const wobble = (rand() - 0.5) * 0.045;
          const ca = Math.cos(wobble);
          const sa = Math.sin(wobble);
          const ux = tx * ca - ty * sa;
          const uy = tx * sa + ty * ca;
          const dark = rand() > 0.18;

          roadWear.lineStyle(2.2 + rand() * 4.6, dark ? 0x161311 : 0x766b60,
            dark ? 0.020 + rand() * 0.030 : 0.009 + rand() * 0.016);
          roadWear.beginPath();
          roadWear.moveTo(x - ux * streakLen * 0.5, y - uy * streakLen * 0.5);
          roadWear.lineTo(x + ux * streakLen * 0.5, y + uy * streakLen * 0.5);
          roadWear.strokePath();
        }

        // Broad, dirty wheel-use bands; deliberately discontinuous.
        if (i % 4 === 0 && rand() > 0.18) {
          const lane = Math.min(27, trackW * 0.17);
          for (const side of [-1, 1]) {
            const jitter = (rand() - 0.5) * 10;
            const x = p.x + nx * (lane * side + jitter);
            const y = p.y + ny * (lane * side + jitter);
            const l = 45 + rand() * 78;
            roadWear.lineStyle(9 + rand() * 7, 0x090807, 0.012 + rand() * 0.018);
            roadWear.beginPath();
            roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
            roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
            roadWear.strokePath();
          }
        }
      }

      // ---------------------------------------------------------
      // 2) EXACT ROAD EDGE -> DIRT -> GRASS
      // Segment quads use the real left/right ribbon, so dirt cannot leak into asphalt.
      // ---------------------------------------------------------
      if (left.length === center.length && right.length === center.length) {
        const shoulder = this.add.graphics().setDepth(9.92).setScrollFactor(1);
        const edge = this.add.graphics().setDepth(12.05).setScrollFactor(1);
        const curbs = this.add.graphics().setDepth(12.12).setScrollFactor(1);
        this.uiCam?.ignore?.([shoulder, edge, curbs]);
        this._premiumShoulder = shoulder;
        this._premiumRoadEdge = edge;
        this._premiumCurbs = curbs;

        const shoulderW = 17;
        let accL = 0;
        let accR = 0;

        const outwardAt = (e, c) => {
          const dx = e.x - c.x;
          const dy = e.y - c.y;
          const d = Math.hypot(dx, dy) || 1;
          return { x: dx / d, y: dy / d };
        };

        const curvatureAt = (i) => {
          const a = center[Math.max(0, i - 2)];
          const b = center[i];
          const c = center[Math.min(center.length - 1, i + 2)];
          const v1x = b.x - a.x;
          const v1y = b.y - a.y;
          const v2x = c.x - b.x;
          const v2y = c.y - b.y;
          const d1 = Math.hypot(v1x, v1y) || 1;
          const d2 = Math.hypot(v2x, v2y) || 1;
          return (v1x * v2y - v1y * v2x) / (d1 * d2);
        };

        const drawSide = (pts, isLeft) => {
          let acc = isLeft ? accL : accR;
          for (let i = 1; i < pts.length - 2; i++) {
            const e0 = pts[i];
            const e1 = pts[i + 1];
            const c0 = center[i];
            const c1 = center[i + 1];
            const segLen = Math.hypot(e1.x - e0.x, e1.y - e0.y);
            if (segLen < 2 || segLen > 90) continue;

            const o0 = outwardAt(e0, c0);
            const o1 = outwardAt(e1, c1);
            const jitter0 = 0.82 + rand() * 0.36;
            const jitter1 = 0.82 + rand() * 0.36;
            const q0 = { x: e0.x + o0.x * shoulderW * jitter0, y: e0.y + o0.y * shoulderW * jitter0 };
            const q1 = { x: e1.x + o1.x * shoulderW * jitter1, y: e1.y + o1.y * shoulderW * jitter1 };

            // Compact brown soil immediately outside asphalt.
            shoulder.fillStyle(rand() > 0.54 ? 0x66513b : 0x4b3d30, 0.64);
            shoulder.beginPath();
            shoulder.moveTo(e0.x, e0.y);
            shoulder.lineTo(e1.x, e1.y);
            shoulder.lineTo(q1.x, q1.y);
            shoulder.lineTo(q0.x, q0.y);
            shoulder.closePath();
            shoulder.fillPath();

            // Dry speckles soften the far side of the strip into the turf.
            for (let s = 0; s < 3; s++) {
              const t = rand();
              const ex = e0.x + (e1.x - e0.x) * t;
              const ey = e0.y + (e1.y - e0.y) * t;
              const ox = o0.x * (shoulderW * (0.72 + rand() * 0.72));
              const oy = o0.y * (shoulderW * (0.72 + rand() * 0.72));
              shoulder.fillStyle(rand() > 0.5 ? 0x8a754b : 0x554735, 0.20 + rand() * 0.18);
              shoulder.fillCircle(ex + ox, ey + oy, 0.7 + rand() * 1.5);
            }

            // Thin dirty-white edge paint, slightly broken by alpha variation.
            edge.lineStyle(1.6 + rand() * 0.7, 0xd8d6cf, 0.62 + rand() * 0.18);
            edge.beginPath();
            edge.moveTo(e0.x, e0.y);
            edge.lineTo(e1.x, e1.y);
            edge.strokePath();

            // Red/white kerbs only where the road actually bends strongly.
            const curv = curvatureAt(i);
            const strong = Math.abs(curv) > 0.085;
            const inside = (curv > 0 && isLeft) || (curv < 0 && !isLeft);
            if (strong && inside) {
              const curbW = 7;
              const r0 = { x: e0.x + o0.x * curbW, y: e0.y + o0.y * curbW };
              const r1 = { x: e1.x + o1.x * curbW, y: e1.y + o1.y * curbW };
              const band = Math.floor(acc / 15);
              curbs.fillStyle((band % 2 === 0) ? 0xb83a32 : 0xe1ded5, 0.92);
              curbs.beginPath();
              curbs.moveTo(e0.x, e0.y);
              curbs.lineTo(e1.x, e1.y);
              curbs.lineTo(r1.x, r1.y);
              curbs.lineTo(r0.x, r0.y);
              curbs.closePath();
              curbs.fillPath();

              // Dirt/damage line over curb to avoid toy-plastic perfection.
              curbs.lineStyle(0.7, 0x3c3029, 0.20);
              curbs.beginPath();
              curbs.moveTo(r0.x, r0.y);
              curbs.lineTo(r1.x, r1.y);
              curbs.strokePath();
            }

            acc += segLen;
          }
          if (isLeft) accL = acc; else accR = acc;
        };

        drawSide(left, true);
        drawSide(right, false);
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
