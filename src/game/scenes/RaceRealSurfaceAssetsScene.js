import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

// Materiales reales cargados como assets WebP por Phaser.
// No se convierten desde data: ni se copian mediante Canvas. Las keys finales
// grass/asphalt son las que consume la pista y después el bake de Karting Tenerife.
export class RaceScene extends BakedRaceScene {
  preload() {
    super.preload?.();

    // TextureManager es global entre escenas; eliminamos cualquier versión previa
    // antes de que el Loader registre los WebP reales con las keys definitivas.
    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}

    this.load.image('grass', 'assets/materials/grass-real.webp');
    this.load.image('asphalt', 'assets/materials/asphalt-real.webp');
  }

  // Si el WebP se cargó, no permitimos que ninguna capa heredada lo regenere.
  // Solo usamos el generador procedural anterior como fallback de carga.
  ensureBgTexture() {
    if (this.textures.exists('grass')) return;
    super.ensureBgTexture?.();
  }

  ensureAsphaltTexture() {
    if (this.textures.exists('asphalt')) return;
    super.ensureAsphaltTexture?.();
  }
}
