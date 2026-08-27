import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

function currentTrackKey(scene) {
  let stored = '';
  try { stored = localStorage.getItem('tdr2:trackKey') || ''; } catch {}
  return String(scene?.trackKey || stored || '').trim().toLowerCase();
}

function currentVideoQuality() {
  try {
    const settings = JSON.parse(localStorage.getItem('tdr2:settings') || '{}');
    const quality = String(settings?.video?.quality || 'high').toLowerCase();
    return ['low', 'medium', 'high'].includes(quality) ? quality : 'high';
  } catch {
    return 'high';
  }
}

// Materiales world-space cargados como assets reales por Phaser.
// La geometría, físicas y detección de superficies no consumen estos assets.
export class RaceScene extends BakedRaceScene {
  preload() {
    super.preload?.();

    try { if (this.textures.exists('grass')) this.textures.remove('grass'); } catch {}
    try { if (this.textures.exists('off')) this.textures.remove('off'); } catch {}
    try { if (this.textures.exists('asphalt')) this.textures.remove('asphalt'); } catch {}

    const quality = currentVideoQuality();
    const lowSurfaceMode = quality === 'low';

    // En BAJA no cargamos los tres mapas 2K de superficie. Las capas base ya
    // disponen de fallbacks procedurales ligeros mediante ensure*Texture().
    // Esto reduce de forma real memoria de textura, ancho de banda y muestreo GPU,
    // sin tocar geometría, físicas, colisiones ni cronometraje.
    // También conserva el safe mode histórico de iOS.
    if (window.__tdrIosSafeMode === true || lowSurfaceMode) {
      try {
        window.__tdrLowSurfaceMode = true;
        console.info('[TDR2][SURFACE LOW] Heavy 2K race surface textures skipped', { quality });
      } catch {}
      return;
    }

    try { window.__tdrLowSurfaceMode = false; } catch {}

    // Mantener las tres superficies 2K aprobadas en MEDIA/ALTA.
    // IMPORTANTE: cargar SOLO los tres mapas visibles. AO/normal/roughness/etc.
    // no participan en este renderer y no deben residir en GPU.
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
  // estabilidad y coste de render. Primero aseguramos que la carrera sea estable;
  // después recuperaremos transiciones con una técnica barata si procede.

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
