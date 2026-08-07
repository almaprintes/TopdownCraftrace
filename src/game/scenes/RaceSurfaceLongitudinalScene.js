import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Mobile-safe premium surface pass.
// Matte materials + robust shoulder/edge geometry + curbs built from clipped edge strips.
export class RaceScene extends MaterialRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    if (this.textures.exists(key)) this.textures.remove(key);
    const size = 768;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x5a91e3c7) || Math.random;
    ctx.fillStyle = '#30452c'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 42; i++) {
      const x = rand() * size, y = rand() * size, r = 45 + rand() * 120;
      const pick = rand();
      const c = pick > 0.84 ? '112,91,53' : pick > 0.52 ? '35,69,33' : pick > 0.24 ? '69,94,49' : '23,48,24';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.018 + rand() * 0.028})`); grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 18000; i++) {
      const x = rand() * size, y = rand() * size, dry = rand() > 0.93;
      ctx.strokeStyle = dry ? `rgba(151,126,72,${0.025 + rand() * 0.042})` : (rand() > 0.5 ? `rgba(100,132,73,${0.026 + rand() * 0.045})` : `rgba(13,43,18,${0.028 + rand() * 0.048})`);
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
    ctx.fillStyle = '#393532'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 34; i++) {
      const x = rand() * size, y = rand() * size, r = 85 + rand() * 185;
      const c = rand() > 0.58 ? '83,70,58' : '18,17,16';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.009 + rand() * 0.014})`); grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 5200; i++) {
      const light = rand() > 0.79;
      ctx.fillStyle = light ? `rgba(166,157,146,${0.004 + rand() * 0.009})` : `rgba(0,0,0,${0.005 + rand() * 0.011})`;
      const s = 0.22 + rand() * 0.34; ctx.fillRect(rand() * size, rand() * size, s, s);
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
      if (center.length < 12) return;

      const rand = this._rng?.(0x2d934b71) || Math.random;
      const roadWear = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      const shoulder = this.add.graphics().setDepth(9.80).setScrollFactor(1);
      const edgeLine = this.add.graphics().setDepth(11.34).setScrollFactor(1);
      const curbs = this.add.graphics().setDepth(11.30).setScrollFactor(1);
      this.uiCam?.ignore?.([roadWear, shoulder, edgeLine, curbs]);
      this._longitudinalAsphaltWear = roadWear;
      this._premiumShoulder = shoulder;
      this._edgeProbe = edgeLine;
      this._cornerCurbs = curbs;

      const count = center.length;
      const tangentAt = (i) => {
        const p0 = center[(i - 2 + count) % count], p1 = center[(i + 2) % count];
        const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1;
        return { tx: dx / d, ty: dy / d };
      };
      const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      const turnAt = (i) => {
        const a = center[(i - 5 + count) % count], b = center[i], c = center[(i + 5) % count];
        return normAngle(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x));
      };

      for (let i = 5; i < count - 5; i += 10) {
        const p = center[i], { tx, ty } = tangentAt(i), nx = -ty, ny = tx;
        const half = Math.max(90, Math.min(250, Number(p.width || defaultTrackW))) * 0.5;
        for (let k = 0; k < 2; k++) {
          const laneBias = (k ? 1 : -1) * Math.min(half * 0.18, 15) + (rand() - 0.5) * 6;
          const x = p.x + nx * laneBias, y = p.y + ny * laneBias, l = 18 + rand() * 26;
          roadWear.lineStyle(1.1 + rand() * 1.2, 0x151311, 0.009 + rand() * 0.008);
          roadWear.beginPath(); roadWear.moveTo(x - tx * l * 0.5, y - ty * l * 0.5); roadWear.lineTo(x + tx * l * 0.5, y + ty * l * 0.5); roadWear.strokePath();
        }
      }

      const drawCenterStroke = (g, width, color, alpha) => {
        g.lineStyle(width, color, alpha); g.beginPath(); g.moveTo(center[0].x, center[0].y);
        for (let i = 1; i < count; i++) g.lineTo(center[i].x, center[i].y);
        g.lineTo(center[0].x, center[0].y); g.strokePath();
      };
      drawCenterStroke(shoulder, defaultTrackW + 18, 0x67513a, 0.14);

      const left = new Array(count), right = new Array(count), leftOuter = new Array(count), rightOuter = new Array(count);
      const curbWidth = 10;
      for (let i = 0; i < count; i++) {
        const p = center[i], { tx, ty } = tangentAt(i), nx = -ty, ny = tx;
        const half = Number(p.width || defaultTrackW) * 0.5;
        left[i] = { x: p.x + nx * half, y: p.y + ny * half };
        right[i] = { x: p.x - nx * half, y: p.y - ny * half };
        leftOuter[i] = { x: p.x + nx * (half + curbWidth), y: p.y + ny * (half + curbWidth) };
        rightOuter[i] = { x: p.x - nx * (half + curbWidth), y: p.y - ny * (half + curbWidth) };
      }

      const circularIndexDistance = (a, b) => Math.min(Math.abs(a - b), count - Math.abs(a - b));
      const pointToSegmentDistance = (q, a, b) => {
        const vx = b.x - a.x, vy = b.y - a.y, wx = q.x - a.x, wy = q.y - a.y;
        const vv = vx * vx + vy * vy;
        let t = vv > 1e-8 ? (wx * vx + wy * vy) / vv : 0; t = Math.max(0, Math.min(1, t));
        const px = a.x + vx * t, py = a.y + vy * t;
        return { d: Math.hypot(q.x - px, q.y - py), t };
      };
      const isBuriedByOtherRoad = (q, ownIndex) => {
        for (let j = 0; j < count; j++) {
          if (circularIndexDistance(j, ownIndex) <= 5 || circularIndexDistance((j + 1) % count, ownIndex) <= 5) continue;
          const a = center[j], b = center[(j + 1) % count], hit = pointToSegmentDistance(q, a, b);
          const radius = Number(a.width || defaultTrackW) * 0.5 + (Number(b.width || defaultTrackW) - Number(a.width || defaultTrackW)) * 0.5 * hit.t;
          if (hit.d < radius - 1.25) return true;
        }
        return false;
      };
      const boundaryPoint = (a, b, ownIndexA, ownIndexB, aVisible) => {
        let lo = 0, hi = 1;
        for (let it = 0; it < 8; it++) {
          const t = (lo + hi) * 0.5;
          const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          const visible = !isBuriedByOtherRoad(q, t < 0.5 ? ownIndexA : ownIndexB);
          if (visible === aVisible) lo = t; else hi = t;
        }
        const t = (lo + hi) * 0.5;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      };

      const drawTrimmedEdge = (pts) => {
        edgeLine.lineStyle(2.6, 0xf3efe5, 0.98);
        let drawing = false;
        for (let i = 0; i < count; i++) {
          const j = (i + 1) % count, a = pts[i], b = pts[j];
          const aVisible = !isBuriedByOtherRoad(a, i), bVisible = !isBuriedByOtherRoad(b, j);
          if (aVisible && bVisible) {
            if (!drawing) { edgeLine.beginPath(); edgeLine.moveTo(a.x, a.y); drawing = true; }
            edgeLine.lineTo(b.x, b.y);
          } else if (aVisible !== bVisible) {
            const cut = boundaryPoint(a, b, i, j, aVisible);
            if (aVisible) {
              if (!drawing) { edgeLine.beginPath(); edgeLine.moveTo(a.x, a.y); drawing = true; }
              edgeLine.lineTo(cut.x, cut.y); edgeLine.strokePath(); drawing = false;
            } else {
              if (drawing) { edgeLine.strokePath(); drawing = false; }
              edgeLine.beginPath(); edgeLine.moveTo(cut.x, cut.y); edgeLine.lineTo(b.x, b.y); drawing = true;
            }
          } else if (drawing) { edgeLine.strokePath(); drawing = false; }
        }
        if (drawing) edgeLine.strokePath();
      };
      drawTrimmedEdge(left);
      drawTrimmedEdge(right);

      // CURBS v2:
      // - only the INSIDE of sustained corners for now;
      // - real strips OUTSIDE the white line, never a thick coloured stroke centered on it;
      // - red/white phase comes from travelled arc length, not node count, so block size is stable;
      // - every quad is rejected if its edge is buried by another road section.
      const blockLen = 18;
      const curbThreshold = 0.105;
      const cumulative = new Array(count + 1).fill(0);
      for (let i = 0; i < count; i++) {
        const j = (i + 1) % count;
        cumulative[i + 1] = cumulative[i] + Math.hypot(center[j].x - center[i].x, center[j].y - center[i].y);
      }

      const lerpPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      const fillQuad = (a, b, c, d, color) => {
        curbs.fillStyle(color, 0.98);
        curbs.beginPath();
        curbs.moveTo(a.x, a.y); curbs.lineTo(b.x, b.y); curbs.lineTo(c.x, c.y); curbs.lineTo(d.x, d.y); curbs.closePath(); curbs.fillPath();
      };

      for (let i = 0; i < count; i++) {
        const j = (i + 1) % count;
        const turn = turnAt(i);
        if (Math.abs(turn) < curbThreshold) continue;

        const edge = turn > 0 ? left : right;
        const outer = turn > 0 ? leftOuter : rightOuter;
        if (isBuriedByOtherRoad(edge[i], i) || isBuriedByOtherRoad(edge[j], j)) continue;

        const segLen = Math.hypot(edge[j].x - edge[i].x, edge[j].y - edge[i].y);
        if (segLen < 0.5) continue;
        let used = 0;
        while (used < segLen - 0.01) {
          const absStart = cumulative[i] + used;
          const nextBoundary = (Math.floor(absStart / blockLen) + 1) * blockLen;
          const piece = Math.min(segLen - used, nextBoundary - absStart);
          const t0 = used / segLen;
          const t1 = (used + piece) / segLen;
          const e0 = lerpPt(edge[i], edge[j], t0), e1 = lerpPt(edge[i], edge[j], t1);
          const o0 = lerpPt(outer[i], outer[j], t0), o1 = lerpPt(outer[i], outer[j], t1);
          const blockIndex = Math.floor((absStart + 0.001) / blockLen);
          fillQuad(e0, e1, o1, o0, blockIndex % 2 === 0 ? 0xc43b33 : 0xeee9df);
          used += piece;
        }
      }
    } catch (err) {
      console.warn('[TDR2] Mobile-safe premium surface pass failed', err);
    }
  }
}
