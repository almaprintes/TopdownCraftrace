import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

function currentTrackKey(scene) {
  let stored = '';
  try { stored = localStorage.getItem('tdr2:trackKey') || ''; } catch {}
  return String(scene?.trackKey || stored || '').trim().toLowerCase();
}

// Materiales world-space cargados como assets reales por Phaser.
// La geometría, físicas y detección de superficies no consumen estos assets.
export class RaceScene extends BakedRaceScene {
  preload() {
    super.preload?.();

    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('off')) this.textures.remove('off'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}

    // DIAGNÓSTICO A/B iOS: en modo seguro no cargamos los tres mapas 2K (~10 MB
    // comprimidos / decenas de MB en GPU). Las capas anteriores conservan sus
    // fallbacks ligeros mediante ensure*Texture(), por lo que geometría, físicas,
    // colisiones y detección de superficies permanecen intactas.
    //
    // Dispositivos fuera de safe mode siguen exactamente con el renderer aprobado.
    if (window.__tdrIosSafeMode === true) {
      try { console.info('[TDR2][SAFE] Heavy 2K race surface textures skipped'); } catch {}
      return;
    }

    // Mantener las tres superficies existentes del renderer: grass / asphalt / off.
    // IMPORTANTE iOS: cargar SOLO los tres mapas visibles. Los antiguos AO/normal/
    // roughness/height/metalness no participan en el render y mantenerlos residentes
    // podía consumir decenas de MB extra de memoria gráfica en Safari/WebKit.
    this.load.image('grass', 'assets/materials/grass/rocky_terrain_02_diff_2k.jpg?v=20260824-grass-rocky2k-v1');

    // Raven Hollow tiene una textura de tierra dedicada. Sustituye la textura off
    // genérica: no añade ninguna capa ni draw call adicional.
    const offPath = currentTrackKey(this) === 'offroad-raven-hollow'
      ? 'assets/materials/dirt-road/road_damaged_2_diff_2k.jpg?v=20260824-raven-dirt-v1'
      : 'assets/materials/offroad/rocky_terrain_diff_2k.jpg?v=20260824-rocky-offroad-2k-v1';
    this.load.image('off', offPath);

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