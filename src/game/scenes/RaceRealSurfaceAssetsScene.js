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
    this._installGrassOffFeather();
    return result;
  }

  _installGrassOffFeather() {
    // Suavizado puramente visual de la frontera YA EXISTENTE grass/off.
    // GeometryMask es de borde duro: para simular feather real sin shader usamos
    // tres bandas solapadas, anchas y progresivamente más transparentes.
    if (this.bgGrass?.texture?.key !== 'grass' || this.bgOff?.texture?.key !== 'off') return;

    const grass = this.track?.geom?.grass;
    const left = Array.isArray(grass?.left) ? grass.left : [];
    const right = Array.isArray(grass?.right) ? grass.right : [];
    if (left.length < 4 || right.length < 4) return;

    const worldW = Math.max(1, Math.ceil(Number(this.worldW || this.track?.meta?.worldW || 0)));
    const worldH = Math.max(1, Math.ceil(Number(this.worldH || this.track?.meta?.worldH || 0)));
    if (!worldW || !worldH) return;

    const normalize = (raw) => raw
      .map((p) => Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p?.x), y: Number(p?.y) })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    const boundaries = [normalize(left), normalize(right)].filter((pts) => pts.length >= 4);
    if (!boundaries.length) return;

    const drawClosed = (gfx, pts) => {
      gfx.beginPath();
      gfx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
      gfx.closePath();
      gfx.strokePath();
    };

    // De fuera hacia dentro: la banda más ancha casi imperceptible rompe la línea dura;
    // las dos interiores recuperan gradualmente la lectura de hierba.
    const bands = [
      { width: 42, alpha: 0.055, depth: -89.30 },
      { width: 26, alpha: 0.075, depth: -89.20 },
      { width: 12, alpha: 0.095, depth: -89.10 }
    ];

    const layers = [];
    for (const band of bands) {
      const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
      maskGfx.lineStyle(band.width, 0xffffff, 1);
      for (const pts of boundaries) drawClosed(maskGfx, pts);

      const mask = maskGfx.createGeometryMask();
      const feather = this.add.tileSprite(0, 0, worldW, worldH, 'grass')
        .setOrigin(0, 0)
        .setScrollFactor(1)
        .setDepth(band.depth)
        .setAlpha(band.alpha)
        .setMask(mask);
      feather.tilePositionX = 0;
      feather.tilePositionY = 0;

      this.uiCam?.ignore?.(feather);
      this.uiCam?.ignore?.(maskGfx);
      layers.push({ feather, mask, maskGfx });
    }

    this._grassOffFeatherLayers = layers;

    this.events.once('shutdown', () => {
      for (const layer of layers) {
        try { layer.feather?.clearMask?.(false); } catch {}
        try { layer.feather?.destroy?.(); } catch {}
        try { layer.mask?.destroy?.(); } catch {}
        try { layer.maskGfx?.destroy?.(); } catch {}
      }
      this._grassOffFeatherLayers = null;
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