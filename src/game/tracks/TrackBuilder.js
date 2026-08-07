// src/game/tracks/TrackBuilder.js
// TrackBuilder: centerline -> robust swept ribbon with adaptive sampling + culling by cells

function ptX(p) {
  if (Array.isArray(p)) return Number(p[0]) || 0;
  return Number(p?.x) || 0;
}
function ptY(p) {
  if (Array.isArray(p)) return Number(p[1]) || 0;
  return Number(p?.y) || 0;
}
function ptWidth(p, fallbackWidth = 80) {
  if (Array.isArray(p)) return fallbackWidth;
  const w = Number(p?.width);
  return Number.isFinite(w) ? w : fallbackWidth;
}
function makePt(x, y, width) { return { x, y, width }; }
function dist(a, b) {
  const dx = ptX(a) - ptX(b), dy = ptY(a) - ptY(b);
  return Math.hypot(dx, dy);
}
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Catmull-Rom centripetal: low overshoot and stable through uneven control-point spacing.
function catmullRom(p0, p1, p2, p3, t, fallbackWidth = 80) {
  const alpha = 0.5;
  const eps = 1e-6;
  const x0 = ptX(p0), y0 = ptY(p0);
  const x1 = ptX(p1), y1 = ptY(p1);
  const x2 = ptX(p2), y2 = ptY(p2);
  const x3 = ptX(p3), y3 = ptY(p3);
  const d01 = Math.hypot(x1 - x0, y1 - y0);
  const d12 = Math.hypot(x2 - x1, y2 - y1);
  const d23 = Math.hypot(x3 - x2, y3 - y2);
  const t0 = 0;
  const t1 = t0 + Math.pow(Math.max(d01, eps), alpha);
  const t2 = t1 + Math.pow(Math.max(d12, eps), alpha);
  const t3 = t2 + Math.pow(Math.max(d23, eps), alpha);
  const tt = t1 + (t2 - t1) * t;

  const lerp = (ax, ay, bx, by, ta, tb) => {
    const w = (tt - ta) / ((tb - ta) || eps);
    return [ax + (bx - ax) * w, ay + (by - ay) * w];
  };
  const A1 = lerp(x0, y0, x1, y1, t0, t1);
  const A2 = lerp(x1, y1, x2, y2, t1, t2);
  const A3 = lerp(x2, y2, x3, y3, t2, t3);
  const wB1 = (tt - t0) / ((t2 - t0) || eps);
  const wB2 = (tt - t1) / ((t3 - t1) || eps);
  const B1 = [A1[0] + (A2[0] - A1[0]) * wB1, A1[1] + (A2[1] - A1[1]) * wB1];
  const B2 = [A2[0] + (A3[0] - A2[0]) * wB2, A2[1] + (A3[1] - A2[1]) * wB2];
  const wC = (tt - t1) / ((t2 - t1) || eps);
  const x = B1[0] + (B2[0] - B1[0]) * wC;
  const y = B1[1] + (B2[1] - B1[1]) * wC;
  const w1 = ptWidth(p1, fallbackWidth), w2 = ptWidth(p2, fallbackWidth);
  return makePt(x, y, w1 + (w2 - w1) * t);
}

function resample(points, stepPx, fallbackWidth = 80) {
  const out = [];
  if (points.length < 2) return out;
  out.push(makePt(ptX(points[0]), ptY(points[0]), ptWidth(points[0], fallbackWidth)));
  let acc = 0;
  let prev = makePt(ptX(points[0]), ptY(points[0]), ptWidth(points[0], fallbackWidth));
  for (let i = 1; i < points.length; i++) {
    const cur = makePt(ptX(points[i]), ptY(points[i]), ptWidth(points[i], fallbackWidth));
    let segLen = dist(prev, cur);
    if (segLen < 1e-6) continue;
    while (acc + segLen >= stepPx) {
      const t = (stepPx - acc) / segLen;
      const inserted = makePt(
        prev.x + (cur.x - prev.x) * t,
        prev.y + (cur.y - prev.y) * t,
        prev.width + (cur.width - prev.width) * t
      );
      out.push(inserted);
      prev = inserted;
      segLen = dist(prev, cur);
      acc = 0;
    }
    acc += segLen;
    prev = cur;
  }
  return out;
}

function adaptiveResample(points, baseStep, fallbackWidth = 80) {
  const fineStep = Math.max(4, Math.min(6, baseStep * 0.45));
  const fine = resample(points, fineStep, fallbackWidth);
  const n = fine.length;
  if (n < 12) return fine;
  const out = [];
  const straightStride = Math.max(2, Math.round(baseStep / fineStep));
  for (let i = 0; i < n; i++) {
    const p0 = fine[(i - 2 + n) % n], p = fine[i], p1 = fine[(i + 2) % n];
    const a0 = Math.atan2(p.y - p0.y, p.x - p0.x);
    const a1 = Math.atan2(p1.y - p.y, p1.x - p.x);
    const turn = Math.abs(wrapPi(a1 - a0));
    let stride = straightStride;
    if (turn > 0.13) stride = 1;
    else if (turn > 0.045) stride = Math.min(2, straightStride);
    if (i === 0 || i === n - 1 || (i % stride) === 0) out.push(makePt(p.x, p.y, p.width));
  }
  return out;
}

