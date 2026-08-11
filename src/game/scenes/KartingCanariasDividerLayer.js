// Physical curved guardrails for Karting Canarias.
// The source centerline is intentionally densified with a closed Catmull-Rom spline
// before offsetting it. This gives every bend many intermediate nodes, so the rail
// follows the road as a smooth curve instead of joining sparse control points with
// visible straight chords.

function xy(p, fallbackW = 150) {
  if (Array.isArray(p)) return { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || fallbackW) };
  return { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || fallbackW) };
}

function angleDiff(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function circularIndexDistance(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function isKartingCanarias(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function catmull(a, b, c, d, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * b) +
    (-a + c) * t +
    (2*a - 5*b + 4*c - d) * t2 +
    (-a + 3*b - 3*c + d) * t3
  );
}

function buildDenseClosedSpline(src, fallbackW) {
  if (!Array.isArray(src) || src.length < 4) return src || [];

  // Remove duplicated closing point if the JSON already repeats point 0 at the end.
  const base = src.slice();
  if (base.length > 2) {
    const a = base[0], b = base[base.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1) base.pop();
  }

  const n = base.length;
  const dense = [];
  const at = (i) => base[(i + n) % n];

  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const chord = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));

    // Around one node every 10-14 world px. Long original segments therefore gain
    // many intermediate nodes and even tight corners become visually smooth.
    const steps = Math.max(5, Math.min(18, Math.ceil(chord / 12)));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      dense.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        y: catmull(p0.y, p1.y, p2.y, p3.y, t),
        width: Math.max(50, catmull(
          Number(p0.width || fallbackW),
          Number(p1.width || fallbackW),
          Number(p2.width || fallbackW),
          Number(p3.width || fallbackW),
          t
        ))
      });
    }
  }

  return dense;
}

function tangentAt(pts, i) {
  const n = pts.length;
  const a = pts[(i - 2 + n) % n];
  const b = pts[(i + 2) % n];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { tx:dx/len, ty:dy/len, angle:Math.atan2(dy,dx) };
}

function drawSmoothPolyline(g, pts) {
  if (!pts?.length) return;
  if (pts.length === 1) {
    g.fillCircle(pts[0].x, pts[0].y, 2);
    return;
  }

  // Quadratic midpoint smoothing on top of the already-dense spline removes the last
  // visible joins produced by Phaser Graphics' straight lineTo segments.
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const mx = (p.x + q.x) * 0.5;
    const my = (p.y + q.y) * 0.5;
    g.quadraticBezierTo(p.x, p.y, mx, my);
  }
  const last = pts[pts.length - 1];
  g.lineTo(last.x, last.y);
  g.strokePath();
}

