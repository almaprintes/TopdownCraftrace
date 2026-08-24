import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

// Materiales world-space cargados como assets reales por Phaser.
// La geometría, físicas y detección de superficies no consumen estos assets.
export class RaceScene extends BakedRaceScene {
  preload() {
    super.preload?.();

    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}
    try { if (this.textures.exists('asphaltOverlay')) this.textures.remove('asphaltOverlay'); } catch {}

    this.load.image('grass', 'assets/materials/grass-real.webp');
    this.load.image('asphalt', 'assets/materials/asphalt-real-v2.svg?v=20260824-realism-v2');
    this.load.image('asphaltOverlay', 'assets/materials/asphalt-overlay-real-v2.svg?v=20260824-realism-v2');
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
