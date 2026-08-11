// Physical curved guardrails for Karting Canarias.
// Guardrails are derived from the REAL centerline and offset a short distance from
// the asphalt edge, so they inherit exactly the same bends instead of approximating
// the circuit with long straight rectangles.

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

function tangentAt(pts, i) {
  const n = pts.length;
  const a = pts[(i - 1 + n) % n];
  const b = pts[(i + 1) % n];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { tx:dx/len, ty:dy/len, angle:Math.atan2(dy,dx) };
}

function drawPolyline(g, pts) {
  if (!pts?.length) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
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
  const pts = raw.map(p => xy(p, fallbackW)).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = pts.length;
  if (n < 12) return [];

  // For each centerline sample, find the closest NON-adjacent, roughly parallel lane.
  // Only the lower index of the pair is allowed to own the divider. That prevents the
  // same median from being drawn twice from both neighboring lanes.
  const candidate = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const ti = tangentAt(pts, i);
    let best = null;

    for (let j = 0; j < n; j++) {
      if (circularIndexDistance(i, j, n) < 6) continue;
      if (i >= j) continue; // one owner per median

      const q = pts[j];
      const tj = tangentAt(pts, j);
      const parallel = Math.min(angleDiff(ti.angle, tj.angle), Math.abs(Math.PI - angleDiff(ti.angle, tj.angle)));
      if (parallel > 0.62) continue;

      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      const halfA = Number(p.width || fallbackW) * 0.5;
      const halfB = Number(q.width || fallbackW) * 0.5;
      const edgeGap = d - halfA - halfB;

      // Close enough to invite an illegal lane jump, but with an actual median where
      // a guardrail can live. Very tiny/negative gaps are deliberately skipped.
      if (edgeGap < 16 || edgeGap > 190) continue;

      if (!best || edgeGap < best.edgeGap) {
        const cross = ti.tx * dy - ti.ty * dx;
        best = { j, edgeGap, side: cross >= 0 ? 1 : -1, d };
      }
    }

    candidate[i] = best;
  }

  // Convert point detections into contiguous centerline ranges. We keep the guardrail
  // attached to one lane and one side, so its curvature is inherited from that lane.
  const runs = [];
  let i = 0;
  while (i < n) {
    const c = candidate[i];
    if (!c) { i++; continue; }

    const start = i;
    const side = c.side;
    const indices = [i];
    let last = i;
    let misses = 0;
    i++;

    while (i < n) {
      const next = candidate[i];
      if (next && next.side === side) {
        indices.push(i);
        last = i;
        misses = 0;
        i++;
        continue;
      }
      // Bridge one missing sample so a tiny detection wobble does not split a long rail.
      if (!next && misses < 1) { misses++; i++; continue; }
      break;
    }

    if (indices.length >= 3 && last - start >= 3) runs.push({ start, end:last, side });
  }

  // Spatial dedupe: if two runs still describe essentially the same corridor, keep the longer one.
  runs.sort((a,b) => (b.end-b.start) - (a.end-a.start));
  const chosen = [];
  for (const run of runs) {
    const mid = Math.floor((run.start + run.end) * 0.5);
    const p = pts[mid];
    const t = tangentAt(pts, mid);
    const half = Number(p.width || fallbackW) * 0.5;
    const probe = { x:p.x + (-t.ty) * run.side * (half + 18), y:p.y + t.tx * run.side * (half + 18) };
    if (chosen.some(c => Math.hypot(probe.x-c.probe.x, probe.y-c.probe.y) < 45)) continue;
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

      // Base clearance = just outside the white line. If the median is wider, move a
      // little farther outward, but NEVER as far as the center of the neighboring lane.
      const extra = Math.max(14, Math.min(24, Number(near?.edgeGap || 30) * 0.32));
      const offset = half + extra;
      curve.push({
        x: p.x + nx * run.side * offset,
        y: p.y + ny * run.side * offset,
        angle: t.angle
      });
    }

    if (curve.length < 3) continue;

    // One graphics object draws the entire guardrail as a CURVED polyline.
    // Three passes create shadow/lower rail/highlight, like road Armco from above.
    const rail = scene.add.graphics().setDepth(16.2);
    rail.lineStyle(11, 0x000000, 0.24); drawPolyline(rail, curve);
    rail.lineStyle(7, 0x626b72, 1); drawPolyline(rail, curve);
    rail.lineStyle(3, 0xd4dade, 0.95); drawPolyline(rail, curve);
    scene.uiCam?.ignore?.(rail);
    placed.push(rail);

    // Posts every ~55px along the curved guardrail.
    let postCarry = 0;
    for (let k = 1; k < curve.length; k++) {
      const a = curve[k-1], b = curve[k];
      const dx = b.x-a.x, dy = b.y-a.y;
      const len = Math.hypot(dx,dy);
      if (len < 1) continue;
      const ang = Math.atan2(dy,dx);
      let d = 55 - postCarry;
      while (d < len) {
        const u = d/len;
        const x = a.x + dx*u, y = a.y + dy*u;
        const post = scene.add.rectangle(x, y, 4, 13, 0x40464b, 1)
          .setStrokeStyle(1, 0xaab1b6, 0.7)
          .setRotation(ang + Math.PI/2)
          .setDepth(16.25);
        scene.uiCam?.ignore?.(post);
        placed.push(post);
        d += 55;
      }
      postCarry = Math.max(0, len - (d - 55));
      if (postCarry >= 55) postCarry %= 55;
    }

    // Collision follows the SAME curved polyline. Invisible circles overlap every 12px,
    // so curves cannot be cut through and there are no rotated-box holes.
    const physRadius = 9;
    const physStep = 12;
    for (let k = 1; k < curve.length; k++) {
      const a = curve[k-1], b = curve[k];
      const dx = b.x-a.x, dy = b.y-a.y;
      const len = Math.hypot(dx,dy);
      if (len < 1) continue;
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

  // Glancing hit: preserve most along-rail velocity and reject the inward component.
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