export function installKartingCanariasDividers(scene) {
  if (!scene || !isKartingCanarias(scene) || !scene.carBody?.scene) return [];

  try { scene._kcDividerCollider?.destroy?.(); } catch (_) {}
  for (const o of scene._kcDividers || []) { try { o?.destroy?.(); } catch (_) {} }
  for (const o of scene._kcDividerPhysics || []) { try { o?.destroy?.(); } catch (_) {} }
  try { scene._kcDividerGroup?.clear?.(true, true); } catch (_) {}
  scene._kcDividers = [];
  scene._kcDividerPhysics = [];

  const raw = Array.isArray(scene.track?.meta?.centerline) ? scene.track.meta.centerline : [];
  const fallbackW = Number(scene.track?.meta?.trackWidth || 150);
  const sparse = raw.map(p => xy(p, fallbackW)).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  const pts = buildDenseClosedSpline(sparse, fallbackW);
  const n = pts.length;
  if (n < 24) return [];

  // Find nearby non-adjacent lanes on the DENSE spline. With ~12px samples we skip
  // enough indices to avoid mistaking the same local bend for another lane.
  const candidate = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const ti = tangentAt(pts, i);
    let best = null;

    for (let j = i + 1; j < n; j++) {
      if (circularIndexDistance(i, j, n) < 18) continue;

      const q = pts[j];
      const tj = tangentAt(pts, j);
      const parallel = Math.min(angleDiff(ti.angle, tj.angle), Math.abs(Math.PI - angleDiff(ti.angle, tj.angle)));
      if (parallel > 0.62) continue;

      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      const halfA = Number(p.width || fallbackW) * 0.5;
      const halfB = Number(q.width || fallbackW) * 0.5;
      const edgeGap = d - halfA - halfB;
      if (edgeGap < 15 || edgeGap > 190) continue;

      // Prefer the nearest legal median. Ownership by i<j naturally prevents mirrored copies.
      if (!best || edgeGap < best.edgeGap) {
        const cross = ti.tx * dy - ti.ty * dx;
        best = { j, edgeGap, side: cross >= 0 ? 1 : -1, d };
      }
    }
    candidate[i] = best;
  }

  // Dense contiguous ranges produce long rails. Allow up to two tiny detection holes so
  // spline curvature does not get split into multiple short rails at a corner.
  const runs = [];
  let i = 0;
  while (i < n) {
    const c = candidate[i];
    if (!c) { i++; continue; }

    const start = i;
    const side = c.side;
    let lastGood = i;
    let goodCount = 1;
    let misses = 0;
    i++;

    while (i < n) {
      const next = candidate[i];
      if (next && next.side === side) {
        lastGood = i;
        goodCount++;
        misses = 0;
        i++;
        continue;
      }
      if (!next && misses < 2) { misses++; i++; continue; }
      break;
    }

    // At ~12px/sample this asks for roughly 70+px of useful barrier.
    if (goodCount >= 6 && lastGood - start >= 5) runs.push({ start, end:lastGood, side });
  }

  // Prefer long rails and suppress genuinely duplicate corridors.
  runs.sort((a,b) => (b.end-b.start) - (a.end-a.start));
  const chosen = [];
  for (const run of runs) {
    const mid = Math.floor((run.start + run.end) * 0.5);
    const p = pts[mid];
    const t = tangentAt(pts, mid);
    const half = Number(p.width || fallbackW) * 0.5;
    const probe = { x:p.x + (-t.ty) * run.side * (half + 18), y:p.y + t.tx * run.side * (half + 18) };
    if (chosen.some(c => Math.hypot(probe.x-c.probe.x, probe.y-c.probe.y) < 38)) continue;
    chosen.push({ ...run, probe });
    if (chosen.length >= 12) break;
  }

  const staticBodies = scene.physics.add.staticGroup();
  const placed = [];
  const physicsBodies = [];

  for (const run of chosen) {
    const curve = [];

    for (let k = run.start; k <= run.end; k++) {
      const p = pts[k];
      const t = tangentAt(pts, k);
      const nx = -t.ty, ny = t.tx;
      const half = Number(p.width || fallbackW) * 0.5;
      const near = candidate[k];

      // Guardrail sits just outside the white line and remains parallel to the spline.
      const extra = Math.max(13, Math.min(22, Number(near?.edgeGap || 30) * 0.30));
      const offset = half + extra;
      curve.push({
        x: p.x + nx * run.side * offset,
        y: p.y + ny * run.side * offset,
        angle: t.angle
      });
    }

    if (curve.length < 5) continue;

    const rail = scene.add.graphics().setDepth(16.2);
    rail.lineStyle(11, 0x000000, 0.22); drawSmoothPolyline(rail, curve);
    rail.lineStyle(7, 0x626b72, 1); drawSmoothPolyline(rail, curve);
    rail.lineStyle(3, 0xd4dade, 0.96); drawSmoothPolyline(rail, curve);
    scene.uiCam?.ignore?.(rail);
    placed.push(rail);

    // Place posts by accumulated distance along the dense curved path.
    let carry = 0;
    const postSpacing = 52;
    for (let k = 1; k < curve.length; k++) {
      const a = curve[k-1], b = curve[k];
      const dx = b.x-a.x, dy = b.y-a.y;
      const len = Math.hypot(dx,dy);
      if (len < 0.5) continue;
      const ang = Math.atan2(dy,dx);
      let d = postSpacing - carry;
      while (d <= len) {
        const u = d/len;
        const x = a.x + dx*u, y = a.y + dy*u;
        const post = scene.add.rectangle(x, y, 4, 12, 0x40464b, 1)
          .setStrokeStyle(1, 0xaab1b6, 0.72)
          .setRotation(ang + Math.PI/2)
          .setDepth(16.25);
        scene.uiCam?.ignore?.(post);
        placed.push(post);
        d += postSpacing;
      }
      carry = (carry + len) % postSpacing;
    }

    // Collision samples the same curved offset path densely. No rotated box, no chord shortcut.
    const physRadius = 9;
    const physStep = 11;
    for (let k = 1; k < curve.length; k++) {
      const a = curve[k-1], b = curve[k];
      const dx = b.x-a.x, dy = b.y-a.y;
      const len = Math.hypot(dx,dy);
      if (len < 0.5) continue;
      const ang = Math.atan2(dy,dx);
      const count = Math.max(1, Math.ceil(len/physStep));
      for (let s = 0; s <= count; s++) {
        const u = s/count;
        const x = a.x + dx*u, y = a.y + dy*u;
        const c = scene.add.circle(x, y, physRadius, 0x000000, 0);
        scene.physics.add.existing(c, true);
        try { c.body.setCircle(physRadius); c.body.updateFromGameObject(); } catch (_) {}
        c.setVisible(false);
        c._kcBarrierAngle = ang;
        staticBodies.add(c);
        physicsBodies.push(c);
      }
    }
  }

  const onHit = (car, barrier) => {
    try {
      const v = car?.body?.velocity;
      if (!v) return;
      const a = Number(barrier?._kcBarrierAngle || 0);
      const tx = Math.cos(a), ty = Math.sin(a);
      const nx = -ty, ny = tx;
      const tangentSpeed = v.x*tx + v.y*ty;
      const normalSpeed = v.x*nx + v.y*ny;
      const outNormal = -normalSpeed * 0.11;
      car.setVelocity(
        tx*tangentSpeed*0.90 + nx*outNormal,
        ty*tangentSpeed*0.90 + ny*outNormal
      );
    } catch (_) {}
  };

  scene._kcDividerCollider = scene.physics.add.collider(scene.carBody, staticBodies, onHit, undefined, scene);
  for (const ai of scene.gridCars || []) {
    if (ai?.body?.scene) { try { scene.physics.add.collider(ai.body, staticBodies); } catch (_) {} }
  }

  scene._kcDividers = placed;
  scene._kcDividerPhysics = physicsBodies;
  scene._kcDividerGroup = staticBodies;
  return placed;
}
