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