// CrafRace LIVE 2–4: pure, preview-only grid planner.
// This is NOT an authorization source. Supabase must own seats and readiness.
// No live mode imports this module until the multi-pilot backend is released.
export const LIVE_MIN_PILOTS = 2;
export const LIVE_MAX_PILOTS = 4;
export const LIVE_AI_DIFFICULTIES = Object.freeze([1, 2, 3]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Compute an invitation lobby's provisional seats. An arriving human takes a
 * provisional AI slot; bots only become real participants once the host starts.
 * Only server-validated, join-order UUIDs may be passed to this function.
 */
export function planCrafRaceLiveGrid({
  hostId, guestIds = [], readyIds = [], capacity = 2,
  fillWithAi = false, aiDifficulty = 2
} = {}) {
  if (!UUID.test(hostId)) throw new Error('Valid host identity required');
  if (!Number.isInteger(capacity) || capacity < LIVE_MIN_PILOTS || capacity > LIVE_MAX_PILOTS)
    throw new Error('Capacity must be between 2 and 4');
  if (!Array.isArray(guestIds) || !Array.isArray(readyIds))
    throw new Error('Pilot and readiness lists required');
  if (typeof fillWithAi !== 'boolean' || !LIVE_AI_DIFFICULTIES.includes(aiDifficulty))
    throw new Error('Invalid AI preferences');

  const humans = [hostId, ...guestIds];
  if (humans.length > capacity || humans.some(id => !UUID.test(id)) ||
      new Set(humans).size !== humans.length)
    throw new Error('Invalid or duplicate human participants');
  if (readyIds.some(id => !humans.includes(id)) || new Set(readyIds).size !== readyIds.length)
    throw new Error('Ready identities must be unique joined humans');

  const ready = new Set(readyIds);
  const seats = humans.map((playerId, index) => Object.freeze({
    index, kind: 'human', playerId, ready: ready.has(playerId)
  }));
  const botCount = fillWithAi ? capacity - humans.length : 0;
  for (let index = humans.length; index < capacity; index++) {
    if (fillWithAi) seats.push(Object.freeze({
      index, kind: 'ai', botId: `ai-seat-${index + 1}`,
      difficulty: aiDifficulty, ownerId: hostId, ready: true
    }));
    else seats.push(Object.freeze({index, kind: 'empty'}));
  }
  const participantCount = humans.length + botCount;
  return Object.freeze({
    capacity, fillWithAi, aiDifficulty, humanCount: humans.length,
    aiCount: botCount, participantCount,
    canStart: participantCount >= LIVE_MIN_PILOTS && humans.every(id => ready.has(id)),
    seats: Object.freeze(seats)
  });
}
