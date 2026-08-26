import { RaceScene as PremiumSurfaceRaceScene } from './RaceSurfaceLongitudinalScene.js';

// Physics bridge for the premium kerbs/pianos.
// Prefer the exact exported kerb geometry when the track provides it. The older
// turn-based approximation remains only as a fallback for legacy tracks.
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
      const curbTolerance = 1.75;
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
          for (let o = -18; o <= 18; o++) test(nearestSeg + o);
          if (!best || best.d2 > 220 * 220) {
            best = null;
            for (let i = 0; i < n; i++) test(i);
          }
        }

        if (best) nearestSeg = best.i;
        return best;
      };

      const xy = (p) => Array.isArray(p)
        ? { x:Number(p[0]), y:Number(p[1]) }
        : { x:Number(p?.x), y:Number(p?.y) };
      const pointInQuad = (x,y,a0,a1,b1,b0) => {
        const pts=[xy(a0),xy(a1),xy(b1),xy(b0)];
        if(pts.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))) return false;
        let inside=false;
        for(let i=0,j=3;i<4;j=i++){
          const pi=pts[i],pj=pts[j];
          const hit=((pi.y>y)!==(pj.y>y)) && (x < (pj.x-pi.x)*(y-pi.y)/((pj.y-pi.y)||1e-9)+pi.x);
          if(hit) inside=!inside;
        }
        return inside;
      };

      // These are the exact arrays used by RaceScene to draw exported red/white
      // pianos. Detecting these means the haptic surface and the pixels now agree.
      const eg=this.track?.meta?.geometry || {};
      const exportedBands=[];
      const addBand=(inner,outer)=>{
        if(Array.isArray(inner)&&Array.isArray(outer)&&inner.length>2&&inner.length===outer.length){
          exportedBands.push({inner,outer,len:inner.length});
        }
      };
      addBand(eg.trackOuter,eg.curbOuter);
      addBand(eg.trackInner,eg.curbInner);
      const hasExportedKerbs=exportedBands.length>0;

      const isOnExportedKerb=(x,y,nearI)=>{
        if(!hasExportedKerbs) return false;
        for(const band of exportedBands){
          // Most exported arrays share the centerline sample count. Map the cached
          // center index proportionally too, so this stays correct if counts differ.
          const base=Math.round((nearI/Math.max(1,n-1))*Math.max(1,band.len-1));
          for(let o=-8;o<=8;o++){
            const i=(base+o+band.len)%band.len;
            const j=(i+1)%band.len;
            if(pointInQuad(x,y,band.inner[i],band.inner[j],band.outer[j],band.outer[i])) return true;
          }
        }
        return false;
      };

      const isOnVisualKerb = (x, y) => {
        const hit = findNearest(x, y);
        if (!hit) return false;

        // Exact geometry first. This is the normal path for current tracks.
        if(isOnExportedKerb(x,y,hit.i)) return true;

        // Legacy fallback for tracks that only have the generated premium strip.
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
