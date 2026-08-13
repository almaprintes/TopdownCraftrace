// Vehicle × surface interaction.
// The surface owns fixed physical conditions. The car owns the hardware that can exploit them.
// Effective performance is resolved from both; tracks never directly nerf steering/grip.

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export const SURFACE_MATERIALS = {
  ASPHALT: {
    id: 'ASPHALT',
    muLong: 1.00,
    muLat: 1.00,
    rollingResistance: 1.00,
    roughness: 0.05,
    loose: 0.00
  },
  DIRT: {
    id: 'DIRT',
    muLong: 0.72,
    muLat: 0.60,
    rollingResistance: 1.16,
    roughness: 0.42,
    loose: 0.58
  },
  GRASS: {
    id: 'GRASS',
    muLong: 0.52,
    muLat: 0.46,
    rollingResistance: 1.46,
    roughness: 0.35,
    loose: 0.22
  }
};

function inferredSetup(spec = {}) {
  const id = String(spec.id || '').toLowerCase();
  const brand = String(spec.brand || '').toUpperCase();
  const role = String(spec.role || '').toLowerCase();
  const category = String(spec.category || '').toLowerCase();
  const profile = String(spec.handlingProfile || spec.steeringProfile || '').toUpperCase();

  // Baseline road car.
  let setup = {
    tireAsphalt: 1.00,
    tireDirt: 0.68,
    tireGrass: 0.48,
    suspensionCompliance: 0.48,
    groundClearance: 0.45,
    tractionSystem: 0.62,
    looseSurfaceStability: 0.52
  };

  // Off-road vehicles: hardware, not a track-specific bonus.
  if (brand === 'FORGE' || id.startsWith('forge_') || role.includes('todoterreno') || role.includes('monster')) {
    setup = {
      tireAsphalt: 0.84,
      tireDirt: 1.00,
      tireGrass: 0.86,
      suspensionCompliance: 0.96,
      groundClearance: 0.98,
      tractionSystem: 0.96,
      looseSurfaceStability: 0.92
    };
  }

  // Cars strongly optimized for high-speed asphalt / downforce suffer when the road stops being smooth.
  if (brand === 'VELOCE' || category.includes('velocidad') || profile === 'F1_DOWNFORCE') {
    setup = {
      ...setup,
      tireAsphalt: Math.max(setup.tireAsphalt, 1.04),
      tireDirt: Math.min(setup.tireDirt, 0.50),
      tireGrass: Math.min(setup.tireGrass, 0.36),
      suspensionCompliance: Math.min(setup.suspensionCompliance, 0.32),
      groundClearance: Math.min(setup.groundClearance, 0.26),
      looseSurfaceStability: Math.min(setup.looseSurfaceStability, 0.38)
    };
  }

  return { ...setup, ...(spec.terrainSetup || {}) };
}

export function resolveVehicleSurface(spec, surfaceId = 'ASPHALT') {
  const surface = SURFACE_MATERIALS[surfaceId] || SURFACE_MATERIALS.ASPHALT;
  const car = inferredSetup(spec);
  const tire = surface.id === 'DIRT' ? car.tireDirt : surface.id === 'GRASS' ? car.tireGrass : car.tireAsphalt;

  // Rough surfaces punish stiff / low cars more; loose surfaces reward traction hardware.
  const chassisAbility = clamp((car.suspensionCompliance + car.groundClearance) * 0.5, 0, 1);
  const roughPenalty = surface.roughness * (1 - chassisAbility);
  const looseTraction = 1 - surface.loose * (1 - clamp(car.tractionSystem, 0, 1)) * 0.55;
  const looseStability = 1 - surface.loose * (1 - clamp(car.looseSurfaceStability, 0, 1)) * 0.60;

  const longCapacity = clamp(surface.muLong * tire * looseTraction * (1 - roughPenalty * 0.32), 0.28, 1.08);
  const latCapacity = clamp(surface.muLat * tire * looseStability * (1 - roughPenalty * 0.38), 0.20, 1.08);
  const brakingCapacity = clamp(surface.muLong * tire * (0.78 + car.tractionSystem * 0.22) * (1 - roughPenalty * 0.20), 0.30, 1.08);

  // Dirt should hurt launch and control far more than outright gearing/top speed.
  let speedCapacity;
  if (surface.id === 'DIRT') {
    speedCapacity = clamp(0.995 - roughPenalty * 0.045 - (1 - car.groundClearance) * 0.010, 0.95, 1.00);
  } else if (surface.id === 'GRASS') {
    speedCapacity = clamp(0.86 - roughPenalty * 0.22 - (1 - car.groundClearance) * 0.08, 0.68, 0.92);
  } else {
    speedCapacity = clamp(1 - roughPenalty * 0.12, 0.96, 1.03);
  }

  // Dirt coast-down is handled explicitly via rollingDecel below. Do not also multiply
  // the car's native linear drag heavily or it creates an artificial low terminal speed.
  let dragFactor;
  if (surface.id === 'DIRT') {
    dragFactor = clamp(1.02 + roughPenalty * 0.10, 1.02, 1.10);
  } else {
    dragFactor = clamp(surface.rollingResistance * (1 + roughPenalty * 0.38), 0.95, 1.75);
  }

  // Launch traction is intentionally distinct from moving traction. A road/F1 car can spin
  // badly from rest on dirt yet build substantial speed once momentum is established.
  let launchCapacity = longCapacity;
  let movingDriveCapacity = longCapacity;
  let rollingDecel = 0;
  let brakeSlide = 0;
  let cornerSlide = 0;

  if (surface.id === 'DIRT') {
    launchCapacity = clamp(
      0.06 + tire * 0.20 + car.tractionSystem * 0.18 + chassisAbility * 0.10,
      0.18,
      0.82
    );

    movingDriveCapacity = clamp(
      0.78 + tire * 0.10 + car.tractionSystem * 0.07 + chassisAbility * 0.04,
      0.82,
      1.00
    );

    // More coast-down than asphalt, but mild enough that engine power can still build speed.
    rollingDecel = 9 + roughPenalty * 12 + (1 - car.groundClearance) * 4;

    brakeSlide = clamp(surface.loose * (1.08 - tire * 0.36 - car.tractionSystem * 0.22), 0.16, 0.72);
    cornerSlide = clamp(surface.loose * (1.10 - tire * 0.30 - car.looseSurfaceStability * 0.28), 0.14, 0.78);
  } else if (surface.id === 'GRASS') {
    launchCapacity = clamp(longCapacity * 0.90, 0.26, 0.72);
    movingDriveCapacity = clamp(longCapacity * 1.08, 0.40, 0.80);
    rollingDecel = 28 + roughPenalty * 28 + (1 - car.groundClearance) * 12;
    brakeSlide = 0.42;
    cornerSlide = 0.48;
  }

  return {
    surface: surface.id,
    setup: car,
    longCapacity,
    latCapacity,
    brakingCapacity,
    speedCapacity,
    dragFactor,
    launchCapacity,
    movingDriveCapacity,
    rollingDecel,
    brakeSlide,
    cornerSlide
  };
}
