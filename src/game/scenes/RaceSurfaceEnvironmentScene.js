import { RaceScene as TextureRaceScene } from './RaceSurfaceTextureScene.js';

// Quinta pasada visual: desgaste del entorno claramente legible en móvil.
// Mantiene física/geometría intactas y evita trazos continuos en los bordes.
export class RaceScene extends TextureRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    const size = 768;
    if (this.textures.exists(key)) return;

    const rand = this._rng(0x51b8d3a7);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();

    // Base densa de césped de circuito.
    this._paintRasterBase(ctx, size, [41, 67, 42], 20, rand);

    // Microvegetación continua.
    for (let i = 0; i < 19000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = rand();
      if (r > 0.74) ctx.fillStyle = `rgba(132,148,104,${0.09 + rand() * 0.13})`;
      else if (r > 0.42) ctx.fillStyle = `rgba(18,45,24,${0.09 + rand() * 0.13})`;
      else ctx.fillStyle = `rgba(76,103,65,${0.07 + rand() * 0.11})`;
      const s = 0.8 + rand() * 2.5;
      ctx.fillRect(x, y, s, s);
    }

    ctx.lineCap = 'round';
    for (let i = 0; i < 14200; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI;
      const len = 1.2 + rand() * 3.9;
      ctx.strokeStyle = rand() > 0.54
        ? `rgba(139,153,108,${0.10 + rand() * 0.15})`
        : `rgba(15,40,21,${0.11 + rand() * 0.16})`;
      ctx.lineWidth = rand() > 0.90 ? 1.3 : 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    // ZONAS SECAS claramente visibles: miles de fragmentos diminutos agrupados.
    for (let z = 0; z < 30; z++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const radius = 28 + rand() * 72;
      const pieces = 210 + Math.floor(rand() * 220);
      for (let j = 0; j < pieces; j++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.pow(rand(), 0.62) * radius;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        const p = rand();
        ctx.fillStyle = p > 0.62
          ? `rgba(174,149,82,${0.12 + rand() * 0.17})`
          : (p > 0.30
            ? `rgba(131,111,61,${0.11 + rand() * 0.15})`
            : `rgba(92,93,51,${0.08 + rand() * 0.12})`);
        const w = 1 + rand() * 4.2;
        const h = 0.8 + rand() * 3.0;
        ctx.fillRect(x, y, w, h);
      }
    }

    // ROTOS / CALVAS con tierra marrón visible y bordes mezclados con hierba seca.
    for (let z = 0; z < 22; z++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const radius = 17 + rand() * 42;
      const pieces = 150 + Math.floor(rand() * 160);
      for (let j = 0; j < pieces; j++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.pow(rand(), 0.72) * radius;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        const edge = rr / radius;
        const p = rand();

        if (edge < 0.48 && p > 0.18) {
          ctx.fillStyle = p > 0.62
            ? `rgba(137,98,57,${0.22 + rand() * 0.20})`
            : `rgba(91,65,41,${0.20 + rand() * 0.19})`;
        } else {
          ctx.fillStyle = p > 0.50
            ? `rgba(145,124,69,${0.12 + rand() * 0.16})`
            : `rgba(66,76,43,${0.09 + rand() * 0.13})`;
        }

        const s = 1.1 + rand() * 4.6;
        ctx.fillRect(x, y, s, 0.9 + rand() * 3.4);
      }
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

      const g = this.add.graphics().setDepth(10.93).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._environmentEdgeWear = g;

      const rand = this._rng(0xc2b2ae35);
      const n = center.length;

      // Sellos independientes: transición ancha y sucia sin líneas que puedan cruzarse.
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
        const trackW = Math.max(90, Math.min(260, Number(p.width || defaultTrackW)));
        const half = trackW * 0.5;

        for (const side of [-1, 1]) {
          // 1) Franja oscura de tierra y goma pegada al asfalto.
          for (let s = 0; s < 2; s++) {
            const near = half + 1 + rand() * 8;
            const x0 = p.x + nx * near * side + (rand() - 0.5) * 5;
            const y0 = p.y + ny * near * side + (rand() - 0.5) * 5;
            g.fillStyle(rand() > 0.5 ? 0x493b2c : 0x5a4934, 0.13 + rand() * 0.11);
            g.fillCircle(x0, y0, 3.5 + rand() * 5.8);
          }

          // 2) Tierra marrón intermedia visible.
          if (rand() > 0.10) {
            for (let s = 0; s < 2; s++) {
              const out = half + 8 + rand() * 18;
              const x1 = p.x + nx * out * side + (rand() - 0.5) * 7;
              const y1 = p.y + ny * out * side + (rand() - 0.5) * 7;
              g.fillStyle(rand() > 0.5 ? 0x7e6748 : 0x69533a, 0.10 + rand() * 0.10);
              g.fillCircle(x1, y1, 2.8 + rand() * 5.0);
            }
          }

          // 3) Césped estresado/seco tras la tierra.
          if (rand() > 0.16) {
            const out = half + 19 + rand() * 27;
            const x2 = p.x + nx * out * side + (rand() - 0.5) * 10;
            const y2 = p.y + ny * out * side + (rand() - 0.5) * 10;
            g.fillStyle(rand() > 0.50 ? 0x8a7a43 : 0x6f6a39, 0.07 + rand() * 0.08);
            g.fillCircle(x2, y2, 2.5 + rand() * 5.2);
          }

          // 4) Alguna calva rota más profunda junto al borde, no en todos los puntos.
          if (rand() > 0.86) {
            const out = half + 11 + rand() * 20;
            const x3 = p.x + nx * out * side + (rand() - 0.5) * 12;
            const y3 = p.y + ny * out * side + (rand() - 0.5) * 12;
            g.fillStyle(rand() > 0.5 ? 0x6d4b31 : 0x845d38, 0.18 + rand() * 0.12);
            g.fillCircle(x3, y3, 4.0 + rand() * 7.0);
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Environment edge wear failed', err);
    }
  }
}
