import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

const ATLANTICO_TRACK_KEY = 'track01';
const ATLANTICO_SURFACE_KEYS = new Set(['grass', 'off', 'asphalt']);
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

    // En BAJA no cargamos mapas reales de superficie. Conserva el control de
    // rendimiento actual y el safe mode histórico de iOS.
    if (window.__tdrIosSafeMode === true || lowSurfaceMode) {
      try {
        window.__tdrLowSurfaceMode = true;
        window.__tdrAtlanticoPbrPilot = false;
        console.info('[TDR2][SURFACE LOW] Heavy race surface textures skipped', { quality });
      } catch {}
      return;
    }

    try { window.__tdrLowSurfaceMode = false; } catch {}

    // PILOTO ATLÁNTICO: Poly Haven CC0, 1K diffuse + OpenGL normal map.
    // Phaser asocia automáticamente el segundo fichero como normal map cuando
    // se pasa [diffuse, normal] a load.image. Roughness/displacement se reservan
    // para una fase posterior: Light2D no los consume y no deben ocupar VRAM aún.
    if (trackKey === ATLANTICO_TRACK_KEY) {
      this.load.image('grass', [
        polyhaven1k('sparse_grass', 'diff', 'jpg'),
        polyhaven1k('sparse_grass', 'nor_gl', 'png')
      ]);
      this.load.image('off', [
        polyhaven1k('rocky_trail_02', 'diff', 'jpg'),
        polyhaven1k('rocky_trail_02', 'nor_gl', 'png')
      ]);
      this.load.image('asphalt', [
        polyhaven1k('asphalt_02', 'diff', 'jpg'),
        polyhaven1k('asphalt_02', 'nor_gl', 'png')
      ]);
      try {
        window.__tdrAtlanticoPbrPilot = true;
        console.info('[TDR2][ATLANTICO PBR] Poly Haven 1K diffuse + normal maps queued', { quality });
      } catch {}
      return;
    }

    // Resto de circuitos: exactamente el renderer aprobado anterior.
    this.load.image('grass', 'assets/materials/grass/rocky_terrain_02_diff_2k.jpg?v=20260824-grass-rocky2k-v1');

    const offPath = trackKey === 'offroad-raven-hollow'
      ? 'assets/materials/dirt-road/road_damaged_2_diff_2k.jpg?v=20260824-raven-dirt-v1'
      : 'assets/materials/offroad/rocky_terrain_diff_2k.jpg?v=20260824-rocky-offroad-2k-v1';
    this.load.image('off', offPath);

    this.load.image('asphalt', 'assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg?v=20260824-polyhaven-clean-v1');
  }

  create(data) {
    const result = super.create(data);

    const quality = currentVideoQuality();
    const enabled = currentTrackKey(this) === ATLANTICO_TRACK_KEY
      && quality !== 'low'
      && window.__tdrIosSafeMode !== true;

    this._atlanticoPbrEnabled = enabled;
    this._atlanticoPbrLitObjects = new WeakSet();
    this._atlanticoPbrLastScan = -Infinity;
    this._atlanticoPbrLight = null;

    if (!enabled || !this.renderer || this.renderer.type !== 2) return result;

    try {
      // Exterior diurno: bastante ambiente para no oscurecer el circuito y una
      // luz cálida lateral grande para que el normal map revele el microrelieve.
      this.lights.enable();
      this.lights.setAmbientColor(0xb8c0c8);

      const camera = this.cameras?.main;
      const cx = camera?.worldView?.centerX ?? 0;
      const cy = camera?.worldView?.centerY ?? 0;
      const radius = Math.max(1800, (camera?.worldView?.width || 1000) * 2.2);
      this._atlanticoPbrLight = this.lights.addLight(cx - 520, cy - 620, radius, 0xffefd1, 1.15);

      this._applyAtlanticoLightPipeline();
      this.time?.delayedCall?.(120, () => this._applyAtlanticoLightPipeline());

      console.info('[TDR2][ATLANTICO PBR] Light2D pilot enabled', {
        quality,
        ambient: '0xb8c0c8',
        radius,
        maps: ['asphalt_02', 'rocky_trail_02', 'sparse_grass']
      });
    } catch (err) {
      this._atlanticoPbrEnabled = false;
      console.warn('[TDR2][ATLANTICO PBR] Lighting unavailable; keeping diffuse renderer', err);
    }

    return result;
  }

  update(time, delta) {
    const result = super.update?.(time, delta);
    if (!this._atlanticoPbrEnabled) return result;

    const camera = this.cameras?.main;
    const light = this._atlanticoPbrLight;
    if (camera && light) {
      const view = camera.worldView;
      light.x = view.centerX - Math.max(420, view.width * 0.42);
      light.y = view.centerY - Math.max(500, view.height * 0.48);
      light.radius = Math.max(1800, Math.max(view.width, view.height) * 2.2);
    }

    // Los chunks de pista aparecen/desaparecen por culling. Escanear a 5 Hz es
    // suficiente para enganchar los recién creados sin añadir trabajo por frame.
    if (Number(time) - this._atlanticoPbrLastScan >= 200) {
      this._atlanticoPbrLastScan = Number(time);
      this._applyAtlanticoLightPipeline();
    }

    return result;
  }

  _applyAtlanticoLightPipeline() {
    if (!this._atlanticoPbrEnabled) return;
    const children = this.children?.list || [];

    for (const obj of children) {
      if (!obj || this._atlanticoPbrLitObjects.has(obj)) continue;
      const key = String(obj?.texture?.key || '');
      if (!ATLANTICO_SURFACE_KEYS.has(key)) continue;
      if (typeof obj.setPipeline !== 'function') continue;

      try {
        obj.setPipeline('Light2D');
        this._atlanticoPbrLitObjects.add(obj);
      } catch {}
    }
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
