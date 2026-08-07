// src/game/tracks/TrackBuilder.js
// TrackBuilder: centerline -> ribbon (polígono) con suavizado + muestreo y culling por celdas

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

function makePt(x, y, width) {
  return { x, y, width };
}

function dist(a, b) {
  const dx = ptX(a) - ptX(b);
  const dy = ptY(a) - ptY(b);
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(x, y) {
  const d = Math.sqrt(x * x + y * y);
  if (d < 1e-6) return [0, 0];
  return [x / d, y / d];
}

// Catmull-Rom centrípeta: evita el overshoot fuerte de la variante uniforme.
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
    const denom = (tb - ta) || eps;
    const w = (tt - ta) / denom;
    return [ax + (bx - ax) * w, ay + (by - ay) * w];
  };

  const A1 = lerp(x0, y0, x1, y1, t0, t1);
  const A2 = lerp(x1, y1, x2, y2, t1, t2);
  const A3 = lerp(x2, y2, x3, y3, t2, t3);

  const B1 = (() => {
    const denom = (t2 - t0) || eps;
    const w = (tt - t0) / denom;
    return [A1[0] + (A2[0] - A1[0]) * w, A1[1] + (A2[1] - A1[1]) * w];
  })();

  const B2 = (() => {
    const denom = (t3 - t1) || eps;
    const w = (tt - t1) / denom;
    return [A2[0] + (A3[0] - A2[0]) * w, A2[1] + (A3[1] - A2[1]) * w];
  })();

  const C = (() => {
    const denom = (t2 - t1) || eps;
    const w = (tt - t1) / denom;
    return [B1[0] + (B2[0] - B1[0]) * w, B1[1] + (B2[1] - B1[1]) * w];
  })();

  const w1 = ptWidth(p1, fallbackWidth);
  const w2 = ptWidth(p2, fallbackWidth);
  return makePt(C[0], C[1], w1 + (w2 - w1) * t);
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

function cellKey(cx, cy) {
  return `${cx},${cy}`;
}

export function buildTrackRibbon({
  centerline,
  trackWidth,
  grassMargin = 0,
  sampleStepPx = 12,
  cellSize = 400
}) {
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
  const SUB = 10;
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < SUB; s++) dense.push(catmullRom(p0, p1, p2, p3, s / SUB, fallbackWidth));
  }
  dense.push(makePt(dense[0].x, dense[0].y, dense[0].width));

  const cl = resample(dense, sampleStepPx, fallbackWidth);

  // Un circuito cerrado NO debe contener dos muestras casi iguales en el cierre.
  // Esa duplicación crea una tangente casi nula y puede girar la normal 180° en la costura.
  if (cl.length > 8 && dist(cl[0], cl[cl.length - 1]) < Math.max(2, sampleStepPx * 0.55)) cl.pop();

  if (cl.length < 8) return { center: cl, left: [], right: [], cells: new Map(), cellSize };

  const baseGrassMargin = Math.max(0, grassMargin);
  const left = [];
  const right = [];
  const grassLeft = [];
  const grassRight = [];
  const count = cl.length;

  // IMPORTANTE: sin miter. El miter anterior podía apuntar hacia el lado equivocado en cambios
  // de curvatura fuertes y generaba exactamente los vértices "retorcidos" visibles en horquillas.
  // La normal se obtiene de una tangente centrada y ancha: siempre perpendicular a la centerline
  // y siempre a distancia constante. No hay handles que puedan darse la vuelta.
  for (let i = 0; i < count; i++) {
    const p = cl[i];
    const pBack = cl[(i - 2 + count) % count];
    const pAhead = cl[(i + 2) % count];

    let tx = pAhead.x - pBack.x;
    let ty = pAhead.y - pBack.y;
    let td = Math.hypot(tx, ty);

    // Fallback local si la ventana amplia cae en una geometría excepcionalmente cerrada.
    if (td < 1e-5) {
      const pPrev = cl[(i - 1 + count) % count];
      const pNext = cl[(i + 1) % count];
      tx = pNext.x - pPrev.x;
      ty = pNext.y - pPrev.y;
      td = Math.hypot(tx, ty) || 1;
    }

    tx /= td;
    ty /= td;
    const nx = -ty;
    const ny = tx;

    const half = (Number.isFinite(Number(p.width)) ? Number(p.width) : fallbackWidth) * 0.5;
    const halfGrass = half + baseGrassMargin;

    left.push([p.x + nx * half, p.y + ny * half]);
    right.push([p.x - nx * half, p.y - ny * half]);
    grassLeft.push([p.x + nx * halfGrass, p.y + ny * halfGrass]);
    grassRight.push([p.x - nx * halfGrass, p.y - ny * halfGrass]);
  }

  const cells = new Map();
  const grassCells = new Map();

  const addPolyToCells = (cellsMap, poly) => {
    const b = boundsOfPoly(poly);
    const cx0 = Math.floor(b.minX / cellSize), cy0 = Math.floor(b.minY / cellSize);
    const cx1 = Math.floor(b.maxX / cellSize), cy1 = Math.floor(b.maxY / cellSize);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = cellKey(cx, cy);
        if (!cellsMap.has(key)) cellsMap.set(key, { polys: [] });
        cellsMap.get(key).polys.push(poly);
      }
    }
  };

  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const l0 = left[i], r0 = right[i], l1 = left[j], r1 = right[j];
    addPolyToCells(cells, [
      { x: l0[0], y: l0[1] }, { x: r0[0], y: r0[1] },
      { x: r1[0], y: r1[1] }, { x: l1[0], y: l1[1] }
    ]);

    const gl0 = grassLeft[i], gr0 = grassRight[i], gl1 = grassLeft[j], gr1 = grassRight[j];
    addPolyToCells(grassCells, [
      { x: gl0[0], y: gl0[1] }, { x: gr0[0], y: gr0[1] },
      { x: gr1[0], y: gr1[1] }, { x: gl1[0], y: gl1[1] }
    ]);
  }

  return {
    center: cl,
    left,
    right,
    cells,
    cellSize,
    grass: {
      margin: baseGrassMargin,
      left: grassLeft,
      right: grassRight,
      cells: grassCells
    }
  };
}
