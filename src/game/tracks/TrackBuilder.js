// src/game/tracks/TrackBuilder.js
// TrackBuilder: dense smooth visual edges + lightweight collision ribbon.

function ptX(p) { return Array.isArray(p) ? (Number(p[0]) || 0) : (Number(p?.x) || 0); }
function ptY(p) { return Array.isArray(p) ? (Number(p[1]) || 0) : (Number(p?.y) || 0); }
function ptWidth(p, fallbackWidth = 80) {
  if (Array.isArray(p)) return fallbackWidth;
  const w = Number(p?.width);
  return Number.isFinite(w) ? w : fallbackWidth;
}
function makePt(x, y, width) { return { x, y, width }; }
function dist(a, b) { return Math.hypot(ptX(a) - ptX(b), ptY(a) - ptY(b)); }
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function catmullRom(p0, p1, p2, p3, t, fallbackWidth = 80) {
  const alpha = 0.5, eps = 1e-6;
  const x0 = ptX(p0), y0 = ptY(p0), x1 = ptX(p1), y1 = ptY(p1);
  const x2 = ptX(p2), y2 = ptY(p2), x3 = ptX(p3), y3 = ptY(p3);
  const d01 = Math.hypot(x1 - x0, y1 - y0), d12 = Math.hypot(x2 - x1, y2 - y1), d23 = Math.hypot(x3 - x2, y3 - y2);
  const t0 = 0, t1 = Math.pow(Math.max(d01, eps), alpha), t2 = t1 + Math.pow(Math.max(d12, eps), alpha), t3 = t2 + Math.pow(Math.max(d23, eps), alpha);
  const tt = t1 + (t2 - t1) * t;
  const lerp = (ax, ay, bx, by, ta, tb) => {
    const w = (tt - ta) / ((tb - ta) || eps);
    return [ax + (bx - ax) * w, ay + (by - ay) * w];
  };
  const A1 = lerp(x0, y0, x1, y1, t0, t1), A2 = lerp(x1, y1, x2, y2, t1, t2), A3 = lerp(x2, y2, x3, y3, t2, t3);
  const wB1 = (tt - t0) / ((t2 - t0) || eps), wB2 = (tt - t1) / ((t3 - t1) || eps);
  const B1 = [A1[0] + (A2[0] - A1[0]) * wB1, A1[1] + (A2[1] - A1[1]) * wB1];
  const B2 = [A2[0] + (A3[0] - A2[0]) * wB2, A2[1] + (A3[1] - A2[1]) * wB2];
  const wC = (tt - t1) / ((t2 - t1) || eps);
  const w1 = ptWidth(p1, fallbackWidth), w2 = ptWidth(p2, fallbackWidth);
  return makePt(B1[0] + (B2[0] - B1[0]) * wC, B1[1] + (B2[1] - B1[1]) * wC, w1 + (w2 - w1) * t);
}

