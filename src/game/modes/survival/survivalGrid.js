const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function toPoint(raw) {
  const x = Number(raw?.x ?? raw?.[0]);
  const y = Number(raw?.y ?? raw?.[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function buildClosedCenterline(rawCenterline) {
  const points = (Array.isArray(rawCenterline) ? rawCenterline : []).map(toPoint).filter(Boolean);
  if (points.length < 2) return null;

  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) continue;
    segments.push({ a, b, dx, dy, length, start: totalLength, end: totalLength + length });
    totalLength += length;
  }
  if (!segments.length || totalLength <= 0) return null;
  return { points, segments, totalLength };
}

export function sampleClosedCenterline(line, distance) {
  if (!line?.segments?.length || !Number.isFinite(line.totalLength) || line.totalLength <= 0) return null;
  const length = line.totalLength;
  let d = Number(distance) || 0;
  d = ((d % length) + length) % length;

  let segment = line.segments[line.segments.length - 1];
  for (const candidate of line.segments) {
    if (d < candidate.end) { segment = candidate; break; }
  }
  const t = clamp((d - segment.start) / segment.length, 0, 1);
  const tx = segment.dx / segment.length;
  const ty = segment.dy / segment.length;
  return {
    x: segment.a.x + segment.dx * t,
    y: segment.a.y + segment.dy * t,
    rotation: Math.atan2(ty, tx),
    tangentX: tx,
    tangentY: ty,
    distance: d
  };
}

/** Finds the nearest centerline distance to an official start/finish point. */
export function projectPointToCenterline(line, point) {
  const p = toPoint(point);
  if (!line?.segments?.length || !p) return null;
  let best = null;
  for (const segment of line.segments) {
    const len2 = segment.length * segment.length;
    const t = clamp(((p.x - segment.a.x) * segment.dx + (p.y - segment.a.y) * segment.dy) / len2, 0, 1);
    const x = segment.a.x + segment.dx * t;
    const y = segment.a.y + segment.dy * t;
    const error2 = (x - p.x) ** 2 + (y - p.y) ** 2;
    if (!best || error2 < best.error2) {
      best = {
        distance: segment.start + segment.length * t,
        error2,
        x,
        y,
        rotation: Math.atan2(segment.dy, segment.dx)
      };
    }
  }
  return best;
}

/**
 * Produces a stretched single-file grid that follows the actual centerline.
 * Slot 0 is the slowest/front car. Faster cars are progressively farther back.
 * No world-axis offsets are used, so curved start areas remain correctly aligned.
 */
export function buildSurvivalGrid({
  centerline,
  roster,
  startPoint,
  startDistance,
  frontOffset = 18,
  spacing = 58
} = {}) {
  const line = buildClosedCenterline(centerline);
  if (!line || !Array.isArray(roster) || !roster.length) return [];

  let anchor = Number(startDistance);
  if (!Number.isFinite(anchor)) {
    const projection = projectPointToCenterline(line, startPoint);
    anchor = projection?.distance;
  }
  if (!Number.isFinite(anchor)) anchor = 0;

  const gap = clamp(Number(spacing) || 58, 38, Math.max(38, line.totalLength / Math.max(8, roster.length * 1.5)));
  const front = clamp(Number(frontOffset) || 18, 0, gap * 0.8);

  return roster.map((entry, index) => {
    // The front car sits just behind the line. Every next car is one full safe
    // spacing farther backwards along arc length, even when the start is curved.
    const distance = anchor - front - index * gap;
    const pose = sampleClosedCenterline(line, distance);
    return {
      ...entry,
      gridIndex: index,
      gridDistance: distance,
      x: pose.x,
      y: pose.y,
      rotation: pose.rotation,
      tangentX: pose.tangentX,
      tangentY: pose.tangentY
    };
  });
}
