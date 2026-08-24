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
    // Solo suaviza la frontera visual YA EXISTENTE entre grass y off.
    // No crea una superficie nueva ni altera consultas, físicas o geometría.
    if (this.bgGrass?.texture?.key !== 'grass' || this.bgOff?.texture?.key !== 'off') return;

    const grass = this.track?.geom?.grass;
    const left = Array.isArray(grass?.left) ? grass.left : [];
    const right = Array.isArray(grass?.right) ? grass.right : [];
    if (left.length < 4 || right.length < 4) return;

    const worldW = Math.max(1, Math.ceil(Number(this.worldW || this.track?.meta?.worldW || 0)));
    const worldH = Math.max(1, Math.ceil(Number(this.worldH || this.track?.meta?.worldH || 0)));
    if (!worldW || !worldH) return;

    const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    maskGfx.lineStyle(22, 0xffffff, 1);

    const drawClosed = (raw) => {
      const pts = raw
        .map((p) => Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p?.x), y: Number(p?.y) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (pts.length < 4) return;
      maskGfx.beginPath();
      maskGfx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) maskGfx.lineTo(pts[i].x, pts[i].y);
      maskGfx.closePath();
      maskGfx.strokePath();
    };

    // grass.left/right son exactamente los dos bordes exteriores de la banda grass.
    drawClosed(left);
    drawClosed(right);

    const mask = maskGfx.createGeometryMask();
    const feather = this.add.tileSprite(0, 0, worldW, worldH, 'grass')
      .setOrigin(0, 0)
      .setScrollFactor(1)
      .setDepth(-89)
      .setAlpha(0.22)
      .setMask(mask);
    feather.tilePositionX = 0;
    feather.tilePositionY = 0;

    this.uiCam?.ignore?.(feather);
    this.uiCam?.ignore?.(maskGfx);

    this._grassOffFeather = feather;
    this._grassOffFeatherMask = mask;
    this._grassOffFeatherMaskGfx = maskGfx;

    this.events.once('shutdown', () => {
      try { feather.clearMask?.(false); } catch {}
      try { feather.destroy?.(); } catch {}
      try { mask.destroy?.(); } catch {}
      try { maskGfx.destroy?.(); } catch {}
      this._grassOffFeather = null;
      this._grassOffFeatherMask = null;
      this._grassOffFeatherMaskGfx = null;
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