function boundsOfPoly(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
function cellKey(cx, cy) { return `${cx},${cy}`; }

export function buildTrackRibbon({ centerline, trackWidth, grassMargin = 0, sampleStepPx = 12, cellSize = 400 }) {
  const fallbackWidth = Number(trackWidth) || 80;
  const src = (centerline || []).map((p) => {
    if (Array.isArray(p) && p.length >= 2) return makePt(Number(p[0]), Number(p[1]), fallbackWidth);
    if (p && typeof p.x === 'number' && typeof p.y === 'number') {
      return makePt(Number(p.x), Number(p.y), Number.isFinite(Number(p.width)) ? Number(p.width) : fallbackWidth);
    }
    return makePt(NaN, NaN, fallbackWidth);
  });

  const dense = [];
  const n = src.length;
  if (n < 2) return { center: [], left: [], right: [], cells: new Map(), cellSize };
  const get = (idx) => src[(idx + n) % n];
  const SUB = 14;
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < SUB; s++) dense.push(catmullRom(p0, p1, p2, p3, s / SUB, fallbackWidth));
  }
  dense.push(makePt(dense[0].x, dense[0].y, dense[0].width));

  const cl = adaptiveResample(dense, sampleStepPx, fallbackWidth);
  if (cl.length > 8 && dist(cl[0], cl[cl.length - 1]) < Math.max(2, sampleStepPx * 0.55)) cl.pop();
  if (cl.length < 8) return { center: cl, left: [], right: [], cells: new Map(), cellSize };

  const count = cl.length;
  const margin = Math.max(0, grassMargin);
  const left = [], right = [], grassLeft = [], grassRight = [];

  // Decorative/diagnostic edges only. The actual road mask below does NOT depend on joining
  // these offset curves, so even if an extreme inner parallel curve wants to self-intersect,
  // it cannot punch a hole or create an island in the asphalt.
  for (let i = 0; i < count; i++) {
    const p = cl[i];
    const prev = cl[(i - 1 + count) % count], next = cl[(i + 1) % count];
    let tx = next.x - prev.x, ty = next.y - prev.y;
    const td = Math.hypot(tx, ty) || 1;
    tx /= td; ty /= td;
    const nx = -ty, ny = tx;
    const half = (Number.isFinite(Number(p.width)) ? Number(p.width) : fallbackWidth) * 0.5;
    left.push([p.x + nx * half, p.y + ny * half]);
    right.push([p.x - nx * half, p.y - ny * half]);
    grassLeft.push([p.x + nx * (half + margin), p.y + ny * (half + margin)]);
    grassRight.push([p.x - nx * (half + margin), p.y - ny * (half + margin)]);
  }

  const cells = new Map();
  const grassCells = new Map();
  const addPolyToCells = (map, poly) => {
    const b = boundsOfPoly(poly);
    const cx0 = Math.floor(b.minX / cellSize), cy0 = Math.floor(b.minY / cellSize);
    const cx1 = Math.floor(b.maxX / cellSize), cy1 = Math.floor(b.maxY / cellSize);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = cellKey(cx, cy);
        if (!map.has(key)) map.set(key, { polys: [] });
        map.get(key).polys.push(poly);
      }
    }
  };

  // Robust swept mask: each centerline segment is a short oriented strip, and each sample gets
  // a small round join. Their UNION is the road. There is no single inner offset polygon that can
  // fold back on itself in a hairpin, so sharp vertices cannot create wedges, holes or islands.
  const addSwept = (map, extra) => {
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const a = cl[i], b = cl[j];
      let tx = b.x - a.x, ty = b.y - a.y;
      const len = Math.hypot(tx, ty);
      if (len < 1e-4) continue;
      tx /= len; ty /= len;
      const nx = -ty, ny = tx;
      const ra = (Number.isFinite(Number(a.width)) ? Number(a.width) : fallbackWidth) * 0.5 + extra;
      const rb = (Number.isFinite(Number(b.width)) ? Number(b.width) : fallbackWidth) * 0.5 + extra;
      addPolyToCells(map, [
        { x: a.x + nx * ra, y: a.y + ny * ra },
        { x: a.x - nx * ra, y: a.y - ny * ra },
        { x: b.x - nx * rb, y: b.y - ny * rb },
        { x: b.x + nx * rb, y: b.y + ny * rb }
      ]);
    }

    // 10-sided join is enough at this scale and far cheaper than a true circle.
    const SIDES = 10;
    for (let i = 0; i < count; i++) {
      const p = cl[i];
      const r = (Number.isFinite(Number(p.width)) ? Number(p.width) : fallbackWidth) * 0.5 + extra;
      const poly = [];
      for (let s = 0; s < SIDES; s++) {
        const a = (s / SIDES) * Math.PI * 2;
        poly.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
      }
      addPolyToCells(map, poly);
    }
  };

  addSwept(cells, 0);
  addSwept(grassCells, margin);

  return {
    center: cl,
    left,
    right,
    cells,
    cellSize,
    grass: { margin, left: grassLeft, right: grassRight, cells: grassCells }
  };
}
