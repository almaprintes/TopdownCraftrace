import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

// Materiales world-space cargados como assets reales por Phaser.
// La geometría, físicas y detección de superficies no consumen estos assets.
export class RaceScene extends BakedRaceScene {
  preload() {
    super.preload?.();

    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('off')) this.textures.remove('off'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}
    try { if (this.textures.exists('asphaltAO')) this.textures.remove('asphaltAO'); } catch {}
    try { if (this.textures.exists('asphaltNormal')) this.textures.remove('asphaltNormal'); } catch {}
    try { if (this.textures.exists('asphaltRoughness')) this.textures.remove('asphaltRoughness'); } catch {}
    try { if (this.textures.exists('asphaltHeight')) this.textures.remove('asphaltHeight'); } catch {}
    try { if (this.textures.exists('asphaltMetalness')) this.textures.remove('asphaltMetalness'); } catch {}

    // Mantener las tres superficies existentes del renderer: grass / asphalt / off.
    this.load.image('grass', 'assets/materials/grass/rocky_terrain_02_diff_2k.jpg?v=20260824-grass-rocky2k-v1');
    this.load.image('off', 'assets/materials/offroad/rocky_terrain_diff_2k.jpg?v=20260824-rocky-offroad-2k-v1');
    this.load.image('asphalt', 'assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg?v=20260824-polyhaven-clean-v1');

    // Mapas PBR conservados solo como referencia; no forman parte del render activo.
    this.load.image('asphaltAO', 'assets/materials/asphalt-pbr/ao.png?v=20260824-craftpbr-v1');
    this.load.image('asphaltNormal', 'assets/materials/asphalt-pbr/normal.png?v=20260824-craftpbr-v1');
    this.load.image('asphaltRoughness', 'assets/materials/asphalt-pbr/roughness.png?v=20260824-craftpbr-v1');
    this.load.image('asphaltHeight', 'assets/materials/asphalt-pbr/height.png?v=20260824-craftpbr-v1');
    this.load.image('asphaltMetalness', 'assets/materials/asphalt-pbr/metalness.png?v=20260824-craftpbr-v1');
  }

  create(data) {
    const result = super.create(data);
    this._installGrassOffAlphaFeather();
    return result;
  }

  _installGrassOffAlphaFeather() {
    // Reemplaza el borde duro de la mascara visual de GRASS por una mascara alfa real.
    // No crea otra superficie ni otro TileSprite: bgGrass sigue siendo el mismo objeto.
    if (this.bgGrass?.texture?.key !== 'grass' || this.bgOff?.texture?.key !== 'off') return;

    const grass = this.track?.geom?.grass;
    const leftRaw = Array.isArray(grass?.left) ? grass.left : [];
    const rightRaw = Array.isArray(grass?.right) ? grass.right : [];
    if (leftRaw.length < 4 || rightRaw.length < 4) return;

    const worldW = Math.max(1, Math.ceil(Number(this.worldW || this.track?.meta?.worldW || 0)));
    const worldH = Math.max(1, Math.ceil(Number(this.worldH || this.track?.meta?.worldH || 0)));
    if (!worldW || !worldH) return;

    const normalize = (raw) => raw
      .map((p) => Array.isArray(p)
        ? { x: Number(p[0]), y: Number(p[1]) }
        : { x: Number(p?.x), y: Number(p?.y) })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    const left = normalize(leftRaw);
    const right = normalize(rightRaw);
    if (left.length < 4 || right.length < 4) return;

    // Mascara reducida: se genera una sola vez. Phaser la escala al mundo completo.
    // 1024 px de ancho da suficiente precision en el borde sin reservar un canvas 8000x5000.
    const maskW = 1024;
    const maskH = Math.max(256, Math.round(maskW * worldH / worldW));
    const sx = maskW / worldW;
    const sy = maskH / worldH;
    const maskKey = `grassOffSoftMask_${worldW}x${worldH}`;

    try { if (this.textures.exists(maskKey)) this.textures.remove(maskKey); } catch {}
    const tex = this.textures.createCanvas(maskKey, maskW, maskH);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, maskW, maskH);

    // Poligono de la banda grass completa: un borde por cada lado de la pista.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left[0].x * sx, left[0].y * sy);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x * sx, left[i].y * sy);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x * sx, right[i].y * sy);
    ctx.closePath();

    // ShadowBlur produce alfa progresiva REAL fuera del poligono. El interior permanece
    // 100 % opaco; solo los ~28 px exteriores mezclan gradualmente grass sobre off.
    const featherWorldPx = 28;
    const blurPx = Math.max(2, featherWorldPx * ((sx + sy) * 0.5));
    ctx.shadowColor = 'rgba(255,255,255,1)';
    ctx.shadowBlur = blurPx;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill();
    ctx.restore();
    tex.refresh();

    // Retirar SOLO la mascara visual dura anterior. No tocamos su geometria fuente.
    try { this.bgGrass.clearMask?.(false); } catch {}

    const maskSource = this.make.image({ x: 0, y: 0, key: maskKey, add: false })
      .setOrigin(0, 0)
      .setDisplaySize(worldW, worldH);
    const softMask = maskSource.createBitmapMask();
    this.bgGrass.setMask(softMask);

    this._grassOffSoftMaskTextureKey = maskKey;
    this._grassOffSoftMaskSource = maskSource;
    this._grassOffSoftMask = softMask;

    this.events.once('shutdown', () => {
      try { this.bgGrass?.clearMask?.(false); } catch {}
      try { softMask.destroy?.(); } catch {}
      try { maskSource.destroy?.(); } catch {}
      try { if (this.textures.exists(maskKey)) this.textures.remove(maskKey); } catch {}
      this._grassOffSoftMaskTextureKey = null;
      this._grassOffSoftMaskSource = null;
      this._grassOffSoftMask = null;
    });
  }

  ensureBgTexture() {
    if (this.textures.exists('grass')) return;
    super.ensureBgTexture?.();
  }

  ensureOffTexture() {
    if (this.textures.exists('off')) return;
    super.ensureOffTexture?.();
  }

  ensureAsphaltTexture() {
    if (this.textures.exists('asphalt')) return;
    super.ensureAsphaltTexture?.();
  }
}