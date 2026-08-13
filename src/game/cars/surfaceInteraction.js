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
    muLat: 0.68,
    rollingResistance: 1.22,
    roughness: 0.42,
    loose: 0.48
  },
  GRASS: {
    id: 'GRASS',
    muLong: 0.52,
    muLat: 0.46,
    rollingResistance: 1.38,
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
  const roughPenalty = surface.roughness * (1 - clamp((car.suspensionCompliance + car.groundClearance) * 0.5, 0, 1));
  const looseTraction = 1 - surface.loose * (1 - clamp(car.tractionSystem, 0, 1)) * 0.55;
  const looseStability = 1 - surface.loose * (1 - clamp(car.looseSurfaceStability, 0, 1)) * 0.60;

  const longCapacity = clamp(surface.muLong * tire * looseTraction * (1 - roughPenalty * 0.32), 0.28, 1.08);
  const latCapacity = clamp(surface.muLat * tire * looseStability * (1 - roughPenalty * 0.38), 0.24, 1.08);
  const brakingCapacity = clamp(surface.muLong * tire * (0.78 + car.tractionSystem * 0.22) * (1 - roughPenalty * 0.20), 0.30, 1.08);
  const speedCapacity = clamp(1 - roughPenalty * 0.36 - (surface.rollingResistance - 1) * (0.20 + (1 - car.groundClearance) * 0.16), 0.62, 1.02);
  const dragFactor = clamp(surface.rollingResistance * (1 + roughPenalty * 0.55), 0.9, 1.7);

  return {
    surface: surface.id,
    setup: car,
    longCapacity,
    latCapacity,
    brakingCapacity,
    speedCapacity,
    dragFactor
  };
}
