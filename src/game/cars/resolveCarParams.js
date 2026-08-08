// src/game/cars/resolveCarParams.js
import { HANDLING_PROFILES } from './handlingProfiles.js';
import { deepMerge } from '../dev/devTuningStore.js';
import { loadGarage, garageTuning } from '../garage/garageStore.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function mergedTuning(external = {}) {
  let g = {};
  try { g = garageTuning(loadGarage()) || {}; } catch (_) {}
  const mul = (key) => (Number(g[key]) || 1) * (Number(external[key]) || 1);
  const add = (key) => (Number(g[key]) || 0) + (Number(external[key]) || 0);
  return {
    accelMult: mul('accelMult'), brakeMult: mul('brakeMult'), dragMult: mul('dragMult'), turnRateMult: mul('turnRateMult'),
    maxFwdAdd: add('maxFwdAdd'), maxRevAdd: add('maxRevAdd'), turnMinAdd: add('turnMinAdd'),
    gripCoastAdd: add('gripCoastAdd'), gripDriveAdd: add('gripDriveAdd'), gripBrakeAdd: add('gripBrakeAdd')
  };
}

// Aplica perfil + piezas equipadas del Workshop + tuning/overrides externos.
export function resolveCarParams(baseSpec, tuning = {}, overrides = {}) {
  const t = mergedTuning(tuning);

  const profileId = baseSpec.handlingProfile || baseSpec.steeringProfile || 'ARCADE';
  const baseProfile = HANDLING_PROFILES[profileId] || HANDLING_PROFILES.ARCADE;
  const profOv = overrides?.profiles?.[profileId] || {};
  const carOv  = overrides?.cars?.[baseSpec.id] || {};
  const profileFinal = deepMerge(deepMerge(baseProfile, profOv), carOv);

  return {
    ...baseSpec,
    name: baseSpec.name || baseSpec.id,
    accel: Math.max(0, (baseSpec.accel || 0) * t.accelMult),
    brakeForce: Math.max(0, (baseSpec.brakeForce || 0) * t.brakeMult),
    engineBrake: Math.max(0, (baseSpec.engineBrake || 0)),
    linearDrag: Math.max(0, (baseSpec.linearDrag || 0) * t.dragMult),
    maxFwd: Math.max(0, (baseSpec.maxFwd || 0) + t.maxFwdAdd),
    maxRev: Math.max(0, (baseSpec.maxRev || 0) + t.maxRevAdd),
    turnRate: Math.max(0, (baseSpec.turnRate || 0) * t.turnRateMult),
    turnMin: clamp((baseSpec.turnMin || 0) + t.turnMinAdd, 0.05, 0.95),
    gripCoast: clamp((baseSpec.gripCoast || 0) + t.gripCoastAdd, 0.00, 0.95),
    gripDrive: clamp((baseSpec.gripDrive || 0) + t.gripDriveAdd, 0.00, 0.95),
    gripBrake: clamp((baseSpec.gripBrake || 0) + t.gripBrakeAdd, 0.00, 0.95),
    handlingProfile: profileId,
    steering: {
      profile: profileId,
      yawSpeedMin: profileFinal.steering?.yawSpeedMin ?? 12,
      steerSat: profileFinal.steering?.steerSat ?? 0.45,
      lowSpeedSteer: profileFinal.steering?.lowSpeedSteer ?? 0.35,
      highSpeedLimit: profileFinal.steering?.highSpeedLimit ?? 0.75,
      lateralGrip: profileFinal.steering?.lateralGrip ?? 6
    },
    engine: {
      throttleGamma: profileFinal.engine?.throttleGamma ?? 1.35,
      coastDrag: profileFinal.engine?.coastDrag ?? 0.016,
      brakeDrag: profileFinal.engine?.brakeDrag ?? 0.055
    },
    tires: { gripSpeedGain: profileFinal.tires?.gripSpeedGain ?? 0.04 }
  };
}
