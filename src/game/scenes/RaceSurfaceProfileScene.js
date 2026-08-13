import { RaceScene as CurrentRaceScene } from './RaceDirectionScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

// Per-track surface presentation plus vehicle × surface dynamics.
// The circuit owns the material map. The car hardware determines how well it can use each material.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    this._tdrSurfaceProfile = String(
      this.track?.meta?.surfaceProfile ||
      this.track?.meta?.meta?.surfaceProfile ||
      ''
    ).toLowerCase();

    this._tdrOriginalIsOnTrack = this._isOnTrack;
    this._tdrOriginalIsInBand = this._isInBand;
    this._tdrSurfaceBase = null;
    this._tdrSurfaceInteractions = null;
    this._tdrEnvironmentPruned = false;

    if (this._tdrSurfaceProfile === 'dirt-asphalt-grass') {
      this._captureSurfaceBaseline();
      this._buildSurfaceInteractions();
      this._applySurfaceProfileVisuals();
      this._pruneEnvironmentFromAsphalt();
    }

    return result;
  }

  _captureSurfaceBaseline() {
    this._tdrSurfaceBase = {
      accel: Number(this.accel),
      brakeForce: Number(this.brakeForce),
      maxFwd: Number(this.maxFwd),
      linearDrag: Number(this.linearDrag),
      lateralGrip: Number(this.lateralGrip)
    };
  }

  _buildSurfaceInteractions() {
    const spec = CAR_SPECS?.[this.carId] || {};
    this._tdrSurfaceInteractions = {
      DIRT: resolveVehicleSurface(spec, 'DIRT'),
      ASPHALT: resolveVehicleSurface(spec, 'ASPHALT'),
      GRASS: resolveVehicleSurface(spec, 'GRASS')
    };
  }

  _rawIsOnTrack(x, y) {
    const fn = this._tdrOriginalIsOnTrack;
    return typeof fn === 'function' ? !!fn.call(this, x, y) : true;
  }

  _rawIsInGrassBand(x, y) {
    const fn = this._tdrOriginalIsInBand;
    return typeof fn === 'function'
      ? !!fn.call(this, this.track?.geom?.grass, x, y)
      : false;
  }

  _materialAt(x, y) {
    // On this authored profile the old engine zones are reinterpreted as materials:
    // TRACK = dirt ribbon, old GRASS band = asphalt run-off, old OFF = actual grass.
    if (this._rawIsOnTrack(x, y)) return 'DIRT';
    if (this._rawIsInGrassBand(x, y)) return 'ASPHALT';
    return 'GRASS';
  }

  _applyResolvedMaterial(material) {
    const base = this._tdrSurfaceBase;
    const interaction = this._tdrSurfaceInteractions?.[material];
    if (!base || !interaction) return;

    if (Number.isFinite(base.accel)) this.accel = base.accel * interaction.longCapacity;
    if (Number.isFinite(base.brakeForce)) this.brakeForce = base.brakeForce * interaction.brakingCapacity;
    if (Number.isFinite(base.maxFwd)) this.maxFwd = base.maxFwd * interaction.speedCapacity;
    if (Number.isFinite(base.linearDrag)) this.linearDrag = base.linearDrag * interaction.dragFactor;
    if (Number.isFinite(base.lateralGrip)) this.lateralGrip = base.lateralGrip * interaction.latCapacity;

    this._tdrSurfaceInteraction = interaction;
  }

  _applySurfaceProfileVisuals() {
    if (this._tdrSurfaceProfile !== 'dirt-asphalt-grass') return;

    // Far field = grass.
    try {
      if (this.bgOff?.texture?.key !== 'grass') this.bgOff?.setTexture?.('grass');
    } catch (_) {}

    // Immediate ribbon around the dirt road = asphalt.
    try {
      if (this.bgGrass?.texture?.key !== 'asphalt') this.bgGrass?.setTexture?.('asphalt');
    } catch (_) {}

    // Drivable ribbon = dirt/off-road procedural texture.
    const cells = this.track?.gfxByCell;
    if (cells?.values) {
      for (const cell of cells.values()) {
        try {
          if (cell?.tile?.texture?.key !== 'off') cell?.tile?.setTexture?.('off');
          cell?.overlay?.setVisible?.(false);
        } catch (_) {}
      }
    }
  }

  _pruneEnvironmentFromAsphalt() {
    if (this._tdrEnvironmentPruned) return;
    const objects = this._circuitEnvironment;
    if (!Array.isArray(objects) || objects.length === 0) return;

    for (const obj of objects) {
      if (!obj?.scene || !Number.isFinite(Number(obj.x)) || !Number.isFinite(Number(obj.y))) continue;
      const x = Number(obj.x);
      const y = Number(obj.y);
      if (!this._rawIsOnTrack(x, y) && this._rawIsInGrassBand(x, y)) {
        try { obj.destroy(); } catch (_) {}
      }
    }

    this._tdrEnvironmentPruned = true;
  }

  update(time, delta) {
    if (this._tdrSurfaceProfile !== 'dirt-asphalt-grass') {
      super.update(time, delta);
      return;
    }

    const bodyBefore = this.carBody || this.car;
    const xBefore = Number(bodyBefore?.x || 0);
    const yBefore = Number(bodyBefore?.y || 0);
    const materialBefore = this._materialAt(xBefore, yBefore);

    // Feed the controller the capacities for the material under the car.
    this._applyResolvedMaterial(materialBefore);

    // The legacy controller equates leaving TRACK with a hard generic penalty.
    // Neutralise that legacy zone penalty only for this authored multi-material profile;
    // the actual material physics above remains active.
    const originalOnTrack = this._isOnTrack;
    const originalInBand = this._isInBand;
    this._isOnTrack = () => true;
    this._isInBand = () => false;

    try {
      super.update(time, delta);
    } finally {
      this._isOnTrack = originalOnTrack;
      this._isInBand = originalInBand;
    }

    const bodyAfter = this.carBody || this.car;
    const xAfter = Number(bodyAfter?.x || 0);
    const yAfter = Number(bodyAfter?.y || 0);
    const materialAfter = this._materialAt(xAfter, yAfter);

    // Expose the true semantic material for HUD / telemetry and prepare next frame.
    this._surface = materialAfter;
    this._onTrack = materialAfter === 'DIRT';
    this._applyResolvedMaterial(materialAfter);

    // Cells are created lazily by culling and environment can arrive after create().
    this._applySurfaceProfileVisuals();
    this._pruneEnvironmentFromAsphalt();
  }
}
