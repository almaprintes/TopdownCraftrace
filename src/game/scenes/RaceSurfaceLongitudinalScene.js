import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// Replaces visibly tiled reference materials with procedural, non-directional terrain.
// Physics, track, cameras, HUD and gameplay stay untouched.
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

    // Large, extremely soft tone drift. No squares or mowing stripes.
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

    // Dense micro vegetation. Tiny enough to survive race zoom without looking like rope.
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

    // Small bare/dry speckles, intentionally irregular and sparse.
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

    // Warm charcoal base: deliberately matte and neutral.
    ctx.fillStyle = '#343230';
    ctx.fillRect(0, 0, size, size);

    // Very broad grime/value drift. Removes the synthetic flat fill without obvious motifs.
    for (let i = 0; i < 90; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 35 + rand() * 145;
      const warm = rand() > 0.55;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, warm
        ? `rgba(88,74,60,${0.018 + rand() * 0.035})`
        : `rgba(0,0,0,${0.020 + rand() * 0.045})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }

    // Fine aggregate. No repeated pebbles, no shiny highlights.
    for (let i = 0; i < 43000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const light = rand() > 0.80;
      ctx.fillStyle = light
        ? `rgba(145,139,130,${0.016 + rand() * 0.035})`
        : `rgba(4,4,4,${0.018 + rand() * 0.040})`;
      const s = 0.35 + rand() * 0.8;
      ctx.fillRect(x, y, s, s);
    }

    // Tiny repair/fatigue freckles, never long decorative lines.
    for (let i = 0; i < 1300; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.6
        ? `rgba(102,94,83,${0.020 + rand() * 0.04})`
        : `rgba(0,0,0,${0.020 + rand() * 0.05})`;
      ctx.fillRect(x, y, 1 + rand() * 2.2, 0.5 + rand() * 1.2);
    }

    tex.refresh();
  }

  create() {
    super.create();

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

        // Subtle longitudinal usage, aligned to the actual tangent of the road.
        const strokes = 4 + Math.floor(rand() * 5);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.45, 92);
          const along = (rand() - 0.5) * 24;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const streakLen = 20 + rand() * 52;
          const wobble = (rand() - 0.5) * 0.06;
          const ca = Math.cos(wobble);
          const sa = Math.sin(wobble);
          const ux = tx * ca - ty * sa;
          const uy = tx * sa + ty * ca;
          const dark = rand() > 0.20;
          g.lineStyle(1.2 + rand() * 2.8, dark ? 0x11100f : 0x756b5e,
            dark ? 0.028 + rand() * 0.045 : 0.015 + rand() * 0.025);
          g.beginPath();
          g.moveTo(x - ux * streakLen * 0.5, y - uy * streakLen * 0.5);
          g.lineTo(x + ux * streakLen * 0.5, y + uy * streakLen * 0.5);
          g.strokePath();
        }

        // Diffuse tyre-use zones.
        if (i % 3 === 0 && rand() > 0.15) {
          const lane = Math.min(27, trackW * 0.17);
          for (const side of [-1, 1]) {
            const jitter = (rand() - 0.5) * 8;
            const x = p.x + nx * (lane * side + jitter);
            const y = p.y + ny * (lane * side + jitter);
            const l = 30 + rand() * 54;
            g.lineStyle(6 + rand() * 4, 0x080707, 0.020 + rand() * 0.034);
            g.beginPath();
            g.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
            g.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
            g.strokePath();
          }
        }

        // Much clearer soil shoulder. It remains irregular so the track edge stops looking cut out.
        for (const side of [-1, 1]) {
          const edgeBase = half - 1;
          const patches = 15 + Math.floor(rand() * 10);
          for (let k = 0; k < patches; k++) {
            const out = edgeBase + rand() * 22;
            const along = (rand() - 0.5) * 36;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const soil = rand();
            const color = soil > 0.68 ? 0x80694d : soil > 0.32 ? 0x5c4835 : 0x44382c;
            g.fillStyle(color, 0.11 + rand() * 0.13);
            g.fillEllipse(x, y, 2.5 + rand() * 7.5, 1.4 + rand() * 4.6);
          }

          for (let k = 0; k < 8; k++) {
            const out = edgeBase + 15 + rand() * 28;
            const along = (rand() - 0.5) * 40;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const a = Math.atan2(ty, tx) + (rand() - 0.5) * 2.7;
            const l = 1.5 + rand() * 4.5;
            g.lineStyle(0.8 + rand() * 0.9, rand() > 0.5 ? 0x9b8050 : 0x6f5d3f, 0.08 + rand() * 0.10);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            g.strokePath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Premium surface pass failed', err);
    }
  }
}