function resample(points, stepPx, fallbackWidth = 80) {
  const out = [];
  if (points.length < 2) return out;
  out.push(makePt(ptX(points[0]), ptY(points[0]), ptWidth(points[0], fallbackWidth)));
  let acc = 0, prev = makePt(ptX(points[0]), ptY(points[0]), ptWidth(points[0], fallbackWidth));
  for (let i = 1; i < points.length; i++) {
    const cur = makePt(ptX(points[i]), ptY(points[i]), ptWidth(points[i], fallbackWidth));
    let segLen = dist(prev, cur);
    if (segLen < 1e-6) continue;
    while (acc + segLen >= stepPx) {
      const t = (stepPx - acc) / segLen;
      const inserted = makePt(prev.x + (cur.x - prev.x) * t, prev.y + (cur.y - prev.y) * t, prev.width + (cur.width - prev.width) * t);
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
  const fine = resample(points, fineStep, fallbackWidth), n = fine.length;
  if (n < 12) return fine;
  const out = [], straightStride = Math.max(2, Math.round(baseStep / fineStep));
  for (let i = 0; i < n; i++) {
    const p0 = fine[(i - 2 + n) % n], p = fine[i], p1 = fine[(i + 2) % n];
    const turn = Math.abs(wrapPi(Math.atan2(p1.y - p.y, p1.x - p.x) - Math.atan2(p.y - p0.y, p.x - p0.x)));
    let stride = straightStride;
    if (turn > 0.13) stride = 1;
    else if (turn > 0.045) stride = Math.min(2, straightStride);
    if (i === 0 || i === n - 1 || i % stride === 0) out.push(makePt(p.x, p.y, p.width));
  }
  return out;
}

function boundsOfPoly(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { minX, minY, maxX, maxY };
}
function cellKey(cx, cy) { return `${cx},${cy}`; }

export function buildTrackRibbon({ centerline, trackWidth, grassMargin = 0, sampleStepPx = 12, cellSize = 400 }) {
  const fallbackWidth = Number(trackWidth) || 80;
  const src = (centerline || []).map((p) => Array.isArray(p)
    ? makePt(Number(p[0]), Number(p[1]), fallbackWidth)
    : makePt(Number(p?.x), Number(p?.y), Number.isFinite(Number(p?.width)) ? Number(p.width) : fallbackWidth));
  const n = src.length;
  if (n < 2) return { center: [], left: [], right: [], cells: new Map(), cellSize };

  const dense = [], get = (idx) => src[(idx + n) % n], SUB = 14;
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < SUB; s++) dense.push(catmullRom(p0, p1, p2, p3, s / SUB, fallbackWidth));
  }
  dense.push(makePt(dense[0].x, dense[0].y, dense[0].width));
  const cl = adaptiveResample(dense, sampleStepPx, fallbackWidth);
  if (cl.length > 8 && dist(cl[0], cl[cl.length - 1]) < Math.max(2, sampleStepPx * 0.55)) cl.pop();
  if (cl.length < 8) return { center: cl, left: [], right: [], cells: new Map(), cellSize };

  const count = cl.length, margin = Math.max(0, grassMargin);
  const left = [], right = [], grassLeft = [], grassRight = [];
  for (let i = 0; i < count; i++) {
    const p = cl[i], prev = cl[(i - 1 + count) % count], next = cl[(i + 1) % count];
    let tx = next.x - prev.x, ty = next.y - prev.y;
    const td = Math.hypot(tx, ty) || 1; tx /= td; ty /= td;
    const nx = -ty, ny = tx, half = ptWidth(p, fallbackWidth) * 0.5;
    left.push([p.x + nx * half, p.y + ny * half]);
    right.push([p.x - nx * half, p.y - ny * half]);
    grassLeft.push([p.x + nx * (half + margin), p.y + ny * (half + margin)]);
    grassRight.push([p.x - nx * (half + margin), p.y - ny * (half + margin)]);
  }

  const cells = new Map(), grassCells = new Map();
  const addPolyToCells = (map, poly) => {
    const b = boundsOfPoly(poly);
    for (let cy = Math.floor(b.minY / cellSize); cy <= Math.floor(b.maxY / cellSize); cy++) {
      for (let cx = Math.floor(b.minX / cellSize); cx <= Math.floor(b.maxX / cellSize); cx++) {
        const key = cellKey(cx, cy);
        if (!map.has(key)) map.set(key, { polys: [] });
        map.get(key).polys.push(poly);
      }
    }
  };

  // IMPORTANT: collision/surface queries stay as one quad per centerline segment.
  // The previous swept-capsule version added a 10-sided polygon at EVERY dense sample to the
  // spatial grid. That multiplied the per-frame point-in-polygon workload and caused progressive
  // mobile Safari stalls as the car entered cells containing many overlapping joins.
  // Visual asphalt is rendered independently from the dense centerline, so robust appearance is kept.
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const l0 = left[i], r0 = right[i], l1 = left[j], r1 = right[j];
    addPolyToCells(cells, [
      { x: l0[0], y: l0[1] }, { x: r0[0], y: r0[1] }, { x: r1[0], y: r1[1] }, { x: l1[0], y: l1[1] }
    ]);
    const gl0 = grassLeft[i], gr0 = grassRight[i], gl1 = grassLeft[j], gr1 = grassRight[j];
    addPolyToCells(grassCells, [
      { x: gl0[0], y: gl0[1] }, { x: gr0[0], y: gr0[1] }, { x: gr1[0], y: gr1[1] }, { x: gl1[0], y: gl1[1] }
    ]);
  }

  return { center: cl, left, right, cells, cellSize, grass: { margin, left: grassLeft, right: grassRight, cells: grassCells } };
}
