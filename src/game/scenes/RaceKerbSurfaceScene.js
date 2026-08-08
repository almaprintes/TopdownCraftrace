import { RaceScene as PremiumSurfaceRaceScene } from './RaceSurfaceLongitudinalScene.js';

// Physics bridge for the premium kerbs/pianos.
// The visual kerbs are deliberately drawn just OUTSIDE the asphalt ribbon.
// Without this layer, the legacy surface detector classifies their outer half as grass
// and applies the grass speed penalty. Here we extend TRACK only over the same local
// inside-of-corner strip used by the visual kerbs. No geometry, rendering or car physics
// are otherwise changed.
export class RaceScene extends PremiumSurfaceRaceScene {
  create() {
    super.create();

    try {
      const fallbackW = Number(this.track?.meta?.trackWidth || 160);
      const center = (this.track?.geom?.center || [])
        .map((p) => Array.isArray(p)
          ? { x: Number(p[0]), y: Number(p[1]), width: fallbackW }
          : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || fallbackW) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      const n = center.length;
      if (n < 16 || typeof this._isOnTrack !== 'function') return;

      const originalIsOnTrack = this._isOnTrack.bind(this);
      const maxCurbWidth = 11.5;
      const curbTolerance = 1.75; // avoids a 1px classification seam at the white line
      const enterThreshold = 0.055;

      const idx = (i) => (i + n) % n;
      const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      const turnAt = (i) => {
        const a = center[idx(i - 5)];
        const b = center[idx(i)];
        const c = center[idx(i + 5)];
        return normAngle(
          Math.atan2(c.y - b.y, c.x - b.x) -
          Math.atan2(b.y - a.y, b.x - a.x)
        );
      };

      // Cache the nearest segment. Normal driving moves only a few samples per frame,
      // so this stays cheap even on the long endurance circuit.
      let nearestSeg = 0;
      let nearestReady = false;

      const pointToSegment = (x, y, i) => {
        const j = idx(i + 1);
        const a = center[idx(i)];
        const b = center[j];
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const len2 = vx * vx + vy * vy;
        if (len2 < 1e-8) return null;
        let t = ((x - a.x) * vx + (y - a.y) * vy) / len2;
        t = Math.max(0, Math.min(1, t));
        const qx = a.x + vx * t;
        const qy = a.y + vy * t;
        const dx = x - qx;
        const dy = y - qy;
        return { i: idx(i), j, t, qx, qy, d2: dx * dx + dy * dy, vx, vy };
      };

      const findNearest = (x, y) => {
        let best = null;
        const test = (i) => {
          const h = pointToSegment(x, y, i);
          if (h && (!best || h.d2 < best.d2)) best = h;
        };

        if (!nearestReady) {
          for (let i = 0; i < n; i++) test(i);
          nearestReady = true;
        } else {
          for (let o = -24; o <= 24; o++) test(nearestSeg + o);
          // Safety fallback if something teleports far from the cached neighborhood.
          if (!best || best.d2 > 220 * 220) {
            best = null;
            for (let i = 0; i < n; i++) test(i);
          }
        }

        if (best) nearestSeg = best.i;
        return best;
      };

      const isOnVisualKerb = (x, y) => {
        const hit = findNearest(x, y);
        if (!hit) return false;

        const i = hit.i;
        const j = hit.j;
        const turn = turnAt(i);
        if (Math.abs(turn) < enterThreshold) return false;

        const segLen = Math.hypot(hit.vx, hit.vy) || 1;
        const nx = -hit.vy / segLen;
        const ny = hit.vx / segLen;
        const lateral = (x - hit.qx) * nx + (y - hit.qy) * ny;

        const w0 = Number(center[i]?.width || fallbackW);
        const w1 = Number(center[j]?.width || fallbackW);
        const half = (w0 + (w1 - w0) * hit.t) * 0.5;

        // Visual algorithm: positive turn -> LEFT edge, negative turn -> RIGHT edge.
        // Only the actual piano side receives the extra drivable strip.
        if (turn > 0) {
          return lateral >= half - curbTolerance &&
                 lateral <= half + maxCurbWidth + curbTolerance;
        }
        return lateral <= -half + curbTolerance &&
               lateral >= -half - maxCurbWidth - curbTolerance;
      };

      this._isOnKerb = isOnVisualKerb;
      this._isOnTrack = (x, y) => originalIsOnTrack(x, y) || isOnVisualKerb(x, y);
    } catch (err) {
      console.warn('[TDR2] Kerb surface bridge failed', err);
    }
  }
}
