// Phaser reuses the StatsScene for both a personal statistics overview and
// the online leaderboard. A saved replay-return track must never override
// an explicit tap on ESTADÍSTICAS from the lobby.
export function resolveStatsInitialTrack(data,returnTrack=''){
  if(data?.statsView==='overview')return '';
  const direct=String(data?.raceControlTrackId||'').trim();
  if(direct)return direct;
  return String(returnTrack||'').trim();
}
