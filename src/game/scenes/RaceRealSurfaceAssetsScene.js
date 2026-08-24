import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

// Materiales world-space cargados como assets reales por Phaser.
// La geometría, físicas y detección de superficies no consumen estos assets.
export class RaceScene extends BakedRaceScene {
  preload() {
    super.preload?.();

    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}
    try { if (this.textures.exists('asphaltAO')) this.textures.remove('asphaltAO'); } catch {}
    try { if (this.textures.exists('asphaltNormal')) this.textures.remove('asphaltNormal'); } catch {}
    try { if (this.textures.exists('asphaltRoughness')) this.textures.remove('asphaltRoughness'); } catch {}
    try { if (this.textures.exists('asphaltHeight')) this.textures.remove('asphaltHeight'); } catch {}
    try { if (this.textures.exists('asphaltMetalness')) this.textures.remove('asphaltMetalness'); } catch {}

    this.load.image('grass', 'assets/materials/grass-real.webp');

    // Poly Haven Clean Asphalt diffuse/albedo only. No runtime PBR shader: the iPhone
    // A/B test showed a materially better FMAX (16-18 ms) without it. The remaining
    // CraftPBR maps stay loaded only as dormant/reference assets and do not affect the
    // visible asphalt pass.
    this.load.image('asphalt', 'assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg?v=20260824-polyhaven-clean-v1');
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

  ensureAsphaltTexture() {
    if (this.textures.exists('asphalt')) return;
    super.ensureAsphaltTexture?.();
  }
}