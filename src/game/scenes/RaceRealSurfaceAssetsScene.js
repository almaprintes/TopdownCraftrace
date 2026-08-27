import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

const ATLANTICO_TRACK_KEY = 'track01';
const POLYHAVEN_BASE = 'https://dl.polyhaven.org/file/ph-assets/Textures';

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

function polyhaven1k(asset, map, ext) {
  return `${POLYHAVEN_BASE}/${ext}/1k/${asset}/${asset}_${map}_1k.${ext}`;
}

function canUseAtlanticoLitSurfaces(scene) {
  return currentTrackKey(scene) === ATLANTICO_TRACK_KEY
    && currentVideoQuality() !== 'low'
    && window.__tdrIosSafeMode !== true
    && !!scene?.game?.renderer?.gl;
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
    const trackKey = currentTrackKey(this);

    // En BAJA no cargamos los tres mapas 2K de superficie. Las capas base ya
    // disponen de fallbacks procedurales ligeros mediante ensure*Texture().
    // Esto reduce de forma real memoria de textura, ancho de banda y muestreo GPU,
    // sin tocar geometría, físicas, colisiones ni cronometraje.
    // También conserva el safe mode histórico de iOS.
    if (window.__tdrIosSafeMode === true || lowSurfaceMode) {
      try {
        window.__tdrLowSurfaceMode = true;
        console.info('[TDR2][SURFACE LOW] Heavy race surface textures skipped', { quality });
      } catch {}
      return;
    }

    try { window.__tdrLowSurfaceMode = false; } catch {}

    // CIRCUITO ATLÁNTICO: el piloto Light2D de asfalto vive en la escena superior.
    // Aquí hacemos que hierba y tierra usen también el material Poly Haven elegido
    // por el usuario con diffuse + normal OpenGL 1K. Ambas superficies compartirán
    // la misma luz solar del piloto de Atlántico sin añadir luces extra.
    if (trackKey === ATLANTICO_TRACK_KEY) {
      this.load.image('grass', [
        polyhaven1k('sparse_grass', 'diff', 'jpg'),
        polyhaven1k('sparse_grass', 'nor_gl', 'png')
      ]);
      this.load.image('off', [
        polyhaven1k('rocky_trail_02', 'diff', 'jpg'),
        polyhaven1k('rocky_trail_02', 'nor_gl', 'png')
      ]);
      // Mantener el diffuse de asfalto base como fallback; RaceWorldAlignedMaterialsScene
      // superpone el asfalto normal-mapped enmascarado de Atlántico.
      this.load.image('asphalt', polyhaven1k('asphalt_02', 'diff', 'jpg'));
      return;
    }

    // Resto de circuitos: superficies aprobadas anteriores.
    this.load.image('grass', 'assets/materials/grass/rocky_terrain_02_diff_2k.jpg?v=20260824-grass-rocky2k-v1');

    // Raven Hollow tiene una textura de tierra dedicada. Sustituye la textura off
    // genérica: no añade ninguna capa ni draw call adicional.
    const offPath = trackKey === 'offroad-raven-hollow'
      ? 'assets/materials/dirt-road/road_damaged_2_diff_2k.jpg?v=20260824-raven-dirt-v1'
      : 'assets/materials/offroad/rocky_terrain_diff_2k.jpg?v=20260824-rocky-offroad-2k-v1';
    this.load.image('off', offPath);

    this.load.image('asphalt', 'assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg?v=20260824-polyhaven-clean-v1');
  }

  create(data) {
    const result = super.create?.(data);

    // El sol se habilita justo después, en RaceWorldAlignedMaterialsScene.create().
    // Dejar ya estas dos capas en Light2D hace que empiecen a responder a él en el
    // mismo frame. Si alguna implementación concreta de pista no expone bgGrass o
    // bgOff, el piloto degrada limpiamente sin afectar lógica ni físicas.
    if (canUseAtlanticoLitSurfaces(this)) {
      try { this.bgGrass?.setPipeline?.('Light2D'); } catch {}
      try { this.bgOff?.setPipeline?.('Light2D'); } catch {}
      try {
        console.info('[TDR2][ATLANTICO PBR] grass + dirt Light2D armed', {
          grass: 'sparse_grass',
          dirt: 'rocky_trail_02',
          quality: currentVideoQuality()
        });
      } catch {}
    }

    return result;
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
