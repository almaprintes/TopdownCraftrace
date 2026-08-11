// Physical lane dividers for Karting Canarias.
// Detects close, roughly parallel NON-adjacent centerline segments and places
// long road-style guardrails in the median so the player cannot jump between lanes.
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

  // Build long MEDIAN RUNS. Nearby candidates are aggressively merged so one
  // corridor produces one guardrail, not several short rails at different angles.
  const runs = [];
  for (const p of pairs) {
    const mx = (p.A.mx + p.B.mx) * 0.5;
    const my = (p.A.my + p.B.my) * 0.5;
    const ang = Math.atan2(p.ty, p.tx);

    let merged = false;
    for (const run of runs) {
      const ad = Math.min(angleDiff(run.ang, ang), Math.abs(Math.PI - angleDiff(run.ang, ang)));
      if (ad > 0.28) continue;

      const nx = -Math.sin(run.ang), ny = Math.cos(run.ang);
      const perp = Math.abs((mx - run.cx) * nx + (my - run.cy) * ny);
      if (perp > 52) continue;

      const tx = Math.cos(run.ang), ty = Math.sin(run.ang);
      const along = (mx - run.cx) * tx + (my - run.cy) * ty;
      if (Math.abs(along) > run.halfLen + 260) continue;

      const usable = Math.min(420, Math.max(150, Math.min(p.A.len, p.B.len) * 0.95));
      run.minAlong = Math.min(run.minAlong, along - usable * 0.5);
      run.maxAlong = Math.max(run.maxAlong, along + usable * 0.5);
      run.halfLen = (run.maxAlong - run.minAlong) * 0.5;

      // Stabilise the visual angle: blend toward the new tangent instead of creating a new rail.
      let ax = Math.cos(run.ang), ay = Math.sin(run.ang);
      let bx = Math.cos(ang), by = Math.sin(ang);
      if (ax * bx + ay * by < 0) { bx = -bx; by = -by; }
      const vx = ax * 0.82 + bx * 0.18;
      const vy = ay * 0.82 + by * 0.18;
      run.ang = Math.atan2(vy, vx);
      merged = true;
      break;
    }

    if (!merged) {
      const usable = Math.min(420, Math.max(150, Math.min(p.A.len, p.B.len) * 0.95));
      runs.push({
        cx: mx, cy: my, ang,
        minAlong: -usable * 0.5,
        maxAlong: usable * 0.5,
        halfLen: usable * 0.5,
        score: p.score
      });
    }
  }

  // Final corridor-level dedupe. If two rails occupy nearly the same median, keep
  // only the stronger/longer one. This is intentionally stricter than previous passes.
  runs.sort((a,b) => a.score - b.score);
  const chosen = [];
  for (const run of runs) {
    const overlaps = chosen.some(c => {
      const ad = Math.min(angleDiff(c.ang, run.ang), Math.abs(Math.PI - angleDiff(c.ang, run.ang)));
      const dx = run.cx - c.cx;
      const dy = run.cy - c.cy;
      const perp = Math.abs(dx * (-Math.sin(c.ang)) + dy * Math.cos(c.ang));
      const along = Math.abs(dx * Math.cos(c.ang) + dy * Math.sin(c.ang));
      return ad < 0.34 && perp < 70 && along < (run.halfLen + c.halfLen + 110);
    });
    if (overlaps) continue;
    chosen.push(run);
    if (chosen.length >= 10) break;
  }

  const staticBodies = scene.physics.add.staticGroup();
  const placed = [];
  const physicsBodies = [];

  for (const run of chosen) {
    const tx = Math.cos(run.ang), ty = Math.sin(run.ang);
    const runLen = Math.max(150, run.maxAlong - run.minAlong);

    // VISUAL: road-style long guardrail sections, not lots of little slabs.
    // Long sections overlap slightly and use regularly spaced posts so they read
    // like continuous roadside Armco from the top-down camera.
    const sectionLen = 150;
    const overlap = 10;
    const pitch = sectionLen - overlap;
    const count = Math.max(1, Math.ceil(runLen / pitch));
    const actualLen = (count - 1) * pitch;
    const start = -actualLen * 0.5;

    for (let k = 0; k < count; k++) {
      const along = start + k * pitch;
      const x = run.cx + tx * along;
      const y = run.cy + ty * along;

      const rail = scene.add.container(x, y).setDepth(16.2).setRotation(run.ang);
      const shadow = scene.add.rectangle(2, 3, sectionLen, 10, 0x000000, 0.24);
      const lower = scene.add.rectangle(0, 2, sectionLen, 5, 0x687078, 1)
        .setStrokeStyle(1, 0x2e3438, 0.9);
      const upper = scene.add.rectangle(0, -2, sectionLen, 4, 0xbfc7cd, 1)
        .setStrokeStyle(1, 0xe3e7ea, 0.65);
      rail.add([shadow, lower, upper]);

      const postCount = 5;
      for (let p = 0; p < postCount; p++) {
        const px = -sectionLen * 0.42 + p * (sectionLen * 0.84 / (postCount - 1));
        const post = scene.add.rectangle(px, 4, 4, 12, 0x40464b, 1)
          .setStrokeStyle(1, 0x9aa1a6, 0.7);
        rail.add(post);
      }

      scene.uiCam?.ignore?.(rail);
      placed.push(rail);
    }

    // PHYSICS: overlapping invisible circles make the collision independent of rotation.
    const physRadius = 10;
    const physStep = 13;
    const physHalf = actualLen * 0.5 + sectionLen * 0.5 + 8;
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

  const onHit = (car, barrier) => {
    try {
      const v = car?.body?.velocity;
      if (!v) return;

      const a = Number(barrier?._kcBarrierAngle || 0);
      const tx = Math.cos(a), ty = Math.sin(a);
      const nx = -ty, ny = tx;
      const tangentSpeed = v.x * tx + v.y * ty;
      const normalSpeed = v.x * nx + v.y * ny;

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
