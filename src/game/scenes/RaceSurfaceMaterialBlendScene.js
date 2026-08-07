import { RaceScene as GrassBladeRaceScene } from './RaceSurfaceGrassBladeScene.js';

// Reconstrucción del material del suelo: base de césped de alta frecuencia
// + transición contextual de tierra/hierba castigada junto al asfalto.
// No modifica física, trazado, cámaras, HUD ni gameplay.
export class RaceScene extends GrassBladeRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    const size = 768;
    if (this.textures.exists(key)) return;

    const rand = this._rng(0x18f4c7b1);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();

    // Fondo oscuro con ruido fino, pensado para que se vea suelo entre briznas.
    this._paintRasterBase(ctx, size, [34, 57, 31], 14, rand);

    // Moteado microscópico de tierra vegetal.
    for (let i = 0; i < 42000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const p = rand();
      ctx.fillStyle = p > 0.72
        ? `rgba(112,103,64,${0.06 + rand() * 0.09})`
        : (p > 0.35
          ? `rgba(63,84,47,${0.07 + rand() * 0.10})`
          : `rgba(18,34,18,${0.08 + rand() * 0.10})`);
      const s = 0.45 + rand() * 1.2;
      ctx.fillRect(x, y, s, s);
    }

    // Briznas: muchas, cortas, finas y con orientación irregular.
    ctx.lineCap = 'round';
    for (let i = 0; i < 62000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI * 2;
      const len = 2.0 + rand() * 5.8;
      const p = rand();
      if (p > 0.83) ctx.strokeStyle = `rgba(153,159,87,${0.22 + rand() * 0.20})`;
      else if (p > 0.52) ctx.strokeStyle = `rgba(92,126,55,${0.20 + rand() * 0.20})`;
      else if (p > 0.20) ctx.strokeStyle = `rgba(55,94,43,${0.20 + rand() * 0.19})`;
      else ctx.strokeStyle = `rgba(19,49,24,${0.22 + rand() * 0.18})`;
      ctx.lineWidth = rand() > 0.94 ? 1.15 : (0.55 + rand() * 0.38);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    // Algunos tallos secos dispersos, sin formar manchas circulares.
    for (let i = 0; i < 9000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI * 2;
      const len = 1.8 + rand() * 4.8;
      ctx.strokeStyle = rand() > 0.5
        ? `rgba(154,126,69,${0.10 + rand() * 0.15})`
        : `rgba(112,94,54,${0.08 + rand() * 0.13})`;
      ctx.lineWidth = 0.55 + rand() * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    tex.refresh();
  }

  create() {
    super.create();

    try {
      // Quitamos la anterior decoración de borde para no acumular parches.
      this._environmentEdgeWear?.destroy?.();
      this._environmentEdgeWear = null;

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
      this._environmentEdgeWear = g;
      const rand = this._rng(0xb5297a4d);

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
          // Banda inmediata de suelo oscuro/compactado.
          for (let k = 0; k < 12; k++) {
            const out = half + 1 + rand() * 10;
            const along = (rand() - 0.5) * 24;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const q = rand();
            g.fillStyle(q > 0.66 ? 0x6c5236 : (q > 0.32 ? 0x493a2c : 0x302b25), 0.13 + rand() * 0.16);
            g.fillRect(x, y, 0.7 + rand() * 2.6, 0.6 + rand() * 1.8);
          }

          // Zona intermedia: tierra + grava clara.
          for (let k = 0; k < 9; k++) {
            const out = half + 8 + rand() * 20;
            const along = (rand() - 0.5) * 28;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const q = rand();
            g.fillStyle(q > 0.72 ? 0xa58b62 : (q > 0.38 ? 0x806545 : 0x5d4935), 0.10 + rand() * 0.14);
            g.fillRect(x, y, 0.7 + rand() * 2.5, 0.7 + rand() * 2.0);
          }

          // Hierba castigada: pequeñas briznas secas y verdes, no blobs.
          for (let k = 0; k < 12; k++) {
            const out = half + 18 + rand() * 34;
            const along = (rand() - 0.5) * 30;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const a = Math.atan2(ty, tx) + (rand() - 0.5) * 2.5;
            const l = 2 + rand() * 5;
            const col = rand() > 0.55 ? 0x9a824d : (rand() > 0.5 ? 0x697641 : 0x465f37);
            g.lineStyle(0.7 + rand() * 0.55, col, 0.12 + rand() * 0.15);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            g.strokePath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Material blend edge pass failed', err);
    }
  }
}
