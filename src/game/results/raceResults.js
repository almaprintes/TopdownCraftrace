const RESULT_SCHEMA_VERSION = 1;
const HISTORY_LIMIT = 100;
const HISTORY_KEY = 'tdr2:raceResults:v1';
const PB_PREFIX = 'tdr2:personalBest:v1:';
const GHOST_PREFIX = 'tdr2:ghost:';

export const RACE_RESULT_VERSIONS = Object.freeze({
  schemaVersion: RESULT_SCHEMA_VERSION,
  physicsVersion: 'physics-v1',
  carBalanceVersion: 'car-balance-v1'
});

function safeJson(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export function createUuid() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    if (globalThis.crypto?.getRandomValues) {
      const b = new Uint8Array(16);
      globalThis.crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map(v => v.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
  } catch {}
  return `uuid-fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeTrackVersion(track) {
  const raw = track?.meta?.version ?? track?.version ?? track?.meta?.revision ?? track?.revision;
  return raw == null || raw === '' ? 'track-v1' : String(raw);
}

function pbKey(trackKey, carId) {
  return `${PB_PREFIX}${trackKey || 'track01'}:${carId || 'car'}`;
}

function ghostKey(trackKey, carId) {
  return `${GHOST_PREFIX}${trackKey || 'track01'}:${carId || 'car'}`;
}

export function readRaceResultHistory() {
  const parsed = safeJson(storageGet(HISTORY_KEY), null);
  const list = Array.isArray(parsed?.history) ? parsed.history : [];
  return list.filter(r => r && r.schemaVersion === RESULT_SCHEMA_VERSION && r.raceId && Number.isFinite(Number(r.lapMs))).slice(-HISTORY_LIMIT);
}

function writeRaceResultHistory(history) {
  return storageSet(HISTORY_KEY, JSON.stringify({ v: RESULT_SCHEMA_VERSION, history: history.slice(-HISTORY_LIMIT) }));
}

export function readPersonalBest(trackKey, carId) {
  const pb = safeJson(storageGet(pbKey(trackKey, carId)), null);
  return pb?.raceId && Number.isFinite(Number(pb?.lapMs)) ? pb : null;
}

function writePersonalBest(result) {
  const pb = Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    raceId: result.raceId,
    resultId: result.resultId,
    trackKey: result.trackKey,
    carId: result.carId,
    lapMs: result.lapMs,
    completedAt: result.completedAt,
    source: result.source
  });
  storageSet(pbKey(result.trackKey, result.carId), JSON.stringify(pb));
  return pb;
}

export function createRaceResult({
  raceId,
  trackKey,
  carId,
  lapMs,
  lapIndex = null,
  valid = true,
  completedAt = Date.now(),
  track = null,
  source = 'runtime',
  legacy = false
}) {
  const result = {
    schemaVersion: RESULT_SCHEMA_VERSION,
    resultId: createUuid(),
    raceId: raceId || createUuid(),
    completedAt: completedAt == null ? null : (Number.isFinite(Number(completedAt)) ? Number(completedAt) : null),
    trackKey: String(trackKey || 'track01'),
    carId: String(carId || 'car'),
    lapMs: Math.round(Number(lapMs)),
    lapIndex: Number.isFinite(Number(lapIndex)) ? Number(lapIndex) : null,
    valid: valid !== false,
    physicsVersion: RACE_RESULT_VERSIONS.physicsVersion,
    trackVersion: normalizeTrackVersion(track),
    carBalanceVersion: RACE_RESULT_VERSIONS.carBalanceVersion,
    source: String(source || 'runtime'),
    legacy: !!legacy
  };
  return Object.freeze(result);
}

export function persistRaceResult(result) {
  if (!result || result.schemaVersion !== RESULT_SCHEMA_VERSION || !result.raceId || !Number.isFinite(Number(result.lapMs))) {
    return { saved: false, isPersonalBest: false, personalBest: null };
  }

  const history = readRaceResultHistory();
  if (!history.some(r => r.resultId === result.resultId)) {
    history.push(result);
    writeRaceResultHistory(history);
  }

  const previous = readPersonalBest(result.trackKey, result.carId);
  const isPersonalBest = result.valid !== false && (!previous || Number(result.lapMs) < Number(previous.lapMs));
  const personalBest = isPersonalBest ? writePersonalBest(result) : previous;
  return { saved: true, isPersonalBest, personalBest };
}

export function linkGhostToRaceResult(result) {
  if (!result?.raceId || !result?.trackKey || !result?.carId) return false;
  const key = ghostKey(result.trackKey, result.carId);
  const ghost = safeJson(storageGet(key), null);
  if (!ghost || !Array.isArray(ghost.samples) || !Number.isFinite(Number(ghost.lapMs))) return false;
  if (Math.abs(Number(ghost.lapMs) - Number(result.lapMs)) > 2) return false;

  const linked = {
    ...ghost,
    raceId: result.raceId,
    resultId: result.resultId,
    raceResultSchemaVersion: RESULT_SCHEMA_VERSION
  };
  return storageSet(key, JSON.stringify(linked));
}

export function migrateLegacyPersonalBest({ trackKey, carId, track = null, ttBest = null, ghost = null }) {
  const existing = readPersonalBest(trackKey, carId);
  if (existing) return existing;

  const ghostData = ghost || safeJson(storageGet(ghostKey(trackKey, carId)), null);
  const ghostMs = Number(ghostData?.lapMs);
  const ttMs = Number(ttBest?.lapMs);
  const lapMs = Number.isFinite(ghostMs) && ghostMs > 0 ? ghostMs : (Number.isFinite(ttMs) && ttMs > 0 ? ttMs : null);
  if (!lapMs) return null;

  const legacyResult = createRaceResult({
    raceId: ghostData?.raceId || createUuid(),
    trackKey,
    carId,
    lapMs,
    completedAt: Number(ghostData?.completedAt ?? ghostData?.t) || null,
    track,
    source: 'legacy-migration',
    legacy: true
  });
  persistRaceResult(legacyResult);
  linkGhostToRaceResult(legacyResult);
  return readPersonalBest(trackKey, carId);
}

export function getRaceResultStorageInfo() {
  return Object.freeze({ schemaVersion: RESULT_SCHEMA_VERSION, historyLimit: HISTORY_LIMIT, historyKey: HISTORY_KEY });
}
