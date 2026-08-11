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

  // Clean previous installation if scene was rebuilt in-place.
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
    if (len < 80) continue;
    segments.push({
      i, a, b, len,
      mx:(a.x+b.x)*0.5, my:(a.y+b.y)*0.5,
      angle:Math.atan2(dy,dx),
      width:(Number(a.width||fallbackW)+Number(b.width||fallbackW))*0.5
    });
  }

  // Candidate median pairs: close enough to tempt a shortcut, but not neighboring
  // pieces of the same ribbon. Restrict to near-parallel lanes so barriers never cut turns.
  const pairs = [];
  for (let ai = 0; ai < segments.length; ai++) {
    const A = segments[ai];
    for (let bi = ai + 1; bi < segments.length; bi++) {
      const B = segments[bi];
      if (circularSegDistance(A.i, B.i, n - 1) < 5) continue;

      const d = Math.hypot(B.mx - A.mx, B.my - A.my);
      const medianGap = d - (A.width + B.width) * 0.5;
      const parallel = Math.min(angleDiff(A.angle, B.angle), Math.abs(Math.PI - angleDiff(A.angle, B.angle)));

      if (medianGap < 12 || medianGap > 125) continue;
      if (parallel > 0.42) continue; // ~24 degrees

      pairs.push({ A, B, d, medianGap, score: medianGap + parallel * 100 });
    }
  }
  pairs.sort((a,b) => a.score - b.score);

  // Keep only separated median zones, preventing several rows in the same place.
  const chosen = [];
  for (const p of pairs) {
    const mx = (p.A.mx + p.B.mx) * 0.5;
    const my = (p.A.my + p.B.my) * 0.5;
    if (chosen.some(c => Math.hypot(mx-c.mx, my-c.my) < 210)) continue;
    chosen.push({ ...p, mx, my });
    if (chosen.length >= 5) break;
  }

  const staticBodies = scene.physics.add.staticGroup();
  const placed = [];

  for (const p of chosen) {
    // Average tangent; flip B if required so both directions agree before averaging.
    let ax = Math.cos(p.A.angle), ay = Math.sin(p.A.angle);
    let bx = Math.cos(p.B.angle), by = Math.sin(p.B.angle);
    if (ax*bx + ay*by < 0) { bx = -bx; by = -by; }
    let tx = ax + bx, ty = ay + by;
    const mag = Math.hypot(tx,ty) || 1;
    tx /= mag; ty /= mag;
    const ang = Math.atan2(ty,tx);

    const usable = Math.min(250, Math.max(90, Math.min(p.A.len, p.B.len) * 0.58));
    const moduleLen = 48;
    const count = Math.max(2, Math.floor(usable / moduleLen));
    const start = -((count - 1) * moduleLen) * 0.5;

    for (let k = 0; k < count; k++) {
      const along = start + k * moduleLen;
      const x = p.mx + tx * along;
      const y = p.my + ty * along;

      // Arcade static rectangle = real collision. Visual deliberately reads as
      // low steel/energy barrier from the top-down camera.
      const r = scene.add.rectangle(x, y, 46, 12, 0x30363b, 1)
        .setStrokeStyle(2, 0xb9c1c7, 0.95)
        .setDepth(16.2)
        .setRotation(ang);
      scene.physics.add.existing(r, true);
      scene.uiCam?.ignore?.(r);

      // Reflective strip gives the divider a readable arcade/semi-realistic finish.
      const mark = scene.add.rectangle(x, y, 20, 3, 0xf3b51b, 0.95)
        .setDepth(16.3)
        .setRotation(ang);
      scene.uiCam?.ignore?.(mark);

      staticBodies.add(r);
      placed.push(r, mark);
    }
  }

  // Player collision: stop and slightly dissipate speed instead of bouncing like pinball.
  const onHit = (car) => {
    try {
      const v = car?.body?.velocity;
      if (v) {
        car.setVelocity(v.x * 0.28, v.y * 0.28);
      }
    } catch (_) {}
  };
  scene._kcDividerCollider = scene.physics.add.collider(scene.carBody, staticBodies, onHit, undefined, scene);

  // AI cars should respect the same physical divider if they are present.
  for (const ai of scene.gridCars || []) {
    if (ai?.body?.scene) {
      try { scene.physics.add.collider(ai.body, staticBodies); } catch (_) {}
    }
  }

  scene._kcDividers = placed;
  scene._kcDividerGroup = staticBodies;
  return placed;
}
