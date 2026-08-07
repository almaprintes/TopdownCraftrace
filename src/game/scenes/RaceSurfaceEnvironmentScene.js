import { RaceScene as TextureRaceScene } from './RaceSurfaceTextureScene.js';

// Cuarta pasada visual: enriquece el entorno sin tocar geometría ni física.
// Añade césped seco/roto por microfragmentos y una transición sucia junto al asfalto
// construida con sellos independientes para evitar cruces en horquillas.
export class RaceScene extends TextureRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    const size = 768;
    if (this.textures.exists(key)) return;

    const rand = this._rng(0x51b8d3a7);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();

    // Base densa de césped de circuito.
    this._paintRasterBase(ctx, size, [42, 68, 43], 20, rand);

    // Microvegetación continua.
    for (let i = 0; i < 18500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = rand();
      if (r > 0.74) ctx.fillStyle = `rgba(132,148,104,${0.08 + rand() * 0.12})`;
      else if (r > 0.42) ctx.fillStyle = `rgba(18,45,24,${0.08 + rand() * 0.12})`;
      else ctx.fillStyle = `rgba(76,103,65,${0.06 + rand() * 0.10})`;
      const s = 0.8 + rand() * 2.4;
      ctx.fillRect(x, y, s, s);
    }

    ctx.lineCap = 'round';
    for (let i = 0; i < 13800; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI;
      const len = 1.2 + rand() * 3.8;
      ctx.strokeStyle = rand() > 0.54
        ? `rgba(139,153,108,${0.09 + rand() * 0.14})`
        : `rgba(15,40,21,${0.10 + rand() * 0.15})`;
      ctx.lineWidth = rand() > 0.90 ? 1.3 : 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    // ZONAS SECAS: cada zona se forma con muchos fragmentos diminutos.
    // Nunca se dibuja una elipse completa, así que no aparecen parches geométricos.
    for (let z = 0; z < 34; z++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const radius = 22 + rand() * 58;
      const pieces = 95 + Math.floor(rand() * 150);
      for (let j = 0; j < pieces; j++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand()) * radius;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        const p = rand();
        ctx.fillStyle = p > 0.58
          ? `rgba(151,132,76,${0.07 + rand() * 0.12})`
          : `rgba(112,101,59,${0.06 + rand() * 0.10})`;
        const w = 0.8 + rand() * 3.2;
        const h = 0.8 + rand() * 2.5;
        ctx.fillRect(x, y, w, h);
      }
    }

    // ROTOS / CALVAS: pequeños núcleos de tierra marrón mezclados con hierba dañada.
    for (let z = 0; z < 16; z++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const radius = 12 + rand() * 30;
      const pieces = 70 + Math.floor(rand() * 90);
      for (let j = 0; j < pieces; j++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand()) * radius;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        const p = rand();
        ctx.fillStyle = p > 0.68
          ? `rgba(126,99,60,${0.12 + rand() * 0.14})`
          : (p > 0.34
            ? `rgba(86,68,44,${0.11 + rand() * 0.15})`
            : `rgba(55,70,39,${0.08 + rand() * 0.12})`);
        const s = 1 + rand() * 3.5;
        ctx.fillRect(x, y, s, 0.8 + rand() * 2.6);
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

      const g = this.add.graphics().setDepth(10.92).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._environmentEdgeWear = g;

      const rand = this._rng(0xc2b2ae35);
      const n = center.length;

      // Cada muestra coloca fragmentos independientes junto a ambos bordes.
      // No unimos puntos, por lo que una horquilla nunca puede generar pinchos/cruces.
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
          // 1) Suciedad oscura pegada al asfalto.
          const edgeJitter = (rand() - 0.5) * 6;
          const near = half + 2 + rand() * 7 + edgeJitter;
          const x0 = p.x + nx * near * side;
          const y0 = p.y + ny * near * side;
          g.fillStyle(0x4a4030, 0.055 + rand() * 0.06);
          g.fillCircle(x0, y0, 2.2 + rand() * 4.5);

          // 2) Tierra más clara algo más afuera: transición asfalto -> suciedad -> hierba.
          if (rand() > 0.28) {
            const out = half + 8 + rand() * 15;
            const x1 = p.x + nx * out * side + (rand() - 0.5) * 5;
            const y1 = p.y + ny * out * side + (rand() - 0.5) * 5;
            g.fillStyle(rand() > 0.5 ? 0x756247 : 0x65533b, 0.045 + rand() * 0.055);
            g.fillCircle(x1, y1, 1.5 + rand() * 4.2);
          }

          // 3) Césped estresado/seco justo después de la tierra.
          if (rand() > 0.40) {
            const out = half + 15 + rand() * 22;
            const x2 = p.x + nx * out * side + (rand() - 0.5) * 7;
            const y2 = p.y + ny * out * side + (rand() - 0.5) * 7;
            g.fillStyle(rand() > 0.48 ? 0x756c3d : 0x5f6338, 0.025 + rand() * 0.04);
            g.fillCircle(x2, y2, 1.2 + rand() * 3.8);
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Environment edge wear failed', err);
    }
  }
}
