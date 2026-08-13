import { RaceScene as CurrentRaceScene } from './RaceDirectionScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

// Per-track surface presentation plus vehicle × surface dynamics.
// A track declares its material. The car's hardware determines how well it can use it.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    this._tdrSurfaceProfile = String(
      this.track?.meta?.surfaceProfile ||
      this.track?.meta?.meta?.surfaceProfile ||
      ''
    ).toLowerCase();

    this._tdrSurfaceDynamicsApplied = false;
    this._applySurfaceProfileVisuals();
    this._applyVehicleSurfaceDynamics();

    return result;
  }

  _applyVehicleSurfaceDynamics() {
    if (this._tdrSurfaceDynamicsApplied) return;
    if (this._tdrSurfaceProfile !== 'dirt-asphalt-grass') return;

    const spec = CAR_SPECS?.[this.carId] || {};
    const interaction = resolveVehicleSurface(spec, 'DIRT');
    this._tdrSurfaceInteraction = interaction;

    // These are effective capacities produced by the SAME dirt surface with the
    // current car hardware. No per-track steering/grip nerf exists here.
    if (Number.isFinite(Number(this.accel))) {
      this.accel *= interaction.longCapacity;
    }
    if (Number.isFinite(Number(this.brakeForce))) {
      this.brakeForce *= interaction.brakingCapacity;
    }
    if (Number.isFinite(Number(this.maxFwd))) {
      this.maxFwd *= interaction.speedCapacity;
    }
    if (Number.isFinite(Number(this.linearDrag))) {
      this.linearDrag *= interaction.dragFactor;
    }
    if (Number.isFinite(Number(this.lateralGrip))) {
      this.lateralGrip *= interaction.latCapacity;
    }

    // Steering ratio itself is not arbitrarily reduced. The car keeps its native
    // steering response; only the tire/surface lateral capacity limits how much
    // of that commanded rotation can be converted into actual cornering grip.

    this._tdrSurfaceDynamicsApplied = true;
  }

  _applySurfaceProfileVisuals() {
    if (this._tdrSurfaceProfile !== 'dirt-asphalt-grass') return;

    // Far field = grass.
    try {
      if (this.bgOff?.texture?.key !== 'grass') this.bgOff?.setTexture?.('grass');
    } catch (_) {}

    // Immediate ribbon around the road = asphalt.
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

  update(time, delta) {
    super.update(time, delta);

    // The base surface detector still calls the drivable ribbon TRACK. For this
    // authored profile the TRACK material is dirt, so expose the semantic surface
    // for HUD / telemetry without altering the controller.
    if (this._tdrSurfaceProfile === 'dirt-asphalt-grass' && this._onTrack) {
      this._surface = 'DIRT';
    }

    // Cells are created lazily by culling.
    this._applySurfaceProfileVisuals();
  }
}
