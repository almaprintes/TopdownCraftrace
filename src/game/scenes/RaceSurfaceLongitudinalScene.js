import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// Dirt is anchored to the real ribbon edge point-by-point (never joined as a polyline),
// so it follows the asphalt accurately without creating hairpin spikes.
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

    // Low-frequency colour drift. Smaller and softer than the previous blotchy pass.
    for (let i = 0; i < 105; i++) {
      const x = rand() * size, y = rand() * size, r = 42 + rand() * 125;
      const pick = rand();
      const c = pick > 0.82 ? '116,98,57' : pick > 0.50 ? '31,66,31' : pick > 0.22 ? '72,99,52' : '24,50,25';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.028 + rand() * 0.045})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Fine short turf.
    for (let i = 0; i < 76000; i++) {
      const x = rand() * size, y = rand() * size;
      const dry = rand() > 0.91;
      ctx.strokeStyle = dry
        ? `rgba(157,132,75,${0.030 + rand() * 0.055})`
        : (rand() > 0.50 ? `rgba(105,137,77,${0.030 + rand() * 0.055})` : `rgba(15,47,19,${0.032 + rand() * 0.060})`);
      ctx.lineWidth = 0.38 + rand() * 0.42;
      const a = rand() * Math.PI, l = 0.7 + rand() * 1.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }

    // Very small dry/bare flecks. No large visible blobs.
    for (let i = 0; i < 7600; i++) {
      const dry = rand() > 0.50;
      ctx.fillStyle = dry ? `rgba(126,99,57,${0.020 + rand() * 0.045})` : `rgba(7,29,12,${0.020 + rand() * 0.040})`;
      ctx.fillRect(rand() * size, rand() * size, 0.5 + rand() * 1.2, 0.4 + rand() * 1.0);
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
        const p0 = center[Math.max(0, i - 2)], p1 = center[Math.min(center.length - 1, i + 2)];
        const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1;
        return { tx: dx / d, ty: dy / d };
      };

      // Soft longitudinal road wear.
      for (let i = 3; i < center.length - 3; i += 2) {
        const p = center[i];
        const { tx, ty } = tangentAt(i);
        const nx = -ty, ny = tx;
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        const strokes = 3 + Math.floor(rand() * 4);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.22, 76);
          const along = (rand() - 0.5) * 22;
          const x = p.x + nx * laneBias + tx * along, y = p.y + ny * laneBias + ty * along;
          const l = 20 + rand() * 48, dark = rand() > 0.22;
          roadWear.lineStyle(1.4 + rand() * 2.8, dark ? 0x181513 : 0x74695d, dark ? 0.010 + rand() * 0.017 : 0.005 + rand() * 0.009);
          roadWear.beginPath(); roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5); roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5); roadWear.strokePath();
        }
      }

      // EXACT edge anchoring. We never connect edge points, so tight hairpins cannot spike.
      if (left.length === center.length && right.length === center.length) {
        const paintEdgeSoil = (edgePts) => {
          for (let i = 2; i < center.length - 2; i += 2) {
            const c = center[i], e = edgePts[i];
            if (!c || !e) continue;
            const { tx, ty } = tangentAt(i);
            let ox = e.x - c.x, oy = e.y - c.y;
            const od = Math.hypot(ox, oy) || 1; ox /= od; oy /= od;

            // Dark compacted soil hugs the exact asphalt edge.
            for (let s = 0; s < 18; s++) {
              const along = (rand() - 0.5) * 22;
              const out = 0.8 + rand() * 10;
              const x = e.x + tx * along + ox * out, y = e.y + ty * along + oy * out;
              const pick = rand();
              const color = pick > 0.72 ? 0x765f45 : pick > 0.34 ? 0x5a4735 : 0x43372c;
              shoulder.fillStyle(color, 0.18 + rand() * 0.24);
              shoulder.fillCircle(x, y, 1.3 + rand() * 3.0);
            }

            // Lighter dusty fade into the grass.
            for (let s = 0; s < 8; s++) {
              const along = (rand() - 0.5) * 25;
              const out = 9 + rand() * 19;
              const x = e.x + tx * along + ox * out, y = e.y + ty * along + oy * out;
              shoulder.fillStyle(rand() > 0.5 ? 0x947b50 : 0x68543c, 0.09 + rand() * 0.15);
              shoulder.fillCircle(x, y, 0.7 + rand() * 1.8);
            }
          }
        };
        paintEdgeSoil(left);
        paintEdgeSoil(right);
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
