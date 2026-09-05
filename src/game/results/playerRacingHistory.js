import { readRaceResultHistory } from './raceResults.js';

const HISTORY_SCHEMA_VERSION = 1;
const STORAGE_KEY = 'tdr2:playerRacingHistory:v1';

function safeJson(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function getStorage() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function setStorage(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return true; } catch { return false; }
}
function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function emptyHistory() {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'local-device',
    authority: 'client',
    verification: 'local-only',
    onlineEligible: false,
    remoteCollectionEnabled: false,
    totals: {
      laps: 0,
      validLaps: 0,
      reviewLaps: 0,
      totalLapTimeMs: 0
    },
    tracks: {},
    cars: {},
    bests: {},
    processedResultIds: []
  };
}

export function readPlayerRacingHistory() {
  const stored = safeJson(getStorage(), null);
  if (!stored || stored.schemaVersion !== HISTORY_SCHEMA_VERSION) return emptyHistory();
  return stored;
}

function keyBest(trackKey, carId) {
  return `${trackKey || 'track01'}::${carId || 'car'}`;
}

export function recordRaceResultInPlayerHistory(result) {
  if (!result?.resultId || !Number.isFinite(Number(result?.lapMs))) return readPlayerRacingHistory();
  const history = readPlayerRacingHistory();
  const seen = new Set(Array.isArray(history.processedResultIds) ? history.processedResultIds : []);
  if (seen.has(result.resultId)) return history;

  const trackKey = String(result.trackKey || 'track01');
  const carId = String(result.carId || 'car');
  const lapMs = Math.round(finite(result.lapMs));
  const status = String(result.localValidation?.status || 'unverified');

  history.totals.laps += 1;
  history.totals.totalLapTimeMs += lapMs;
  if (result.valid !== false) history.totals.validLaps += 1;
  if (status === 'review') history.totals.reviewLaps += 1;

  const track = history.tracks[trackKey] || { laps: 0, totalLapTimeMs: 0, bestLapMs: null, lastPlayedAt: null };
  track.laps += 1;
  track.totalLapTimeMs += lapMs;
  track.bestLapMs = track.bestLapMs == null ? lapMs : Math.min(track.bestLapMs, lapMs);
  track.lastPlayedAt = result.completedAt ?? Date.now();
  history.tracks[trackKey] = track;

  const car = history.cars[carId] || { laps: 0, totalLapTimeMs: 0, bestLapMs: null, lastUsedAt: null };
  car.laps += 1;
  car.totalLapTimeMs += lapMs;
  car.bestLapMs = car.bestLapMs == null ? lapMs : Math.min(car.bestLapMs, lapMs);
  car.lastUsedAt = result.completedAt ?? Date.now();
  history.cars[carId] = car;

  const bk = keyBest(trackKey, carId);
  const previous = history.bests[bk];
  if (!previous || lapMs < previous.lapMs) {
    history.bests[bk] = {
      trackKey,
      carId,
      lapMs,
      raceId: result.raceId,
      resultId: result.resultId,
      completedAt: result.completedAt ?? null,
      physicsVersion: result.physicsVersion || null,
      trackVersion: result.trackVersion || null,
      carBalanceVersion: result.carBalanceVersion || null,
      localValidationStatus: status,
      authority: 'client',
      onlineEligible: false
    };
  }

  history.processedResultIds = [...seen, result.resultId].slice(-5000);
  history.updatedAt = Date.now();
  setStorage(history);
  return history;
}

export function rebuildPlayerRacingHistoryFromRaceResults() {
  const rebuilt = emptyHistory();
  setStorage(rebuilt);
  for (const result of readRaceResultHistory()) recordRaceResultInPlayerHistory(result);
  return readPlayerRacingHistory();
}

export function createPlayerHistoryMigrationPackage() {
  const history = readPlayerRacingHistory();
  const raceResults = readRaceResultHistory();
  return {
    exportSchemaVersion: 1,
    createdAt: Date.now(),
    purpose: 'future-player-approved-migration',
    uploadEnabled: false,
    requiresExplicitPlayerAction: true,
    history,
    raceResults
  };
}

export function getPlayerRacingHistoryInfo() {
  return Object.freeze({
    schemaVersion: HISTORY_SCHEMA_VERSION,
    storageKey: STORAGE_KEY,
    remoteCollectionEnabled: false,
    automaticUploadEnabled: false,
    migrationRequiresExplicitPlayerAction: true
  });
}
