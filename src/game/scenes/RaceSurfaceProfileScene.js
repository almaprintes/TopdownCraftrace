import { RaceScene as CurrentRaceScene } from './RaceDirectionScene.js';

// Per-track surface presentation/feel without changing the physical track geometry.
// Profiles are authored in track.json -> meta.surfaceProfile.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    this._tdrSurfaceProfile = String(
      this.track?.meta?.surfaceProfile ||
      this.track?.meta?.meta?.surfaceProfile ||
      ''
    ).toLowerCase();

    this._tdrSurfaceHandlingApplied = false;
    this._applySurfaceProfileVisuals();
    this._applySurfaceProfileHandling();

    return result;
  }

  _applySurfaceProfileHandling() {
    if (this._tdrSurfaceHandlingApplied) return;
    if (this._tdrSurfaceProfile !== 'dirt-asphalt-grass') return;

    // Mild rally-style character: less lateral bite and a touch less steering authority,
    // while preserving the responsive controller and all braking/inertia work already tuned.
    if (Number.isFinite(Number(this.turnRate))) this.turnRate *= 0.94;
    if (Number.isFinite(Number(this.lateralGrip))) this.lateralGrip *= 0.78;
    if (Number.isFinite(Number(this.accel))) this.accel *= 0.93;

    this._tdrSurfaceHandlingApplied = true;
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
          // The normal asphalt grain overlay looks wrong over dirt.
          cell?.overlay?.setVisible?.(false);
        } catch (_) {}
      }
    }
  }

  update(time, delta) {
    super.update(time, delta);

    // Cells are created lazily by culling, so newly-created visible cells also
    // need the authored surface profile applied.
    this._applySurfaceProfileVisuals();
  }
}
