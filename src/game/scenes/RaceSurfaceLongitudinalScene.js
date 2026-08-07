import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Premium semi-realistic surface pass.
// Goal: matte warm asphalt, longitudinal wear and an organic road-to-soil transition.
// Physics, track, cameras, HUD and gameplay stay untouched.
export class RaceScene extends MaterialRaceScene {
  ensureAsphaltTexture() {
    const key = 'asphalt';
    if (this.textures.exists(key)) return;

    const source = this.textures.get('asphaltMaterialRef')?.getSourceImage?.();
    if (!source) return super.ensureAsphaltTexture();

    const size = 512;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;

    // Keep real material information but suppress the cold/metallic appearance.
    ctx.drawImage(source, 0, 0, size, size);
    ctx.fillStyle = 'rgba(34,31,29,0.34)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(10,11,11,0.16)';
    ctx.fillRect(0, 0, size, size);

    const rand = this._rng?.(0x6f41a2d9) || Math.random;

    // Fine aggregate only. No large bright grains that read as metal or gravel.
    for (let i = 0; i < 10500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const light = rand() > 0.78;
      ctx.fillStyle = light
        ? `rgba(176,169,158,${0.010 + rand() * 0.020})`
        : `rgba(0,0,0,${0.014 + rand() * 0.026})`;
      const s = 0.35 + rand() * 0.85;
      ctx.fillRect(x, y, s, s);
    }

    // Broad dirty tonal clouds break obvious tiling without creating stripes.
    for (let i = 0; i < 34; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = 24 + rand() * 70;
      const ry = 10 + rand() * 30;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rx);
      const warm = rand() > 0.5;
      grad.addColorStop(0, warm ? 'rgba(78,65,52,0.030)' : 'rgba(0,0,0,0.032)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      ctx.translate(-x, -y);
      ctx.fillStyle = grad;
      ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      ctx.restore();
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

        // Sparse, low-contrast longitudinal dirt/rubber variation.
        const strokes = 5 + Math.floor(rand() * 5);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.5, 94);
          const along = (rand() - 0.5) * 24;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const streakLen = 18 + rand() * 48;
          const wobble = (rand() - 0.5) * 0.07;
          const ca = Math.cos(wobble);
          const sa = Math.sin(wobble);
          const ux = tx * ca - ty * sa;
          const uy = tx * sa + ty * ca;
          const dark = rand() > 0.24;
          const color = dark ? 0x11100f : 0x756c60;
          const alpha = dark ? 0.025 + rand() * 0.040 : 0.014 + rand() * 0.022;
          const width = 1.0 + rand() * 2.2;

          g.lineStyle(width, color, alpha);
          g.beginPath();
          g.moveTo(x - ux * streakLen * 0.5, y - uy * streakLen * 0.5);
          g.lineTo(x + ux * streakLen * 0.5, y + uy * streakLen * 0.5);
          g.strokePath();
        }

        // Diffuse wheel-use zones: irregular, discontinuous, never decorative rails.
        if (i % 3 === 0 && rand() > 0.18) {
          const lane = Math.min(27, trackW * 0.17);
          for (const side of [-1, 1]) {
            const jitter = (rand() - 0.5) * 7;
            const x = p.x + nx * (lane * side + jitter);
            const y = p.y + ny * (lane * side + jitter);
            const l = 28 + rand() * 50;
            g.lineStyle(5 + rand() * 4, 0x070707, 0.018 + rand() * 0.030);
            g.beginPath();
            g.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
            g.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
            g.strokePath();
          }
        }

        // Organic shoulder: compact soil directly outside the asphalt, fading into grass.
        // Independent flecks avoid a perfectly clean vector-cut edge.
        for (const side of [-1, 1]) {
          const edgeBase = half + 1;
          const patches = 9 + Math.floor(rand() * 7);
          for (let k = 0; k < patches; k++) {
            const out = edgeBase + rand() * (10 + rand() * 9);
            const along = (rand() - 0.5) * 30;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const soil = rand();
            const color = soil > 0.66 ? 0x756047 : soil > 0.30 ? 0x554434 : 0x3f372d;
            g.fillStyle(color, 0.055 + rand() * 0.095);
            const w = 1.2 + rand() * 4.8;
            const h = 0.8 + rand() * 3.2;
            g.fillEllipse(x, y, w, h);
          }

          // A few dry fragments farther out merge soil into turf.
          for (let k = 0; k < 5; k++) {
            const out = edgeBase + 10 + rand() * 24;
            const along = (rand() - 0.5) * 34;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const a = Math.atan2(ty, tx) + (rand() - 0.5) * 2.6;
            const l = 1.2 + rand() * 3.8;
            g.lineStyle(0.6 + rand() * 0.8, rand() > 0.5 ? 0x8c784d : 0x67583c, 0.05 + rand() * 0.08);
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
