// A cached empty/missing leaderboard is not proof that Supabase has no records.
// Recover it once when Race Control is open, without repeated polling.
export function needsRaceControlCacheRecovery(policy){
  return !Array.isArray(policy?.cached?.payload)||policy.cached.payload.length===0;
}
