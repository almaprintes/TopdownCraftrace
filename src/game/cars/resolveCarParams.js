// src/game/cars/resolveCarParams.js
import { HANDLING_PROFILES } from './handlingProfiles.js';
import { deepMerge } from '../dev/devTuningStore.js';
import { loadGarage, garageTuning } from '../garage/garageStore.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// Global factory top-speed uplift.
// Applied to every car before garage / external tuning is added.
const FACTORY_MAX_FWD_MULT = 1.40;

const EMPTY_TUNING = Object.freeze({
  accelMult: 1, brakeMult: 1, dragMult: 1, turnRateMult: 1,
  maxFwdAdd: 0, maxRevAdd: 0, turnMinAdd: 0,
  gripCoastAdd: 0, gripDriveAdd: 0, gripBrakeAdd: 0
});

function normalizedTuning(raw = {}) {
  const mul = key => Number.isFinite(Number(raw?.[key])) ? Number(raw[key]) : 1;
  const add = key => Number.isFinite(Number(raw?.[key])) ? Number(raw[key]) : 0;
  return {
    accelMult: mul('accelMult'), brakeMult: mul('brakeMult'), dragMult: mul('dragMult'), turnRateMult: mul('turnRateMult'),
    maxFwdAdd: add('maxFwdAdd'), maxRevAdd: add('maxRevAdd'), turnMinAdd: add('turnMinAdd'),
    gripCoastAdd: add('gripCoastAdd'), gripDriveAdd: add('gripDriveAdd'), gripBrakeAdd: add('gripBrakeAdd')
  };
}

function combineTuning(base = EMPTY_TUNING, external = EMPTY_TUNING) {
  const a = normalizedTuning(base), b = normalizedTuning(external);
  return {
    accelMult: a.accelMult * b.accelMult,
    brakeMult: a.brakeMult * b.brakeMult,
    dragMult: a.dragMult * b.dragMult,
    turnRateMult: a.turnRateMult * b.turnRateMult,
    maxFwdAdd: a.maxFwdAdd + b.maxFwdAdd,
    maxRevAdd: a.maxRevAdd + b.maxRevAdd,
    turnMinAdd: a.turnMinAdd + b.turnMinAdd,
    gripCoastAdd: a.gripCoastAdd + b.gripCoastAdd,
    gripDriveAdd: a.gripDriveAdd + b.gripDriveAdd,
    gripBrakeAdd: a.gripBrakeAdd + b.gripBrakeAdd
  };
}

function selectedGarageTuning() {
  try { return garageTuning(loadGarage()) || EMPTY_TUNING; } catch (_) { return EMPTY_TUNING; }
}

function resolveWithTuning(baseSpec, tuning, overrides = {}) {
  const t = normalizedTuning(tuning);
  const profileId = baseSpec.handlingProfile || baseSpec.steeringProfile || 'ARCADE';
  const baseProfile = HANDLING_PROFILES[profileId] || HANDLING_PROFILES.ARCADE;
  const specProfile = {
    ...(baseSpec.steering ? { steering: baseSpec.steering } : {}),
    ...(baseSpec.engine ? { engine: baseSpec.engine } : {}),
    ...(baseSpec.tires ? { tires: baseSpec.tires } : {})
  };
  const profOv = overrides?.profiles?.[profileId] || {};
  const carOv  = overrides?.cars?.[baseSpec.id] || {};
  const profileFinal = deepMerge(deepMerge(deepMerge(baseProfile, specProfile), profOv), carOv);

  return {
    ...baseSpec,
    name: baseSpec.name || baseSpec.id,
    accel: Math.max(0, (baseSpec.accel || 0) * t.accelMult),
    brakeForce: Math.max(0, (baseSpec.brakeForce || 0) * t.brakeMult),
    engineBrake: Math.max(0, (baseSpec.engineBrake || 0)),
    linearDrag: Math.max(0, (baseSpec.linearDrag || 0) * t.dragMult),
    maxFwd: Math.max(0, (baseSpec.maxFwd || 0) * FACTORY_MAX_FWD_MULT + t.maxFwdAdd),
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
      lateralGrip: profileFinal.steering?.lateralGrip ?? 6,
      inputRiseRate: profileFinal.steering?.inputRiseRate ?? 9.5,
      inputReturnRate: profileFinal.steering?.inputReturnRate ?? 14.0,
      inputReverseRate: profileFinal.steering?.inputReverseRate ?? 7.5
    },
    engine: {
      throttleGamma: profileFinal.engine?.throttleGamma ?? 1.35,
      coastDrag: profileFinal.engine?.coastDrag ?? 0.016,
      brakeDrag: profileFinal.engine?.brakeDrag ?? 0.055
    },
    tires: {
      gripSpeedGain: profileFinal.tires?.gripSpeedGain ?? 0.04,
      slipStartDeg: profileFinal.tires?.slipStartDeg ?? 5.0,
      slipFullDeg: profileFinal.tires?.slipFullDeg ?? 14.0,
      cornerGripFloor: profileFinal.tires?.cornerGripFloor ?? 0.58,
      throttleGripLoss: profileFinal.tires?.throttleGripLoss ?? 0.10,
      brakeGripLoss: profileFinal.tires?.brakeGripLoss ?? 0.12
    }
  };
}

// Normal race path: selected-car Workshop equipment + optional external tuning.
export function resolveCarParams(baseSpec, tuning = {}, overrides = {}) {
  return resolveWithTuning(baseSpec, combineTuning(selectedGarageTuning(), tuning), overrides);
}

// Explicit/pure path for opponents and simulations. The supplied tuning is the
// complete package and is applied exactly once; no selected-car garage state is
// read again. Survival uses this to give every CPU the player's exact upgrades.
export function resolveCarParamsWithTuning(baseSpec, tuning = {}, overrides = {}) {
  return resolveWithTuning(baseSpec, tuning, overrides);
}
