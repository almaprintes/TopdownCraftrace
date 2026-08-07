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

      const left = new Array(count), right = new Array(count);
      for (let i = 0; i < count; i++) {
        const p = center[i], { tx, ty } = tangentAt(i), nx = -ty, ny = tx;
        const half = Number(p.width || defaultTrackW) * 0.5;
        left[i] = { x: p.x + nx * half, y: p.y + ny * half };
        right[i] = { x: p.x - nx * half, y: p.y - ny * half };
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

      // CURBS v4: treat every kerb as ONE corner object, not as unrelated local samples.
      // This fixes the mixed results of curvature-driven width: each sustained bend now has a clean
      // turn-in -> apex -> exit profile, while folded/reversing offset segments are rejected entirely.
      const blockLen = 18;
      const maxCurbWidth = 11.5;
      const enterThreshold = 0.055;
      const peakThreshold = 0.105;
      const turns = new Array(count);
      for (let i = 0; i < count; i++) turns[i] = turnAt(i);

      const sameSign = (a, b) => Math.sign(a) !== 0 && Math.sign(a) === Math.sign(b);
      const groups = [];
      let start = -1;
      for (let i = 0; i < count; i++) {
        const active = Math.abs(turns[i]) >= enterThreshold;
        if (active && start < 0) start = i;
        const nextActive = i + 1 < count && Math.abs(turns[i + 1]) >= enterThreshold && sameSign(turns[i], turns[i + 1]);
        if (start >= 0 && (!active || !nextActive || i === count - 1)) {
          const end = active ? i : i - 1;
          if (end >= start) groups.push({ start, end, sign: Math.sign(turns[Math.floor((start + end) * 0.5)]) || Math.sign(turns[start]) });
          start = -1;
        }
      }

      // Merge the first/last group if the same physical bend crosses the lap seam.
      if (groups.length > 1) {
        const first = groups[0], last = groups[groups.length - 1];
        if (first.start === 0 && last.end === count - 1 && first.sign === last.sign) {
          groups[0] = { start: last.start, end: first.end + count, sign: first.sign };
          groups.pop();
        }
      }

      const idx = (i) => (i + count) % count;
      const edgeAlignmentOK = (edge, i) => {
        const j = idx(i + 1);
        const ex = edge[j].x - edge[idx(i)].x, ey = edge[j].y - edge[idx(i)].y;
        const cx = center[j].x - center[idx(i)].x, cy = center[j].y - center[idx(i)].y;
        const ed = Math.hypot(ex, ey) || 1, cd = Math.hypot(cx, cy) || 1;
        return (ex * cx + ey * cy) / (ed * cd) > 0.35;
      };
      const lerpPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      const fillQuad = (a, b, c, d, color) => {
        curbs.fillStyle(color, 0.98);
        curbs.beginPath();
        curbs.moveTo(a.x, a.y); curbs.lineTo(b.x, b.y); curbs.lineTo(c.x, c.y); curbs.lineTo(d.x, d.y); curbs.closePath(); curbs.fillPath();
      };

      for (const group of groups) {
        let peak = 0, arc = 0;
        for (let ii = group.start; ii <= group.end; ii++) {
          peak = Math.max(peak, Math.abs(turns[idx(ii)]));
          const a = center[idx(ii)], b = center[idx(ii + 1)];
          arc += Math.hypot(b.x - a.x, b.y - a.y);
        }
        if (peak < peakThreshold || arc < 42) continue;

        const edge = group.sign > 0 ? left : right;
        let travelled = 0;
        let phaseDistance = 0;
        for (let ii = group.start; ii <= group.end; ii++) {
          const i = idx(ii), j = idx(ii + 1);
          const c0 = center[i], c1 = center[j];
          const centerSegLen = Math.hypot(c1.x - c0.x, c1.y - c0.y);
          const u0 = arc > 0 ? travelled / arc : 0;
          const u1 = arc > 0 ? (travelled + centerSegLen) / arc : 1;
          travelled += centerSegLen;

          // Bell-shaped profile determined by position in the whole corner, not noisy local curvature.
          const bell = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.max(0, Math.min(1, u)))), 0.78);
          const w0 = maxCurbWidth * bell(u0);
          const w1 = maxCurbWidth * bell(u1);
          if (Math.max(w0, w1) < 0.8) continue;

          const e0 = edge[i], e1 = edge[j];
          if (!edgeAlignmentOK(edge, i)) continue;
          if (isBuriedByOtherRoad(e0, i) || isBuriedByOtherRoad(e1, j)) continue;

          const p0 = center[i], p1 = center[j];
          const d0 = Math.hypot(e0.x - p0.x, e0.y - p0.y) || 1;
          const d1 = Math.hypot(e1.x - p1.x, e1.y - p1.y) || 1;
          const o0 = { x: e0.x + (e0.x - p0.x) / d0 * w0, y: e0.y + (e0.y - p0.y) / d0 * w0 };
          const o1 = { x: e1.x + (e1.x - p1.x) / d1 * w1, y: e1.y + (e1.y - p1.y) / d1 * w1 };
          if (isBuriedByOtherRoad(o0, i) || isBuriedByOtherRoad(o1, j)) continue;

          const segLen = Math.hypot(e1.x - e0.x, e1.y - e0.y);
          if (segLen < 0.5) continue;
          let used = 0;
          while (used < segLen - 0.01) {
            const nextBoundary = (Math.floor((phaseDistance + used) / blockLen) + 1) * blockLen;
            const piece = Math.min(segLen - used, nextBoundary - (phaseDistance + used));
            const t0 = used / segLen, t1 = (used + piece) / segLen;
            const a = lerpPt(e0, e1, t0), b = lerpPt(e0, e1, t1);
            const d = lerpPt(o0, o1, t0), c = lerpPt(o0, o1, t1);
            const blockIndex = Math.floor((phaseDistance + used + 0.001) / blockLen);
            fillQuad(a, b, c, d, blockIndex % 2 === 0 ? 0xc43b33 : 0xeee9df);
            used += piece;
          }
          phaseDistance += segLen;
        }
      }
    } catch (err) {
      console.warn('[TDR2] Mobile-safe premium surface pass failed', err);
    }
  }
}
