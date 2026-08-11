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

export function installKartingCanariasDividers(scene) {
  if (!scene || !isKartingCanarias(scene) || !scene.carBody?.scene) return [];

  try { scene._kcDividerCollider?.destroy?.(); } catch (_) {}
  for (const o of scene._kcDividers || []) {
    try { o?.destroy?.(); } catch (_) {}
  }
  scene._kcDividers = [];

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

  // Wider search than v1: we want most of the compact multi-lane section protected,
  // not only the five closest pairs.
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
      if (parallel > 0.50) continue; // ~29 degrees

      pairs.push({ A, B, d, medianGap, score: medianGap + parallel * 85 });
    }
  }
  pairs.sort((a,b) => a.score - b.score);

  // More protected medians, but still suppress near-duplicates.
  const chosen = [];
  for (const p of pairs) {
    const mx = (p.A.mx + p.B.mx) * 0.5;
    const my = (p.A.my + p.B.my) * 0.5;
    if (chosen.some(c => Math.hypot(mx-c.mx, my-c.my) < 125)) continue;
    chosen.push({ ...p, mx, my });
    if (chosen.length >= 12) break;
  }

  const staticBodies = scene.physics.add.staticGroup();
  const placed = [];

  for (const p of chosen) {
    let ax = Math.cos(p.A.angle), ay = Math.sin(p.A.angle);
    let bx = Math.cos(p.B.angle), by = Math.sin(p.B.angle);
    if (ax*bx + ay*by < 0) { bx = -bx; by = -by; }
    let tx = ax + bx, ty = ay + by;
    const mag = Math.hypot(tx,ty) || 1;
    tx /= mag; ty /= mag;
    const ang = Math.atan2(ty,tx);

    const usable = Math.min(330, Math.max(120, Math.min(p.A.len, p.B.len) * 0.78));

    // Modules overlap slightly. This removes the little corners/gaps that were catching
    // the circular car body while still behaving as a continuous wall.
    const moduleLen = 42;
    const visualLen = 46;
    const bodyLen = 44;
    const bodyThick = 8;
    const count = Math.max(3, Math.ceil(usable / moduleLen));
    const start = -((count - 1) * moduleLen) * 0.5;

    for (let k = 0; k < count; k++) {
      const along = start + k * moduleLen;
      const x = p.mx + tx * along;
      const y = p.my + ty * along;

      const r = scene.add.rectangle(x, y, visualLen, 10, 0x30363b, 1)
        .setStrokeStyle(1.5, 0xb9c1c7, 0.95)
        .setDepth(16.2)
        .setRotation(ang);
      scene.physics.add.existing(r, true);
      // Make the physical wall a little slimmer than the art so glancing hits slide cleanly.
      try {
        r.body.setSize(bodyLen, bodyThick, true);
        r.body.updateFromGameObject();
      } catch (_) {}
      scene.uiCam?.ignore?.(r);

      const mark = scene.add.rectangle(x, y, 22, 2.5, 0xf3b51b, 0.95)
        .setDepth(16.3)
        .setRotation(ang);
      scene.uiCam?.ignore?.(mark);

      staticBodies.add(r);
      placed.push(r, mark);
    }
  }

  // Glancing collisions should scrape/slide, not glue the car to the barrier.
  // Preserve most velocity and only trim enough speed to punish wall riding.
  const onHit = (car, barrier) => {
    try {
      const v = car?.body?.velocity;
      if (!v) return;

      const a = Number(barrier?.rotation || 0);
      const tx = Math.cos(a), ty = Math.sin(a);
      const nx = -ty, ny = tx;
      const tangentSpeed = v.x * tx + v.y * ty;
      const normalSpeed = v.x * nx + v.y * ny;

      // Keep 78% of tangential motion and kill most inward motion.
      // A tiny outward component helps Arcade Physics separate the bodies immediately.
      const outNormal = -normalSpeed * 0.08;
      const vx = tx * tangentSpeed * 0.78 + nx * outNormal;
      const vy = ty * tangentSpeed * 0.78 + ny * outNormal;
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
  scene._kcDividerGroup = staticBodies;
  return placed;
}
