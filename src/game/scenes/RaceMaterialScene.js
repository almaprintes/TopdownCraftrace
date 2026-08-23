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

    // Más resolución de material sin aumentar GameObjects ni draw calls.
    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, size, size);

    const rand = this._rng?.(0x6f1d4c3a) || Math.random;
    const wrapSpot = (x, y, r, color) => {
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    };

    // Variación de vegetación a gran escala: manchas húmedas/secas muy suaves.
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 34; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 70 + rand() * 180;
      const dry = rand() > 0.70;
      wrapSpot(
        x, y, r,
        dry
          ? `rgba(150,121,58,${0.025 + rand() * 0.035})`
          : `rgba(8,38,14,${0.025 + rand() * 0.04})`
      );
    }

    // Hojas/fibras finas y pequeñas zonas de tierra.
    for (let i = 0; i < 7600; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const dry = rand() > 0.77;
      ctx.strokeStyle = dry
        ? `rgba(179,151,79,${0.025 + rand() * 0.055})`
        : `rgba(10,48,16,${0.020 + rand() * 0.045})`;
      ctx.lineWidth = 0.45 + rand() * 0.85;
      const a = rand() * Math.PI * 2;
      const l = 1.0 + rand() * 4.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    for (let i = 0; i < 850; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.5
        ? `rgba(83,66,38,${0.025 + rand() * 0.045})`
        : `rgba(198,176,104,${0.012 + rand() * 0.028})`;
      const w = 0.6 + rand() * 2.2;
      ctx.fillRect(x, y, w, 0.5 + rand() * 1.8);
    }

    tex.refresh();
  }

  ensureAsphaltTexture() {
    const key = 'asphalt';
    if (this.textures.exists(key)) return;
    const source = this.textures.get('asphaltMaterialRef')?.getSourceImage?.();
    if (!source) return super.ensureAsphaltTexture();

    const size = 1024;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, size, size);

    const rand = this._rng?.(0x91b35d27) || Math.random;
    const wrapSpot = (x, y, r, color) => {
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    };

    // Cambios tonales amplios para romper el aspecto plano del asfalto.
    for (let i = 0; i < 28; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 80 + rand() * 210;
      const light = rand() > 0.58;
      wrapSpot(
        x, y, r,
        light
          ? `rgba(210,205,192,${0.010 + rand() * 0.018})`
          : `rgba(0,0,0,${0.018 + rand() * 0.028})`
      );
    }

    // Árido fino, pequeñas picaduras y grano irregular.
    for (let i = 0; i < 8200; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const light = rand() > 0.53;
      ctx.fillStyle = light
        ? `rgba(218,214,202,${0.012 + rand() * 0.030})`
        : `rgba(0,0,0,${0.016 + rand() * 0.035})`;
      const s = 0.35 + rand() * 1.65;
      ctx.fillRect(x, y, s, 0.35 + rand() * 1.35);
    }

    // Goma/rodadura sutil. Se hornea en la textura y no añade coste por frame.
    ctx.lineCap = 'round';
    for (let i = 0; i < 42; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 55 + rand() * 210;
      const a = (rand() - 0.5) * 0.34;
      ctx.strokeStyle = `rgba(4,4,4,${0.018 + rand() * 0.030})`;
      ctx.lineWidth = 1.4 + rand() * 3.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    // Fisuras/minúsculas juntas, muy discretas para evitar aspecto artificial.
    for (let i = 0; i < 120; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI * 2;
      const l = 5 + rand() * 24;
      ctx.strokeStyle = `rgba(8,8,8,${0.025 + rand() * 0.035})`;
      ctx.lineWidth = 0.45 + rand() * 0.65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
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
