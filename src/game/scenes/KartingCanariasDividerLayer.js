// Physical curved guardrails for Karting Canarias.
// IMPORTANT: use the SAME dense runtime geometry that draws the road whenever it is
// available. That makes the barrier inherit the real rendered curvature instead of
// rebuilding a second approximation from the sparse authored control points.

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
  const name = String(scene?.track?.meta?.name || scene?.track?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function tangentAt(pts, i) {
  const n = pts.length;
  const a = pts[(i - 3 + n) % n];
  const b = pts[(i + 3) % n];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { tx:dx/len, ty:dy/len, angle:Math.atan2(dy,dx) };
}

function drawSmoothPolyline(g, pts) {
  if (!pts?.length) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    g.quadraticBezierTo(p.x, p.y, (p.x + q.x) * 0.5, (p.y + q.y) * 0.5);
  }
  const last = pts[pts.length - 1];
  g.lineTo(last.x, last.y);
  g.strokePath();
}

function runtimeCenterline(scene, fallbackW) {
  // Preferred source: already-sampled geometry used by the renderer.
  const geom = Array.isArray(scene?.track?.geom?.center) ? scene.track.geom.center : null;
  if (geom?.length >= 20) {
    return geom.map(p => xy(p, fallbackW)).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  // Fallbacks for alternate track-adapter shapes.
  const authored = Array.isArray(scene?.track?.meta?.centerline)
    ? scene.track.meta.centerline
    : Array.isArray(scene?.track?.centerline)
      ? scene.track.centerline
      : [];
  return authored.map(p => xy(p, fallbackW)).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
}

export function installKartingCanariasDividers(scene) {
  if (!scene || !isKartingCanarias(scene) || !scene.carBody?.scene) return [];

  try { scene._kcDividerCollider?.destroy?.(); } catch (_) {}
  for (const o of scene._kcDividers || []) { try { o?.destroy?.(); } catch (_) {} }
  for (const o of scene._kcDividerPhysics || []) { try { o?.destroy?.(); } catch (_) {} }
  try { scene._kcDividerGroup?.clear?.(true, true); } catch (_) {}
  scene._kcDividers = [];
  scene._kcDividerPhysics = [];

  const fallbackW = Number(scene.track?.meta?.trackWidth || scene.track?.trackWidth || 150);
  const pts = runtimeCenterline(scene, fallbackW);
  const n = pts.length;
  if (n < 16) return [];

  // Estimate sampling density so the non-adjacent skip scales correctly whether the
  // runtime geometry has 50 points or 500 points.
  let avgStep = 0;
  for (let i = 1; i < n; i++) avgStep += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
  avgStep = Math.max(4, avgStep / Math.max(1, n - 1));
  const skip = Math.max(8, Math.min(Math.floor(n * 0.12), Math.ceil(260 / avgStep)));

  // For every road sample find the nearest genuinely separate lane. The test is based
  // on EDGE gap rather than center distance, so variable-width sections are respected.
  const candidate = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const ti = tangentAt(pts, i);
    let best = null;

    for (let j = 0; j < n; j++) {
      if (i === j || circularIndexDistance(i, j, n) < skip) continue;
      const q = pts[j];
      const tj = tangentAt(pts, j);
      const parallel = Math.min(angleDiff(ti.angle, tj.angle), Math.abs(Math.PI - angleDiff(ti.angle, tj.angle)));
      if (parallel > 0.95) continue; // allow curved/transitioning parallel lanes

      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      const halfA = Number(p.width || fallbackW) * 0.5;
      const halfB = Number(q.width || fallbackW) * 0.5;
      const edgeGap = d - halfA - halfB;
      if (edgeGap < 12 || edgeGap > 230) continue;

      if (!best || edgeGap < best.edgeGap) {
        const cross = ti.tx * dy - ti.ty * dx;
        best = { j, edgeGap, side:cross >= 0 ? 1 : -1 };
      }
    }
    candidate[i] = best;
  }

  // Build long runs from consecutive samples. Short holes are bridged because nearest-
  // lane ownership naturally flickers around hairpins even though the median is continuous.
  const runs = [];
  let i = 0;
  while (i < n) {
    if (!candidate[i]) { i++; continue; }
    const start = i;
    const signs = [];
    let lastGood = i;
    let holes = 0;

    while (i < n) {
      const c = candidate[i];
      if (c) {
        signs.push(c.side);
        lastGood = i;
        holes = 0;
        i++;
        continue;
      }
      if (holes < 5) { holes++; i++; continue; }
      break;
    }

    if (signs.length < 5) continue;
    const side = signs.reduce((s,v) => s+v, 0) >= 0 ? 1 : -1;
    const ratio = signs.filter(v => v === side).length / signs.length;
    if (ratio < 0.58) continue;
    runs.push({ start, end:lastGood, side });
  }

  // Spatially dedupe mirrored detections from the two neighboring lanes. A run is
  // represented by its actual median probe point, not by source indices.
  runs.sort((a,b) => (b.end-b.start) - (a.end-a.start));
  const chosen = [];
  for (const run of runs) {
    const mid = Math.floor((run.start + run.end) * 0.5);
    const p = pts[mid], t = tangentAt(pts, mid), near = candidate[mid];
    if (!near) continue;
    const half = Number(p.width || fallbackW) * 0.5;
    const offset = half + Math.max(10, near.edgeGap * 0.5);
    const probe = { x:p.x + (-t.ty) * run.side * offset, y:p.y + t.tx * run.side * offset };
    if (chosen.some(c => Math.hypot(probe.x-c.probe.x, probe.y-c.probe.y) < 70)) continue;
    chosen.push({ ...run, probe });
    if (chosen.length >= 14) break;
  }

  const staticBodies = scene.physics.add.staticGroup();
  const placed = [];
  const physicsBodies = [];

  for (const run of chosen) {
    const curve = [];

    for (let k = run.start; k <= run.end; k++) {
      const near = candidate[k];
      if (!near) continue;
      const p = pts[k], t = tangentAt(pts, k);
      const half = Number(p.width || fallbackW) * 0.5;

      // Sit in the median, never on the asphalt. Clamp the extra distance so a very
      // wide median does not push the rail too far away from the road edge.
      const extra = Math.max(12, Math.min(38, near.edgeGap * 0.5));
      const offset = half + extra;
      curve.push({
        x:p.x + (-t.ty) * run.side * offset,
        y:p.y + t.tx * run.side * offset,
        angle:t.angle
      });
    }

    if (curve.length < 5) continue;

    // The rail is a genuine curved polyline sampled from the renderer's own road path.
    const rail = scene.add.graphics().setDepth(16.2);
    rail.lineStyle(12, 0x000000, 0.23); drawSmoothPolyline(rail, curve);
    rail.lineStyle(8, 0x626b72, 1); drawSmoothPolyline(rail, curve);
    rail.lineStyle(3, 0xd9dfe3, 0.98); drawSmoothPolyline(rail, curve);
    scene.uiCam?.ignore?.(rail);
    placed.push(rail);

    // Road-style posts along arc length.
    const postSpacing = 48;
    let distanceTotal = 0;
    let nextPost = postSpacing;
    for (let k = 1; k < curve.length; k++) {
      const a = curve[k-1], b = curve[k];
      const dx = b.x-a.x, dy = b.y-a.y, len = Math.hypot(dx,dy);
      if (len < 0.5) continue;
      const ang = Math.atan2(dy,dx);
      while (nextPost <= distanceTotal + len) {
        const u = (nextPost - distanceTotal) / len;
        const x = a.x + dx*u, y = a.y + dy*u;
        const post = scene.add.rectangle(x, y, 4, 12, 0x41474c, 1)
          .setStrokeStyle(1, 0xb2b9be, 0.75)
          .setRotation(ang + Math.PI/2)
          .setDepth(16.25);
        scene.uiCam?.ignore?.(post);
        placed.push(post);
        nextPost += postSpacing;
      }
      distanceTotal += len;
    }

    // Physics follows exactly the same curve using overlapping invisible circles.
    const physRadius = 9;
    const physStep = 10;
    for (let k = 1; k < curve.length; k++) {
      const a = curve[k-1], b = curve[k];
      const dx = b.x-a.x, dy = b.y-a.y, len = Math.hypot(dx,dy);
      if (len < 0.5) continue;
      const ang = Math.atan2(dy,dx);
      const count = Math.max(1, Math.ceil(len / physStep));
      for (let s = 0; s <= count; s++) {
        const u = s / count;
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
      const tx = Math.cos(a), ty = Math.sin(a), nx = -ty, ny = tx;
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
