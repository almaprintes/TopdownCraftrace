import { RaceScene as BaseRaceScene } from './RaceSurfaceRefineScene.js';
import { GRASS_MATERIAL, ASPHALT_MATERIAL } from '../data/surfaceMaterials.js';

// Material pass: reference-derived seamless materials + contextual edge decals.
// Keeps physics, track geometry, cameras, HUD, checkpoints, minimap and controls intact.
export class RaceScene extends BaseRaceScene {
  preload() {
    super.preload?.();
    if (!this.textures.exists('grassMaterialRef')) this.load.image('grassMaterialRef', GRASS_MATERIAL);
    if (!this.textures.exists('asphaltMaterialRef')) this.load.image('asphaltMaterialRef', ASPHALT_MATERIAL);
  }

  ensureBgTexture() {
    const key = 'grass';
    if (this.textures.exists(key)) return;
    const source = this.textures.get('grassMaterialRef')?.getSourceImage?.();
    if (!source) return super.ensureBgTexture();

    const size = 512;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, 0, 0, size, size);

    // Break tiling symmetry with very subtle color variation only.
    const rand = this._rng?.(0x6f1d4c3a) || Math.random;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 2600; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const dry = rand() > 0.74;
      ctx.strokeStyle = dry
        ? `rgba(150,128,72,${0.025 + rand() * 0.045})`
        : `rgba(16,37,18,${0.018 + rand() * 0.035})`;
      ctx.lineWidth = 0.5 + rand() * 0.7;
      const a = rand() * Math.PI * 2;
      const l = 1.2 + rand() * 3.0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    tex.refresh();
  }

  ensureAsphaltTexture() {
    const key = 'asphalt';
    if (this.textures.exists(key)) return;
    const source = this.textures.get('asphaltMaterialRef')?.getSourceImage?.();
    if (!source) return super.ensureAsphaltTexture();

    const size = 512;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, 0, 0, size, size);

    // Add only tiny aggregate variation; the material already carries the main detail.
    const rand = this._rng?.(0x91b35d27) || Math.random;
    for (let i = 0; i < 2500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const light = rand() > 0.55;
      ctx.fillStyle = light
        ? `rgba(210,210,205,${0.012 + rand() * 0.025})`
        : `rgba(0,0,0,${0.014 + rand() * 0.028})`;
      const s = 0.5 + rand() * 1.6;
      ctx.fillRect(x, y, s, s);
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
      if (center.length < 12) return;

      const g = this.add.graphics().setDepth(10.94).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._materialEdgeWear = g;
      const rand = this._rng?.(0xb8c4e11d) || Math.random;

      // Contextual dirt shoulder. Independent marks only: no continuous offset polylines.
      for (let i = 3; i < center.length - 3; i += 2) {
        const p = center[i];
        const p0 = center[i - 2];
        const p1 = center[i + 2];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy);
        if (len < 6 || len > 160) continue;

        const tx = dx / len;
        const ty = dy / len;
        const nx = -ty;
        const ny = tx;
        const half = Math.max(45, Math.min(130, Number(p.width || defaultTrackW) * 0.5));

        for (const side of [-1, 1]) {
          // Compact dirt nearest asphalt.
          for (let k = 0; k < 10; k++) {
            const out = half + 1 + rand() * 12;
            const along = (rand() - 0.5) * 20;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            g.fillStyle(rand() > 0.52 ? 0x5f4a36 : 0x47382d, 0.08 + rand() * 0.11);
            g.fillRect(x, y, 0.8 + rand() * 2.8, 0.7 + rand() * 2.0);
          }

          // Worn dry grass after the dirt band.
          for (let k = 0; k < 7; k++) {
            const out = half + 11 + rand() * 26;
            const along = (rand() - 0.5) * 24;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const a = Math.atan2(ty, tx) + (rand() - 0.5) * 2.4;
            const l = 1.5 + rand() * 4.5;
            g.lineStyle(0.7 + rand() * 0.7, rand() > 0.52 ? 0x9b824a : 0x73633d, 0.07 + rand() * 0.10);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            g.strokePath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Material edge wear failed', err);
    }
  }
}
