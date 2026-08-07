import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Mobile-safe premium surface pass.
// Matte materials + sparse longitudinal wear + robust shoulder underlay + trimmed true edge line.
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
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
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
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
      if (center.length < 12) return;

      const rand = this._rng?.(0x2d934b71) || Math.random;
      const roadWear = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      const shoulder = this.add.graphics().setDepth(9.80).setScrollFactor(1);
      const edgeLine = this.add.graphics().setDepth(11.34).setScrollFactor(1);

      this.uiCam?.ignore?.([roadWear, shoulder, edgeLine]);
      this._longitudinalAsphaltWear = roadWear;
      this._premiumShoulder = shoulder;
      this._edgeProbe = edgeLine;

      const count = center.length;
      const tangentAt = (i) => {
        const p0 = center[(i - 2 + count) % count];
        const p1 = center[(i + 2) % count];
        const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1;
        return { tx: dx / d, ty: dy / d };
      };

      for (let i = 5; i < count - 5; i += 10) {
        const p = center[i];
        const { tx, ty } = tangentAt(i);
        const nx = -ty, ny = tx;
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        for (let k = 0; k < 2; k++) {
          const laneBias = (k ? 1 : -1) * Math.min(half * 0.18, 15) + (rand() - 0.5) * 6;
          const x = p.x + nx * laneBias, y = p.y + ny * laneBias;
          const l = 18 + rand() * 26;
          roadWear.lineStyle(1.1 + rand() * 1.2, 0x151311, 0.009 + rand() * 0.008);
          roadWear.beginPath();
          roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
          roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
          roadWear.strokePath();
        }
      }

      // Robust dirt shoulder remains the cheap underlay trick: no self-crossing edge polygon.
      const drawCenterStroke = (g, width, color, alpha) => {
        g.lineStyle(width, color, alpha);
        g.beginPath();
        g.moveTo(center[0].x, center[0].y);
        for (let i = 1; i < count; i++) g.lineTo(center[i].x, center[i].y);
        g.lineTo(center[0].x, center[0].y);
        g.strokePath();
      };
      drawCenterStroke(shoulder, defaultTrackW + 18, 0x67513a, 0.14);

      // TRUE shoulder line:
      // 1) build actual left/right offset candidates from the dense centerline;
      // 2) test each candidate against the swept road union;
      // 3) if that edge point lies inside another non-neighbouring road segment, suppress it.
      // This is effectively "erasing where needed", but automatically and geometrically.
      const left = new Array(count);
      const right = new Array(count);
      for (let i = 0; i < count; i++) {
        const p = center[i];
        const { tx, ty } = tangentAt(i);
        const nx = -ty, ny = tx;
        const half = Number(p.width || defaultTrackW) * 0.5;
        left[i] = { x: p.x + nx * half, y: p.y + ny * half };
        right[i] = { x: p.x - nx * half, y: p.y - ny * half };
      }

      const circularIndexDistance = (a, b) => {
        const d = Math.abs(a - b);
        return Math.min(d, count - d);
      };

      const pointToSegmentDistance = (q, a, b) => {
        const vx = b.x - a.x, vy = b.y - a.y;
        const wx = q.x - a.x, wy = q.y - a.y;
        const vv = vx * vx + vy * vy;
        let t = vv > 1e-8 ? (wx * vx + wy * vy) / vv : 0;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + vx * t, py = a.y + vy * t;
        return { d: Math.hypot(q.x - px, q.y - py), t };
      };

      const isBuriedByOtherRoad = (q, ownIndex) => {
        // Skip nearby segments: touching its own local road is expected.
        // Only non-local road overlap means this candidate is not part of the exterior silhouette.
        for (let j = 0; j < count; j++) {
          if (circularIndexDistance(j, ownIndex) <= 5 || circularIndexDistance((j + 1) % count, ownIndex) <= 5) continue;
          const a = center[j], b = center[(j + 1) % count];
          const hit = pointToSegmentDistance(q, a, b);
          const halfA = Number(a.width || defaultTrackW) * 0.5;
          const halfB = Number(b.width || defaultTrackW) * 0.5;
          const radius = halfA + (halfB - halfA) * hit.t;
          // Small inset avoids deleting legitimate tangent contacts due to floating-point noise.
          if (hit.d < radius - 1.25) return true;
        }
        return false;
      };

      const drawTrimmedEdge = (pts) => {
        edgeLine.lineStyle(2.6, 0xf3efe5, 0.98);
        let drawing = false;
        for (let i = 0; i < count; i++) {
          const j = (i + 1) % count;
          const aVisible = !isBuriedByOtherRoad(pts[i], i);
          const bVisible = !isBuriedByOtherRoad(pts[j], j);

          if (aVisible && bVisible) {
            if (!drawing) {
              edgeLine.beginPath();
              edgeLine.moveTo(pts[i].x, pts[i].y);
              drawing = true;
            }
            edgeLine.lineTo(pts[j].x, pts[j].y);
          } else if (drawing) {
            edgeLine.strokePath();
            drawing = false;
          }
        }
        if (drawing) edgeLine.strokePath();
      };

      drawTrimmedEdge(left);
      drawTrimmedEdge(right);
    } catch (err) {
      console.warn('[TDR2] Mobile-safe premium surface pass failed', err);
    }
  }
}
