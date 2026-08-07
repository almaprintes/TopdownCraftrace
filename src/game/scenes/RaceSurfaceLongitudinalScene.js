import { RaceScene as MaterialRaceScene } from './RaceMaterialScene.js';

// Paso 1 de reconstrucción visual:
// - conserva los materiales de referencia aprobados
// - neutraliza la dirección falsa del asfalto con una base más oscura
// - añade vetas longitudinales orientadas por la tangente real de la pista
// Mantiene intactos física, trazado, cámaras, HUD y gameplay.
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

    // Partimos de la textura real de referencia, pero la convertimos en una base
    // más neutra para que ninguna dirección transversal domine visualmente.
    ctx.drawImage(source, 0, 0, size, size);
    ctx.fillStyle = 'rgba(13,16,18,0.24)';
    ctx.fillRect(0, 0, size, size);

    const rand = this._rng?.(0x6f41a2d9) || Math.random;

    // Árido fino isotrópico: conserva detalle sin sugerir una dirección falsa.
    for (let i = 0; i < 18000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const p = rand();
      ctx.fillStyle = p > 0.72
        ? `rgba(185,186,184,${0.018 + rand() * 0.028})`
        : `rgba(0,0,0,${0.018 + rand() * 0.030})`;
      const s = 0.45 + rand() * 1.25;
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

      if (center.length < 10) return;

      const g = this.add.graphics().setDepth(11.08).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._longitudinalAsphaltWear = g;
      const rand = this._rng?.(0x2d934b71) || Math.random;

      // Cada marca es un segmento independiente, orientado por la tangente local.
      // No se unen segmentos: evita cruces/pinchos en horquillas.
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

        // Vetas finas longitudinales repartidas por todo el ancho útil.
        const strokes = 8 + Math.floor(rand() * 6);
        for (let k = 0; k < strokes; k++) {
          const laneBias = (rand() - 0.5) * Math.min(half * 1.55, 96);
          const along = (rand() - 0.5) * 20;
          const x = p.x + nx * laneBias + tx * along;
          const y = p.y + ny * laneBias + ty * along;
          const streakLen = 12 + rand() * 34;
          const wobble = (rand() - 0.5) * 0.10;
          const ca = Math.cos(wobble);
          const sa = Math.sin(wobble);
          const ux = tx * ca - ty * sa;
          const uy = tx * sa + ty * ca;
          const alpha = 0.035 + rand() * 0.075;
          const width = 0.75 + rand() * 1.35;
          const color = rand() > 0.68 ? 0x8a8b89 : 0x090b0c;

          g.lineStyle(width, color, alpha);
          g.beginPath();
          g.moveTo(x - ux * streakLen * 0.5, y - uy * streakLen * 0.5);
          g.lineTo(x + ux * streakLen * 0.5, y + uy * streakLen * 0.5);
          g.strokePath();
        }

        // Dos zonas de rodadura oscuras, también longitudinales y discontinuas.
        if (i % 3 === 0) {
          const lane = Math.min(25, trackW * 0.16);
          for (const side of [-1, 1]) {
            const x = p.x + nx * lane * side;
            const y = p.y + ny * lane * side;
            const l = 22 + rand() * 34;
            g.lineStyle(4.0 + rand() * 2.0, 0x050607, 0.026 + rand() * 0.040);
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
