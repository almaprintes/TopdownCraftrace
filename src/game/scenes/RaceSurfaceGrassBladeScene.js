import { RaceScene as EnvironmentRaceScene } from './RaceSurfaceEnvironmentScene.js';

// Sexta pasada visual: césped con briznas legibles y borde orgánico de pista.
// Mantiene intactos física, trazado, cámaras, HUD y gameplay.
export class RaceScene extends EnvironmentRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    const size = 768;
    if (this.textures.exists(key)) return;

    const rand = this._rng(0x7f4a9c21);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();

    // Base continua, oscura y natural. Nada de parches geométricos grandes.
    this._paintRasterBase(ctx, size, [39, 64, 39], 18, rand);

    // Grano fino de suelo/vegetación.
    for (let i = 0; i < 26000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = rand();
      if (r > 0.78) ctx.fillStyle = `rgba(126,143,92,${0.10 + rand() * 0.11})`;
      else if (r > 0.42) ctx.fillStyle = `rgba(17,39,20,${0.10 + rand() * 0.12})`;
      else ctx.fillStyle = `rgba(74,96,55,${0.07 + rand() * 0.10})`;
      const s = 0.6 + rand() * 1.7;
      ctx.fillRect(x, y, s, s);
    }

    // Briznas pequeñas y claramente visibles al zoom de carrera.
    // Variamos dirección, longitud, grosor y tono para que no parezca patrón.
    ctx.lineCap = 'round';
    for (let i = 0; i < 30000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI * 2;
      const len = 1.8 + rand() * 4.6;
      const r = rand();
      if (r > 0.78) ctx.strokeStyle = `rgba(152,164,101,${0.15 + rand() * 0.18})`;
      else if (r > 0.42) ctx.strokeStyle = `rgba(79,113,63,${0.15 + rand() * 0.18})`;
      else ctx.strokeStyle = `rgba(18,45,24,${0.17 + rand() * 0.18})`;
      ctx.lineWidth = rand() > 0.90 ? 1.15 : 0.72;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    // Hierba seca dispersa en pequeños grupos. Nunca círculos completos.
    for (let z = 0; z < 46; z++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const radius = 12 + rand() * 34;
      const pieces = 70 + Math.floor(rand() * 100);
      for (let j = 0; j < pieces; j++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.pow(rand(), 0.74) * radius;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        const len = 1.4 + rand() * 4.0;
        const dir = rand() * Math.PI * 2;
        ctx.strokeStyle = rand() > 0.5
          ? `rgba(157,137,77,${0.12 + rand() * 0.16})`
          : `rgba(118,104,61,${0.10 + rand() * 0.15})`;
        ctx.lineWidth = 0.7 + rand() * 0.45;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(dir) * len, y + Math.sin(dir) * len);
        ctx.stroke();
      }
    }

    // Calvas: tierra visible compuesta por granos y briznas rotas, sin blobs.
    for (let z = 0; z < 18; z++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const radius = 10 + rand() * 24;
      const pieces = 90 + Math.floor(rand() * 120);
      for (let j = 0; j < pieces; j++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.pow(rand(), 0.82) * radius;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        const p = rand();
        ctx.fillStyle = p > 0.58
          ? `rgba(125,91,55,${0.16 + rand() * 0.18})`
          : `rgba(79,59,39,${0.14 + rand() * 0.18})`;
        ctx.fillRect(x, y, 0.8 + rand() * 2.3, 0.8 + rand() * 1.8);
      }
    }

    tex.refresh();
  }

  create() {
    super.create();

    // Sustituimos la anterior transición de círculos por microfragmentos.
    try {
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

      const g = this.add.graphics().setDepth(10.93).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._environmentEdgeWear = g;
      const rand = this._rng(0x31d7ab4c);
      const n = center.length;

      for (let i = 3; i < n - 3; i += 2) {
        const p = center[i];
        const p0 = center[i - 2];
        const p1 = center[i + 2];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy);
        if (len < 6 || len > 160) continue;

        const nx = -dy / len;
        const ny = dx / len;
        const tx = dx / len;
        const ty = dy / len;
        const trackW = Math.max(90, Math.min(260, Number(p.width || defaultTrackW)));
        const half = trackW * 0.5;

        for (const side of [-1, 1]) {
          // Franja de tierra oscura inmediata: pequeños granos, no círculos.
          for (let k = 0; k < 7; k++) {
            const out = half + 1 + rand() * 11;
            const along = (rand() - 0.5) * 18;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const col = rand() > 0.52 ? 0x60462f : 0x49382b;
            g.fillStyle(col, 0.10 + rand() * 0.13);
            g.fillRect(x, y, 0.8 + rand() * 2.8, 0.7 + rand() * 2.0);
          }

          // Tierra seca y piedrecitas a media transición.
          for (let k = 0; k < 5; k++) {
            const out = half + 8 + rand() * 20;
            const along = (rand() - 0.5) * 22;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            g.fillStyle(rand() > 0.5 ? 0x866a43 : 0x72583a, 0.08 + rand() * 0.11);
            g.fillRect(x, y, 0.8 + rand() * 2.5, 0.8 + rand() * 1.8);
          }

          // Briznas secas orientadas de forma irregular tras la tierra.
          for (let k = 0; k < 5; k++) {
            const out = half + 18 + rand() * 30;
            const along = (rand() - 0.5) * 24;
            const x = p.x + nx * out * side + tx * along;
            const y = p.y + ny * out * side + ty * along;
            const a = Math.atan2(ty, tx) + (rand() - 0.5) * 2.2;
            const l = 1.5 + rand() * 4.5;
            g.lineStyle(0.8 + rand() * 0.6, rand() > 0.5 ? 0x9c884f : 0x77713d, 0.09 + rand() * 0.12);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            g.strokePath();
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Grass blade edge pass failed', err);
    }
  }
}
