import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// Keeps surfaces procedural while removing the two main visual failures found in testing:
// coarse pebble-like asphalt and shoulder dirt leaking into the racing surface.
export class RaceScene extends MaterialRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    if (this.textures.exists(key)) return;

    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x5a91e3c7) || Math.random;

    ctx.fillStyle = '#30452d';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 70; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 45 + rand() * 150;
      const pick = rand();
      const c = pick > 0.72 ? '107,102,59' : pick > 0.38 ? '31,63,31' : '67,91,48';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.025 + rand() * 0.04})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }

    for (let i = 0; i < 52000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const dry = rand() > 0.88;
      ctx.strokeStyle = dry
        ? `rgba(155,136,78,${0.035 + rand() * 0.075})`
        : (rand() > 0.5
          ? `rgba(103,129,75,${0.035 + rand() * 0.065})`
          : `rgba(19,48,23,${0.035 + rand() * 0.075})`);
      ctx.lineWidth = 0.45 + rand() * 0.55;
      const a = rand() * Math.PI;
      const l = 0.8 + rand() * 2.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    for (let i = 0; i < 4200; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.55
        ? `rgba(120,100,60,${0.025 + rand() * 0.06})`
        : `rgba(10,24,13,${0.020 + rand() * 0.05})`;
      const s = 0.5 + rand() * 1.5;
      ctx.fillRect(x, y, s, s);
    }

    tex.refresh();
  }

  ensureAsphaltTexture() {
    const key = 'asphalt';
    if (this.textures.exists(key)) return;

    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const rand = this._rng?.(0x6f41a2d9) || Math.random;

    // Smooth matte warm charcoal. The road should read as asphalt from value variation,
    // not from visible stones.
    ctx.fillStyle = '#35322f';
    ctx.fillRect(0, 0, size, size);

    // Large soft tonal drift: grime, repairs and age without decorative blobs.
    for (let i = 0; i < 110; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 45 + rand() * 170;
      const pick = rand();
      const c = pick > 0.66 ? '86,73,60' : pick > 0.32 ? '20,20,20' : '72,70,66';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${c},${0.014 + rand() * 0.028})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }

    // Very fine micrograin only. Deliberately sparse to avoid the current pebble look.
    for (let i = 0; i < 9000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const light = rand() > 0.84;
      ctx.fillStyle = light
        ? `rgba(154,148,139,${0.008 + rand() * 0.018})`
        : `rgba(0,0,0,${0.010 + rand() * 0.022})`;
      const s = 0.3 + rand() * 0.55;
      ctx.fillRect(x, y, s, s);
    }

    // Sparse fatigue marks, low enough that they only appear subconsciously at race zoom.
    for (let i = 0; i < 480; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.6
        ? `rgba(102,94,83,${0.012 + rand() * 0.026})`
        : `rgba(0,0,0,${0.014 + rand() * 0.030})`;
      ctx.fillRect(x, y, 0.8 + rand() * 1.6, 0.4 + rand() * 0.8);
    }

    tex.refresh();
  }

  create() {
    super.create();

    // The inherited material scene painted shoulder dirt using an approximate width.
    // On this track that approximation can place dirt inside the asphalt. Remove it.
    this._materialEdgeWear?.destroy?.();
    this._materialEdgeWear = null;

    try {
      const centerRaw = this.track?.geom?.center || [];
      const defaultTrackW = Number(this.track?.meta?.trackWidth || 160);
      const center = centerRaw
        .map((p) => Array.isArray(p)
          ? { x: Number(p[0]), y: Number(p[1]), width: defaultTrackW }
          : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || defaultTrackW) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      if (center.length < 10) return;

      const g = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._longitudinalAsphaltWear = g;
      const rand = this._rng?.(0x2d934b71) || Math.random;

      for (let i = 3; i < center.length - 3; i += 2) {
        const p = center[i];
        const p0 = center[i - 2];
        const p1 = center[i + 2];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy);
        if (len < 8 || len > 150) continue;

        const tx = dx / len;
        const ty = dy / len;
        const nx = -ty;
        const ny = tx;
        const trackW = Math.max(90, Math.min(250, Number(p.width || defaultTrackW)));
        const half = trackW * 0.5;

        // Longitudinal road-use variation. Soft, sparse and tangent-aligned.
        const strokes = 3 + Math.floor(rand() * 4);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.35, 86);
          const along = (rand() - 0.5) * 24;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const streakLen = 26 + rand() * 62;
          const wobble = (rand() - 0.5) * 0.055;
          const ca = Math.cos(wobble);
          const sa = Math.sin(wobble);
          const ux = tx * ca - ty * sa;
          const uy = tx * sa + ty * ca;
          const dark = rand() > 0.18;
          g.lineStyle(1.4 + rand() * 3.0, dark ? 0x11100f : 0x746a5e,
            dark ? 0.020 + rand() * 0.034 : 0.010 + rand() * 0.018);
          g.beginPath();
          g.moveTo(x - ux * streakLen * 0.5, y - uy * streakLen * 0.5);
          g.lineTo(x + ux * streakLen * 0.5, y + uy * streakLen * 0.5);
          g.strokePath();
        }

        // Two broad, barely-visible usage bands instead of explicit tyre rails.
        if (i % 4 === 0 && rand() > 0.24) {
          const lane = Math.min(27, trackW * 0.17);
          for (const side of [-1, 1]) {
            const jitter = (rand() - 0.5) * 9;
            const x = p.x + nx * (lane * side + jitter);
            const y = p.y + ny * (lane * side + jitter);
            const l = 36 + rand() * 64;
            g.lineStyle(7 + rand() * 5, 0x080707, 0.012 + rand() * 0.020);
            g.beginPath();
            g.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
            g.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
            g.strokePath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
