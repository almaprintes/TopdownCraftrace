import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// Road dressing is generated from the centerline/tangent locally instead of connecting
// inherited offset polylines. That avoids the self-crossing spikes seen in tight hairpins.
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
      const x = rand() * size;
      const y = rand() * size;
      const r = 42 + rand() * 150;
      const pick = rand();
      const c = pick > 0.75 ? '116,96,54' : pick > 0.40 ? '27,62,29' : '70,98,50';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.030 + rand() * 0.055})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 62000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const dry = rand() > 0.91;
      ctx.strokeStyle = dry
        ? `rgba(159,134,75,${0.040 + rand() * 0.070})`
        : (rand() > 0.50
          ? `rgba(106,139,77,${0.035 + rand() * 0.065})`
          : `rgba(16,48,20,${0.040 + rand() * 0.070})`);
      ctx.lineWidth = 0.42 + rand() * 0.46;
      const a = rand() * Math.PI;
      const l = 0.8 + rand() * 2.0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    for (let i = 0; i < 7000; i++) {
      ctx.fillStyle = rand() > 0.55
        ? `rgba(122,94,52,${0.025 + rand() * 0.055})`
        : `rgba(8,31,13,${0.024 + rand() * 0.050})`;
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

    ctx.fillStyle = '#383431';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 58; i++) {
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

    for (let i = 0; i < 7600; i++) {
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

    this._materialEdgeWear?.destroy?.();
    this._materialEdgeWear = null;

    try {
      const defaultTrackW = Number(this.track?.meta?.trackWidth || 160);
      const center = (this.track?.geom?.center || [])
        .map((p) => Array.isArray(p)
          ? { x: Number(p[0]), y: Number(p[1]), width: defaultTrackW }
          : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || defaultTrackW) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      if (center.length < 12) return;

      const rand = this._rng?.(0x2d934b71) || Math.random;
      const roadWear = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      const shoulder = this.add.graphics().setDepth(9.92).setScrollFactor(1);
      const edge = this.add.graphics().setDepth(12.05).setScrollFactor(1);
      const curbs = this.add.graphics().setDepth(12.12).setScrollFactor(1);
      this.uiCam?.ignore?.([roadWear, shoulder, edge, curbs]);
      this._longitudinalAsphaltWear = roadWear;
      this._premiumShoulder = shoulder;
      this._premiumRoadEdge = edge;
      this._premiumCurbs = curbs;

      const tangentAt = (i) => {
        const p0 = center[Math.max(0, i - 2)];
        const p1 = center[Math.min(center.length - 1, i + 2)];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const d = Math.hypot(dx, dy) || 1;
        return { tx: dx / d, ty: dy / d, nx: -dy / d, ny: dx / d };
      };

      const curvatureAt = (i) => {
        const a = center[Math.max(0, i - 4)];
        const b = center[i];
        const c = center[Math.min(center.length - 1, i + 4)];
        const v1x = b.x - a.x;
        const v1y = b.y - a.y;
        const v2x = c.x - b.x;
        const v2y = c.y - b.y;
        const d1 = Math.hypot(v1x, v1y) || 1;
        const d2 = Math.hypot(v2x, v2y) || 1;
        return (v1x * v2y - v1y * v2x) / (d1 * d2);
      };

      // Asphalt usage: subtle and longitudinal.
      for (let i = 3; i < center.length - 3; i += 2) {
        const p = center[i];
        const { tx, ty, nx, ny } = tangentAt(i);
        const trackW = Math.max(90, Math.min(250, Number(p.width || defaultTrackW)));
        const half = trackW * 0.5;

        const strokes = 4 + Math.floor(rand() * 5);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.30, 82);
          const along = (rand() - 0.5) * 28;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const l = 34 + rand() * 78;
          const dark = rand() > 0.18;
          roadWear.lineStyle(2 + rand() * 4.2, dark ? 0x151311 : 0x766b60,
            dark ? 0.018 + rand() * 0.028 : 0.008 + rand() * 0.014);
          roadWear.beginPath();
          roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
          roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
          roadWear.strokePath();
        }
      }

      // Local road dressing. Each sample is independent: no polyline can bridge a hairpin.
      let curbPhaseL = 0;
      let curbPhaseR = 0;
      for (let i = 2; i < center.length - 2; i += 2) {
        const p = center[i];
        const { tx, ty, nx, ny } = tangentAt(i);
        const trackW = Math.max(90, Math.min(250, Number(p.width || defaultTrackW)));
        const half = trackW * 0.5;
        const sampleLen = 10 + rand() * 5;
        const curv = curvatureAt(i);

        for (const side of [-1, 1]) {
          const ex = p.x + nx * half * side;
          const ey = p.y + ny * half * side;
          const ox = nx * side;
          const oy = ny * side;

          // Narrow dirt band directly outside asphalt, broken into small overlapping flecks.
          for (let s = 0; s < 5; s++) {
            const along = (rand() - 0.5) * sampleLen * 1.8;
            const out = 2 + rand() * 15;
            const x = ex + tx * along + ox * out;
            const y = ey + ty * along + oy * out;
            shoulder.fillStyle(rand() > 0.52 ? 0x66513b : 0x4c3d30, 0.18 + rand() * 0.20);
            shoulder.fillEllipse(x, y, 2.5 + rand() * 6, 1.4 + rand() * 3.5);
          }

          // A few dry fragments farther out merge the shoulder into the grass.
          for (let s = 0; s < 2; s++) {
            const along = (rand() - 0.5) * sampleLen * 2;
            const out = 14 + rand() * 18;
            const x = ex + tx * along + ox * out;
            const y = ey + ty * along + oy * out;
            shoulder.fillStyle(rand() > 0.5 ? 0x8a754b : 0x5c4c36, 0.16 + rand() * 0.18);
            shoulder.fillCircle(x, y, 0.7 + rand() * 1.5);
          }

          // Short independent edge-paint segment. No joins, therefore no crossing spikes.
          edge.lineStyle(1.5 + rand() * 0.5, 0xd8d5ce, 0.58 + rand() * 0.16);
          edge.beginPath();
          edge.moveTo(ex - tx * sampleLen * 0.5, ey - ty * sampleLen * 0.5);
          edge.lineTo(ex + tx * sampleLen * 0.5, ey + ty * sampleLen * 0.5);
          edge.strokePath();

          // Kerbs only on the inside of meaningful corners. Small local rectangles follow tangent.
          const strong = Math.abs(curv) > 0.16;
          const inside = (curv > 0 && side < 0) || (curv < 0 && side > 0);
          if (strong && inside && (i % 4 !== 0)) {
            const curbW = 7;
            const phase = side < 0 ? curbPhaseL++ : curbPhaseR++;
            const color = (phase % 2 === 0) ? 0xb83a32 : 0xe1ded5;
            const a0x = ex - tx * sampleLen * 0.55;
            const a0y = ey - ty * sampleLen * 0.55;
            const a1x = ex + tx * sampleLen * 0.55;
            const a1y = ey + ty * sampleLen * 0.55;
            const b0x = a0x + ox * curbW;
            const b0y = a0y + oy * curbW;
            const b1x = a1x + ox * curbW;
            const b1y = a1y + oy * curbW;

            curbs.fillStyle(color, 0.90);
            curbs.beginPath();
            curbs.moveTo(a0x, a0y);
            curbs.lineTo(a1x, a1y);
            curbs.lineTo(b1x, b1y);
            curbs.lineTo(b0x, b0y);
            curbs.closePath();
            curbs.fillPath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
