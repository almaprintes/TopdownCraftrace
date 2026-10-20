// One wall-clock pause interval for the shipping race menu.
// The race scene stops advancing while its DOM pause menu is open, but
// performance.now() (used by lap timing, live DELTA and ghost samples) does not.
export function beginRacePauseClock(scene,now=performance.now()){
  if(!scene||Number.isFinite(scene._tdrPauseTimingStartedAt))return false;
  const start=Number(now);
  if(!Number.isFinite(start))return false;
  scene._tdrPauseTimingStartedAt=start;
  return true;
}

export function resumeRacePauseClock(scene,now=performance.now()){
  if(!scene)return 0;
  const startedAt=scene._tdrPauseTimingStartedAt;
  // Clear first: a second CONTINUAR/click must never compensate twice.
  scene._tdrPauseTimingStartedAt=NaN;
  if(!Number.isFinite(startedAt))return 0;
  const resumedAt=Number(now);
  if(!Number.isFinite(resumedAt)||resumedAt<startedAt)return 0;
  const excludedMs=resumedAt-startedAt;
  if(!(excludedMs>0))return 0;
  // A paused pre-race countdown must not synthesize an active lap.
  if(!scene.timing?.started||!Number.isFinite(scene.timing?.lapStart))return excludedMs;

  scene.timing.lapStart+=excludedMs;
  // These independent clocks must stay aligned with the authoritative lap.
  if(Number.isFinite(scene._tdrSessionLapClockStart))
    scene._tdrSessionLapClockStart+=excludedMs;
  if(Number.isFinite(scene._ghostLapStartPerf))
    scene._ghostLapStartPerf+=excludedMs;
  return excludedMs;
}
