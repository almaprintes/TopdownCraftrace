import { RaceScene as CurrentRaceScene } from './RaceDirectionScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;

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
      lateralGrip: Number(this.lateralGrip),
      steeringLateralGrip: Number(this.carParams?.steering?.lateralGrip)
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
    // TRACK = dirt ribbon, old GRASS band = asphalt run-off, old OFF = actual grass.
    if (this._rawIsOnTrack(x, y)) return 'DIRT';
    if (this._rawIsInGrassBand(x, y)) return 'ASPHALT';
    return 'GRASS';
  }

  _currentControls() {
    const t = this.touch || {};
    return {
      steer: clamp(Number(t.steer ?? t.stickX ?? 0), -1, 1),
      throttle: clamp(Number(t.throttle ?? 0), 0, 1),
      brake: clamp(Number(t.brake ?? 0), 0, 1)
    };
  }

  _forwardKinematics(body) {
    const rot = Number(body?.rotation || 0);
    const vx = Number(body?.body?.velocity?.x || 0);
    const vy = Number(body?.body?.velocity?.y || 0);
    const fx = Math.cos(rot);
    const fy = Math.sin(rot);
    const rx = -fy;
    const ry = fx;
    const vF = vx * fx + vy * fy;
    const vL = vx * rx + vy * ry;
    return {
      speed: Math.hypot(vx, vy),
      vF,
      vL,
      slipAngle: Math.atan2(vL, Math.max(18, Math.abs(vF)))
    };
  }

  _applyResolvedMaterial(material, body) {
    const base = this._tdrSurfaceBase;
    const interaction = this._tdrSurfaceInteractions?.[material];
    if (!base || !interaction) return;

    const controls = this._currentControls();
    const kin = this._forwardKinematics(body);
    const baseMax = Math.max(1, Number(base.maxFwd || 1));
    const speed01 = clamp(kin.speed / baseMax, 0, 1);

    let driveCapacity = interaction.longCapacity;
    let latCapacity = interaction.latCapacity;
    let brakeCapacity = interaction.brakingCapacity;

    if (material === 'DIRT') {
      // Poor launch traction, then progressively better ability to put power down.
      // By ~35% of road-car top speed the artificial low-speed bottleneck is mostly gone.
      const launchBlend = clamp(speed01 / 0.35, 0, 1);
      const eased = launchBlend * launchBlend * (3 - 2 * launchBlend);
      driveCapacity = lerp(interaction.launchCapacity, interaction.movingDriveCapacity, eased);

      // Loose dirt should allow real slip. At speed / steering input grip falls further,
      // and hard braking can almost free the lateral velocity vector from the chassis heading.
      const cornerLoad = clamp(Math.abs(controls.steer) * speed01 * 1.65, 0, 1);
      const brakeLoad = clamp(controls.brake * speed01 * 1.45, 0, 1);
      const throttleLoad = clamp(controls.throttle * Math.abs(controls.steer) * speed01, 0, 1);

      latCapacity *= 1 - interaction.cornerSlide * cornerLoad * 0.72;
      latCapacity *= 1 - interaction.brakeSlide * brakeLoad * 0.86;
      latCapacity *= 1 - interaction.cornerSlide * throttleLoad * 0.28;
      latCapacity = clamp(latCapacity, 0.07, 1.0);

      // Braking on loose ground is less effective longitudinally as the tyres lock and slide.
      brakeCapacity *= 1 - interaction.brakeSlide * brakeLoad * 0.42;
      brakeCapacity = clamp(brakeCapacity, 0.24, 1.0);
    }

    if (Number.isFinite(base.accel)) this.accel = base.accel * driveCapacity;
    if (Number.isFinite(base.brakeForce)) this.brakeForce = base.brakeForce * brakeCapacity;
    if (Number.isFinite(base.maxFwd)) this.maxFwd = base.maxFwd * interaction.speedCapacity;
    if (Number.isFinite(base.linearDrag)) this.linearDrag = base.linearDrag * interaction.dragFactor;
    if (Number.isFinite(base.lateralGrip)) this.lateralGrip = base.lateralGrip * latCapacity;

    // This is the grip actually consumed by the base controller when it removes lateral velocity.
    if (this.carParams?.steering && Number.isFinite(base.steeringLateralGrip)) {
      this.carParams.steering.lateralGrip = Math.max(0.18, base.steeringLateralGrip * latCapacity);
    }

    this._tdrSurfaceInteraction = interaction;
    this._tdrDynamicLatCapacity = latCapacity;
  }

  _applyRollingResistance(material, body, delta) {
    const interaction = this._tdrSurfaceInteractions?.[material];
    const vel = body?.body?.velocity;
    if (!interaction || !vel) return;

    const speed = Math.hypot(Number(vel.x || 0), Number(vel.y || 0));
    if (speed < 0.01) return;

    const dt = clamp(Number(delta || 16.67) / 1000, 0.001, 0.05);
    const decel = Math.max(0, Number(interaction.rollingDecel || 0));
    if (decel <= 0) return;

    // Constant rolling loss feels like loose ground: stronger coast-down without creating
    // an arbitrary low top-speed ceiling. Engine power can overcome it once moving.
    const next = Math.max(0, speed - decel * dt);
    const k = next / speed;
    vel.x *= k;
    vel.y *= k;
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

    // Feed the controller dynamic capacities for the material under the car.
    this._applyResolvedMaterial(materialBefore, bodyBefore);

    // The legacy controller equates leaving TRACK with a hard generic penalty.
    // Neutralise that only for this authored multi-material profile.
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

    // Loose ground continuously bleeds speed via rolling resistance, independent of braking.
    this._applyRollingResistance(materialAfter, bodyAfter, delta);

    // Expose the true semantic material for HUD / telemetry and prepare next frame.
    this._surface = materialAfter;
    this._onTrack = materialAfter === 'DIRT';
    this._applyResolvedMaterial(materialAfter, bodyAfter);

    // Cells are created lazily by culling and environment can arrive after create().
    this._applySurfaceProfileVisuals();
    this._pruneEnvironmentFromAsphalt();
  }
}
