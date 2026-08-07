import { RaceScene as RefinedRaceScene } from './RaceSurfaceRefineScene.js';

// Tercera pasada de superficies: texturas raster densas, no manchas vectoriales.
// Conserva física, geometría, HUD, cámaras, meta, CP, minimapa y marcas de frenada.
export class RaceScene extends RefinedRaceScene {
  _rng(seed = 0x6d2b79f5) {
    let s = seed >>> 0;
    return () => {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  _paintRasterBase(ctx, size, base, spread, rand) {
    const img = ctx.createImageData(size, size);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      // Dos escalas de ruido mezcladas: grano fino + variación suave.
      const x = (i >> 2) % size;
      const y = Math.floor((i >> 2) / size);
      const fine = (rand() - 0.5) * spread;
      const wave = Math.sin(x * 0.047) * 2.2 + Math.cos(y * 0.039) * 2.0 + Math.sin((x + y) * 0.018) * 1.8;
      data[i] = Math.max(0, Math.min(255, base[0] + fine + wave));
      data[i + 1] = Math.max(0, Math.min(255, base[1] + fine + wave));
      data[i + 2] = Math.max(0, Math.min(255, base[2] + fine + wave));
      data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  ensureBgTexture() {
    const key = 'grass';
    const size = 768;
    if (this.textures.exists(key)) return;

    const rand = this._rng(0x47a91c3d);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();

    // Césped oscuro de circuito: continuo y con ruido fino en cada píxel.
    this._paintRasterBase(ctx, size, [43, 69, 45], 21, rand);

    // Moteado de vegetación a escala pequeña. Nada supera ~12 px.
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 16500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const light = rand();
      if (light > 0.72) ctx.fillStyle = `rgba(125,142,105,${0.08 + rand() * 0.12})`;
      else if (light > 0.38) ctx.fillStyle = `rgba(22,48,27,${0.08 + rand() * 0.11})`;
      else ctx.fillStyle = `rgba(82,105,70,${0.06 + rand() * 0.10})`;
      const w = 1 + Math.floor(rand() * 4);
      const h = 1 + Math.floor(rand() * 4);
      ctx.fillRect(x, y, w, h);
    }

    // Briznas cortas, aleatorias y densas; crean lectura de hierba al zoom real.
    ctx.lineCap = 'round';
    for (let i = 0; i < 12500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI;
      const len = 1.3 + rand() * 3.4;
      ctx.strokeStyle = rand() > 0.5
        ? `rgba(145,157,116,${0.10 + rand() * 0.14})`
        : `rgba(17,43,23,${0.11 + rand() * 0.14})`;
      ctx.lineWidth = rand() > 0.88 ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    // Pequeños restos secos: escala mínima para evitar parches geométricos.
    for (let i = 0; i < 2400; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = `rgba(145,126,78,${0.05 + rand() * 0.08})`;
      ctx.fillRect(x, y, 1 + rand() * 2.2, 1 + rand() * 2.2);
    }

    tex.refresh();
  }

  ensureOffTexture() {
    const key = 'off';
    const size = 768;
    if (this.textures.exists(key)) return;

    const rand = this._rng(0x9e3779b9);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();

    // Tierra/grava compactada con ruido en cada píxel.
    this._paintRasterBase(ctx, size, [99, 89, 68], 25, rand);

    // Grano terroso medio.
    for (let i = 0; i < 19000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = rand();
      if (r > 0.72) ctx.fillStyle = `rgba(190,174,139,${0.11 + rand() * 0.15})`;
      else if (r > 0.38) ctx.fillStyle = `rgba(48,46,39,${0.10 + rand() * 0.14})`;
      else ctx.fillStyle = `rgba(126,113,84,${0.08 + rand() * 0.13})`;
      const s = r > 0.94 ? 3 : (r > 0.78 ? 2 : 1);
      ctx.fillRect(x, y, s, s);
    }

    // Piedras pequeñas, irregulares.
    for (let i = 0; i < 1400; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = 0.8 + rand() * 2.8;
      const ry = 0.7 + rand() * 2.1;
      ctx.fillStyle = rand() > 0.55
        ? `rgba(213,196,157,${0.14 + rand() * 0.18})`
        : `rgba(42,41,35,${0.15 + rand() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pequeños surcos y compactaciones locales; nunca grandes bandas uniformes.
    ctx.lineCap = 'round';
    for (let i = 0; i < 1100; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI * 2;
      const len = 3 + rand() * 9;
      ctx.strokeStyle = `rgba(49,45,36,${0.04 + rand() * 0.07})`;
      ctx.lineWidth = 1 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    tex.refresh();
  }
}
