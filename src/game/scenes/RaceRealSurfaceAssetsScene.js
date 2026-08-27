import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

const ATLANTICO_TRACK_KEY = 'track01';
const POLYHAVEN_BASE = 'https://dl.polyhaven.org/file/ph-assets/Textures';

function currentTrackKey(scene) {
  let stored = '';
  try { stored = localStorage.getItem('tdr2:trackKey') || ''; } catch {}
  return String(scene?.trackKey || stored || '').trim().toLowerCase();
}

function currentVideoPrefs() {
  try {
    const settings = JSON.parse(localStorage.getItem('tdr2:settings') || '{}');
    const video=settings?.video||{};
    const quality=String(video.quality||'high').toLowerCase();
    const preset=['performance','medium','high','ultra'].includes(String(video.preset))
      ? String(video.preset)
      : quality==='low'?'performance':quality==='medium'?'medium':'high';
    const surfaceResolution=['1k','2k','4k'].includes(String(video.surfaceResolution))
      ? String(video.surfaceResolution)
      : preset==='ultra'?'4k':preset==='high'?'2k':'1k';
    return {quality:['low','medium','high'].includes(quality)?quality:'high',preset,surfaceResolution,lighting:video.lighting!==false};
  } catch {
    return {quality:'high',preset:'high',surfaceResolution:'2k',lighting:true};
  }
}

function polyhaven(asset, map, ext, resolution) {
  return `${POLYHAVEN_BASE}/${ext}/${resolution}/${asset}/${asset}_${map}_${resolution}.${ext}`;
}

function canUseAtlanticoLitSurfaces(scene) {
  const prefs=currentVideoPrefs();
  return currentTrackKey(scene) === ATLANTICO_TRACK_KEY
    && prefs.preset !== 'performance'
    && prefs.lighting
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

    const prefs = currentVideoPrefs();
    const lowSurfaceMode = prefs.preset === 'performance';
    const trackKey = currentTrackKey(this);

    // RENDIMIENTO conserva los fallbacks procedurales ligeros. No se decodifican
    // mapas pesados ni normales; es la ruta destinada a móviles antiguos/calientes.
    if (window.__tdrIosSafeMode === true || lowSurfaceMode) {
      try {
        window.__tdrLowSurfaceMode = true;
        console.info('[TDR2][SURFACE PERFORMANCE] Heavy race surface textures skipped', { preset:prefs.preset });
      } catch {}
      return;
    }

    try { window.__tdrLowSurfaceMode = false; } catch {}

    // CIRCUITO ATLÁNTICO usa las tres superficies Poly Haven elegidas por el usuario.
    // MEDIO=1K, ALTA=2K, ULTRA=4K. Diffuse + normal OpenGL viajan como una textura
    // Phaser cuando la iluminación está activa; si se desactiva, solo cargamos diffuse.
    if (trackKey === ATLANTICO_TRACK_KEY) {
      const r=prefs.surfaceResolution;
      const grassDiff=polyhaven('sparse_grass','diff','jpg',r);
      const dirtDiff=polyhaven('rocky_trail_02','diff','jpg',r);
      const grassNormal=polyhaven('sparse_grass','nor_gl','png',r);
      const dirtNormal=polyhaven('rocky_trail_02','nor_gl','png',r);
      this.load.image('grass', prefs.lighting ? [grassDiff,grassNormal] : grassDiff);
      this.load.image('off', prefs.lighting ? [dirtDiff,dirtNormal] : dirtDiff);
      this.load.image('asphalt', polyhaven('asphalt_02','diff','jpg',r));
      return;
    }

    // Resto de circuitos: superficies aprobadas anteriores. El preset sigue afectando
    // a chunks, overlay, partículas, AA y FPS aunque todavía no haya variantes 1/2/4K.
    this.load.image('grass', 'assets/materials/grass/rocky_terrain_02_diff_2k.jpg?v=20260824-grass-rocky2k-v1');

    const offPath = trackKey === 'offroad-raven-hollow'
      ? 'assets/materials/dirt-road/road_damaged_2_diff_2k.jpg?v=20260824-raven-dirt-v1'
      : 'assets/materials/offroad/rocky_terrain_diff_2k.jpg?v=20260824-rocky-offroad-2k-v1';
    this.load.image('off', offPath);

    this.load.image('asphalt', 'assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg?v=20260824-polyhaven-clean-v1');
  }

  create(data) {
    const result = super.create?.(data);

    if (canUseAtlanticoLitSurfaces(this)) {
      try { this.bgGrass?.setPipeline?.('Light2D'); } catch {}
      try { this.bgOff?.setPipeline?.('Light2D'); } catch {}
      try {
        const prefs=currentVideoPrefs();
        console.info('[TDR2][ATLANTICO PBR] grass + dirt Light2D armed', {
          grass: 'sparse_grass',
          dirt: 'rocky_trail_02',
          preset:prefs.preset,
          resolution:prefs.surfaceResolution
        });
      } catch {}
    }

    return result;
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
