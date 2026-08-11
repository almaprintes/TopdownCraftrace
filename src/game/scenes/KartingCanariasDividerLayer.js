// Physical lane dividers for Karting Canarias.
// Detects close, roughly parallel NON-adjacent centerline segments and places
// short static barriers in the median so the player cannot jump between lanes.
// The circuit geometry itself is not changed.

function xy(p, fallbackW = 150) {
  if (Array.isArray(p)) return { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || fallbackW) };
  return { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || fallbackW) };
}

function angleDiff(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function circularSegDistance(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function isKartingCanarias(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function normalizedTangent(A, B) {
  let ax = Math.cos(A.angle), ay = Math.sin(A.angle);
  let bx = Math.cos(B.angle), by = Math.sin(B.angle);
  if (ax * bx + ay * by < 0) { bx = -bx; by = -by; }
  let tx = ax + bx, ty = ay + by;
  const mag = Math.hypot(tx, ty) || 1;
  return { tx: tx / mag, ty: ty / mag };
}

export function installKartingCanariasDividers(scene) {
  if (!scene || !isKartingCanarias(scene) || !scene.carBody?.scene) return [];

  try { scene._kcDividerCollider?.destroy?.(); } catch (_) {}
  for (const o of scene._kcDividers || []) {
    try { o?.destroy?.(); } catch (_) {}
  }
  for (const o of scene._kcDividerPhysics || []) {
    try { o?.destroy?.(); } catch (_) {}
  }
  scene._kcDividers = [];
  scene._kcDividerPhysics = [];

  const raw = Array.isArray(scene.track?.meta?.centerline) ? scene.track.meta.centerline : [];
  const fallbackW = Number(scene.track?.meta?.trackWidth || 150);
  const pts = raw.map(p => xy(p, fallbackW)).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = pts.length;
  if (n < 12) return [];

  const segments = [];
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 65) continue;
    segments.push({
      i, a, b, len,
      mx:(a.x+b.x)*0.5, my:(a.y+b.y)*0.5,
      angle:Math.atan2(dy,dx),
      width:(Number(a.width||fallbackW)+Number(b.width||fallbackW))*0.5
    });
  }

  const pairs = [];
  for (let ai = 0; ai < segments.length; ai++) {
    const A = segments[ai];
    for (let bi = ai + 1; bi < segments.length; bi++) {
      const B = segments[bi];
      if (circularSegDistance(A.i, B.i, n - 1) < 4) continue;

      const d = Math.hypot(B.mx - A.mx, B.my - A.my);
      const medianGap = d - (A.width + B.width) * 0.5;
      const parallel = Math.min(angleDiff(A.angle, B.angle), Math.abs(Math.PI - angleDiff(A.angle, B.angle)));

      if (medianGap < 8 || medianGap > 155) continue;
      if (parallel > 0.50) continue;

      const tangent = normalizedTangent(A, B);
      pairs.push({ A, B, d, medianGap, score: medianGap + parallel * 85, ...tangent });
    }
  }
  pairs.sort((a,b) => a.score - b.score);

  // Build MEDIAN RUNS instead of independent spots. Candidates that point in the
  // same direction and lie on the same median are merged into one continuous run.
  const runs = [];
  for (const p of pairs) {
    const mx = (p.A.mx + p.B.mx) * 0.5;
    const my = (p.A.my + p.B.my) * 0.5;
    const ang = Math.atan2(p.ty, p.tx);

    let merged = false;
    for (const run of runs) {
      const ad = Math.min(angleDiff(run.ang, ang), Math.abs(Math.PI - angleDiff(run.ang, ang)));
      if (ad > 0.20) continue;

      const nx = -Math.sin(run.ang), ny = Math.cos(run.ang);
      const perp = Math.abs((mx - run.cx) * nx + (my - run.cy) * ny);
      if (perp > 34) continue;

      const tx = Math.cos(run.ang), ty = Math.sin(run.ang);
      const along = (mx - run.cx) * tx + (my - run.cy) * ty;
      if (Math.abs(along) > run.halfLen + 210) continue;

      const usable = Math.min(330, Math.max(120, Math.min(p.A.len, p.B.len) * 0.78));
      run.minAlong = Math.min(run.minAlong, along - usable * 0.5);
      run.maxAlong = Math.max(run.maxAlong, along + usable * 0.5);
      run.halfLen = (run.maxAlong - run.minAlong) * 0.5;
      merged = true;
      break;
    }

    if (!merged) {
      const usable = Math.min(330, Math.max(120, Math.min(p.A.len, p.B.len) * 0.78));
      runs.push({
        cx: mx, cy: my, ang,
        minAlong: -usable * 0.5,
        maxAlong: usable * 0.5,
        halfLen: usable * 0.5,
        score: p.score
      });
    }
  }

  runs.sort((a,b) => a.score - b.score);
  const chosen = [];
  for (const run of runs) {
    const overlaps = chosen.some(c => {
      const ad = Math.min(angleDiff(c.ang, run.ang), Math.abs(Math.PI - angleDiff(c.ang, run.ang)));
      if (ad > 0.22) return false;
      const perp = Math.abs((run.cx - c.cx) * (-Math.sin(c.ang)) + (run.cy - c.cy) * Math.cos(c.ang));
      if (perp > 42) return false;
      const along = Math.abs((run.cx - c.cx) * Math.cos(c.ang) + (run.cy - c.cy) * Math.sin(c.ang));
      return along < (run.halfLen + c.halfLen + 50);
    });
    if (overlaps) continue;
    chosen.push(run);
    if (chosen.length >= 14) break;
  }

  const staticBodies = scene.physics.add.staticGroup();
  const placed = [];
  const physicsBodies = [];

  for (const run of chosen) {
    const tx = Math.cos(run.ang), ty = Math.sin(run.ang);
    const runLen = Math.max(110, run.maxAlong - run.minAlong);

    // VISUAL chain: decorative modules continue one after another.
    const modulePitch = 42;
    const visualLen = 44;
    const count = Math.max(3, Math.ceil(runLen / modulePitch));
    const actualLen = (count - 1) * modulePitch;
    const visualStart = -actualLen * 0.5;

    for (let k = 0; k < count; k++) {
      const along = visualStart + k * modulePitch;
      const x = run.cx + tx * along;
      const y = run.cy + ty * along;

      const r = scene.add.rectangle(x, y, visualLen, 10, 0x30363b, 1)
        .setStrokeStyle(1.5, 0xb9c1c7, 0.95)
        .setDepth(16.2)
        .setRotation(run.ang);
      scene.uiCam?.ignore?.(r);

      const mark = scene.add.rectangle(x, y, 22, 2.5, 0xf3b51b, 0.95)
        .setDepth(16.3)
        .setRotation(run.ang);
      scene.uiCam?.ignore?.(mark);
      placed.push(r, mark);
    }

    // PHYSICS chain: Arcade Physics static rectangles do NOT rotate with the visual
    // rectangle, which left diagonal barriers traversable. Use overlapping invisible
    // circular static bodies instead. Circles are rotation-independent and form a true
    // continuous wall along the exact barrier tangent.
    const physRadius = 10;
    const physStep = 13; // strong overlap: no gaps for a ~14px car body
    const physHalf = actualLen * 0.5 + 18;
    const physCount = Math.max(2, Math.ceil((physHalf * 2) / physStep) + 1);
    const physStart = -((physCount - 1) * physStep) * 0.5;

    for (let k = 0; k < physCount; k++) {
      const along = physStart + k * physStep;
      const x = run.cx + tx * along;
      const y = run.cy + ty * along;

      const c = scene.add.circle(x, y, physRadius, 0x000000, 0);
      scene.physics.add.existing(c, true);
      try {
        c.body.setCircle(physRadius);
        c.body.updateFromGameObject();
      } catch (_) {}
      c.setVisible(false);
      c._kcBarrierAngle = run.ang;
      staticBodies.add(c);
      physicsBodies.push(c);
    }
  }

  // Glancing collisions should scrape/slide, not glue the car to the barrier.
  const onHit = (car, barrier) => {
    try {
      const v = car?.body?.velocity;
      if (!v) return;

      const a = Number(barrier?._kcBarrierAngle || 0);
      const tx = Math.cos(a), ty = Math.sin(a);
      const nx = -ty, ny = tx;
      const tangentSpeed = v.x * tx + v.y * ty;
      const normalSpeed = v.x * nx + v.y * ny;

      // Keep most of the along-wall motion. Reverse only a small part of the
      // inward component so Arcade separates the car immediately without sticking.
      const outNormal = -normalSpeed * 0.12;
      const vx = tx * tangentSpeed * 0.88 + nx * outNormal;
      const vy = ty * tangentSpeed * 0.88 + ny * outNormal;
      car.setVelocity(vx, vy);
    } catch (_) {}
  };
  scene._kcDividerCollider = scene.physics.add.collider(scene.carBody, staticBodies, onHit, undefined, scene);

  for (const ai of scene.gridCars || []) {
    if (ai?.body?.scene) {
      try { scene.physics.add.collider(ai.body, staticBodies); } catch (_) {}
    }
  }

  scene._kcDividers = placed;
  scene._kcDividerPhysics = physicsBodies;
  scene._kcDividerGroup = staticBodies;
  return placed;
}
