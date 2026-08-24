import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

// Materiales world-space cargados como assets reales por Phaser.
// La geometría, físicas y detección de superficies no consumen estos assets.
export class RaceScene extends BakedRaceScene {
  preload() {
    super.preload?.();

    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('off')) this.textures.remove('off'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}

    // Mantener las tres superficies existentes del renderer: grass / asphalt / off.
    // IMPORTANTE iOS: cargar SOLO los tres mapas visibles. Los antiguos AO/normal/
    // roughness/height/metalness no participan en el render y mantenerlos residentes
    // podía consumir decenas de MB extra de memoria gráfica en Safari/WebKit.
    this.load.image('grass', 'assets/materials/grass/rocky_terrain_02_diff_2k.jpg?v=20260824-grass-rocky2k-v1');
    this.load.image('off', 'assets/materials/offroad/rocky_terrain_diff_2k.jpg?v=20260824-rocky-offroad-2k-v1');
    this.load.image('asphalt', 'assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg?v=20260824-polyhaven-clean-v1');
  }

  // El feather grass/off queda temporalmente desactivado mientras validamos
  // estabilidad en iPhone 12. Primero aseguramos que la carrera no dispara
  // el proceso WebKit; después recuperaremos la transición con una técnica barata.

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