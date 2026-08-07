import { RaceScene as MaterialBlendRaceScene } from './RaceSurfaceMaterialBlendScene.js';

// Paso 1 de reconstrucción visual:
// - asfalto base neutro/isotrópico
// - desgaste/vetas longitudinales orientadas por la tangente real de la pista
// Mantiene intactos física, trazado, cámaras, HUD y gameplay.
export class RaceScene extends MaterialBlendRaceScene {
  ensureAsphaltTexture() {
    const key = 'asphalt';
    const size = 768;
    if (this.textures.exists(key)) return;

    const rand = this._rng(0x6f41a2d9);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();

    // Base más oscura/fría y sin dirección dominante.
    this._paintRasterBase(ctx, size, [35, 38, 40], 17, rand);

    // Árido fino isotrópico: detalle sin sugerir una dirección falsa.
    for (let i = 0; i < 52000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const p = rand();
      if (p > 0.78) ctx.fillStyle = `rgba(118,121,123,${0.055 + rand() * 0.07})`;
      else if (p > 0.42) ctx.fillStyle = `rgba(65,68,70,${0.06 + rand() * 0.075})`;
      else ctx.fillStyle = `rgba(12,14,15,${0.055 + rand() * 0.075})`;
      const s = 0.45 + rand() * 1.35;
      ctx.fillRect(x, y, s, s);
    }

    // Pequeños poros/puntos, igualmente sin orientación.
    for (let i = 0; i < 6500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 0.35 + rand() * 1.0;
      ctx.fillStyle = rand() > 0.5
        ? `rgba(125,126,126,${0.035 + rand() * 0.045})`
        : `rgba(5,6,7,${0.04 + rand() * 0.05})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
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
      const rand = this._rng(0x2d934b71);

      // Cada marca es un segmento independiente y corto, orientado por la tangente local.
      // No hay polilínea continua => no puede atravesar horquillas ni generar pinchos.
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

        // Mayor densidad en la zona central de rodadura, algo de variación lateral.
        const strokes = 6 + Math.floor(rand() * 5);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.35, 88);
          const along = (rand() - 0.5) * 18;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const streakLen = 9 + rand() * 28;
          const wobble = (rand() - 0.5) * 0.14;
          const ca = Math.cos(wobble);
          const sa = Math.sin(wobble);
          const ux = tx * ca - ty * sa;
          const uy = tx * sa + ty * ca;
          const alpha = 0.025 + rand() * 0.055;
          const width = 0.7 + rand() * 1.5;
          const color = rand() > 0.64 ? 0x77797a : 0x0d0f10;

          g.lineStyle(width, color, alpha);
          g.beginPath();
          g.moveTo(x - ux * streakLen * 0.5, y - uy * streakLen * 0.5);
          g.lineTo(x + ux * streakLen * 0.5, y + uy * streakLen * 0.5);
          g.strokePath();
        }

        // Dos carriles ligeramente más oscuros, también en segmentos cortos.
        if (i % 4 === 0) {
          const lane = Math.min(24, trackW * 0.16);
          for (const side of [-1, 1]) {
            const x = p.x + nx * lane * side;
            const y = p.y + ny * lane * side;
            const l = 16 + rand() * 24;
            g.lineStyle(3.2 + rand() * 1.8, 0x080909, 0.018 + rand() * 0.028);
            g.beginPath();
            g.moveTo(x - tx * l * 0.5, y - ty * l * 0.5);
            g.lineTo(x + tx * l * 0.5, y + ty * l * 0.5);
            g.strokePath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Longitudinal asphalt pass failed', err);
    }
  }
}
