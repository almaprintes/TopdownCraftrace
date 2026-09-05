export const LOCAL_RACE_EVIDENCE_VERSION = 1;
export const LOCAL_RACE_EVIDENCE_SAMPLE_MS = 200;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const SIM_HZ = 60;

function finite(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function q(n, scale = 1) {
  const v = finite(n);
  return v == null ? 'x' : String(Math.round(v * scale));
}

function hashText(hash, text) {
  let h = hash >>> 0;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

function circularProgressDelta(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const d = Math.abs(a - b);
  return Math.min(d, Math.abs(1 - d));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export function createLocalRaceEvidenceState() {
  return {
    version: LOCAL_RACE_EVIDENCE_VERSION,
    hash: FNV_OFFSET,
    sampleCount: 0,
    badSamples: 0,
    firstSampleMs: null,
    lastSampleMs: null,
    firstSimTick: null,
    lastSimTick: null,
    lastX: null,
    lastY: null,
    lastProgress: null,
    maxObservedSpeedPxS: 0,
    maxImpliedSpeedPxS: 0,
    maxStepDistancePx: 0,
    maxProgressDelta: 0,
    minX: null,
    maxX: null,
    minY: null,
    maxY: null
  };
}

export function sampleLocalRaceEvidence(state, sample) {
  if (!state || !sample) return false;

  const t = finite(sample.timeMs);
  const x = finite(sample.x);
  const y = finite(sample.y);
  if (t == null || x == null || y == null) {
    state.badSamples = Number(state.badSamples || 0) + 1;
    return false;
  }

  if (state.lastSampleMs != null && t - state.lastSampleMs < LOCAL_RACE_EVIDENCE_SAMPLE_MS - 8) {
    return false;
  }

  const vx = finite(sample.vx) ?? 0;
  const vy = finite(sample.vy) ?? 0;
  const speed = Math.hypot(vx, vy);
  const simTick = finite(sample.simTick);
  const progress = finite(sample.progress01);

  if (state.firstSampleMs == null) state.firstSampleMs = t;
  if (state.firstSimTick == null && simTick != null) state.firstSimTick = simTick;

  if (state.lastSampleMs != null && state.lastX != null && state.lastY != null) {
    const dt = Math.max(1, t - state.lastSampleMs);
    const dist = Math.hypot(x - state.lastX, y - state.lastY);
    const implied = dist * 1000 / dt;
    state.maxStepDistancePx = Math.max(state.maxStepDistancePx || 0, dist);
    state.maxImpliedSpeedPxS = Math.max(state.maxImpliedSpeedPxS || 0, implied);
  }

  if (progress != null && state.lastProgress != null) {
    state.maxProgressDelta = Math.max(
      state.maxProgressDelta || 0,
      circularProgressDelta(progress, state.lastProgress)
    );
  }

  state.sampleCount = Number(state.sampleCount || 0) + 1;
  state.lastSampleMs = t;
  state.lastSimTick = simTick;
  state.lastX = x;
  state.lastY = y;
  state.lastProgress = progress;
  state.maxObservedSpeedPxS = Math.max(state.maxObservedSpeedPxS || 0, speed);
  state.minX = state.minX == null ? x : Math.min(state.minX, x);
  state.maxX = state.maxX == null ? x : Math.max(state.maxX, x);
  state.minY = state.minY == null ? y : Math.min(state.minY, y);
  state.maxY = state.maxY == null ? y : Math.max(state.maxY, y);

  const row = [
    q(t, 0.1), q(simTick, 1), q(x, 4), q(y, 4), q(sample.rotation, 1000),
    q(vx, 4), q(vy, 4), q(progress, 10000)
  ].join('|');
  state.hash = hashText(state.hash, row);
  return true;
}

export function finalizeLocalRaceEvidence(state, timing = {}) {
  const s = state || createLocalRaceEvidenceState();
  const lapMs = finite(timing.lapMs);
  const lapTick = finite(timing.lapTick);
  const expectedMs = lapTick == null ? null : lapTick * (1000 / SIM_HZ);
  const driftMs = lapMs == null || expectedMs == null ? null : lapMs - expectedMs;
  const absDrift = driftMs == null ? null : Math.abs(driftMs);

  const flags = [];
  const diagnostics = [];
  if (s.badSamples > 0) flags.push('NONFINITE_SAMPLE');
  if (lapMs != null && lapMs > 2500 && s.sampleCount < 6) flags.push('LOW_SAMPLE_COUNT');
  if (absDrift != null && absDrift > Math.max(350, lapMs * 0.08)) flags.push('TIMING_DRIFT');

  const observed = Number(s.maxObservedSpeedPxS || 0);
  const implied = Number(s.maxImpliedSpeedPxS || 0);
  if (implied > Math.max(1600, observed * 3 + 400)) flags.push('POSITION_DISCONTINUITY');
  if (Number(s.maxProgressDelta || 0) > 0.20) diagnostics.push('PROGRESS_DISCONTINUITY');

  const evidence = freeze({
    evidenceVersion: LOCAL_RACE_EVIDENCE_VERSION,
    sampleIntervalMs: LOCAL_RACE_EVIDENCE_SAMPLE_MS,
    sampleCount: Number(s.sampleCount || 0),
    badSamples: Number(s.badSamples || 0),
    fingerprint: `fnv1a32:${(Number(s.hash || FNV_OFFSET) >>> 0).toString(16).padStart(8, '0')}`,
    timing: {
      firstSimTick: finite(s.firstSimTick),
      lastSimTick: finite(s.lastSimTick),
      lapTick,
      expectedMsFromTicks: expectedMs == null ? null : Math.round(expectedMs),
      clockDriftMs: driftMs == null ? null : Math.round(driftMs)
    },
    motion: {
      maxObservedSpeedPxS: Math.round(observed * 10) / 10,
      maxImpliedSpeedPxS: Math.round(implied * 10) / 10,
      maxStepDistancePx: Math.round(Number(s.maxStepDistancePx || 0) * 10) / 10,
      maxProgressDelta: Math.round(Number(s.maxProgressDelta || 0) * 10000) / 10000,
      bounds: s.minX == null ? null : {
        minX: Math.round(s.minX * 10) / 10,
        maxX: Math.round(s.maxX * 10) / 10,
        minY: Math.round(s.minY * 10) / 10,
        maxY: Math.round(s.maxY * 10) / 10
      }
    },
    diagnostics
  });

  const validation = freeze({
    version: 1,
    status: flags.length ? 'review' : 'clean',
    flags,
    // Local validation is evidence quality only. It is never authoritative
    // anti-cheat because a modified client could fabricate these values.
    authoritative: false
  });

  return freeze({ evidence, validation });
}
