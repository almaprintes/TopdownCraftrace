// Backwards-compatible API; rallyDrivingProfile.js is the single source.
import {ARAFO_RALLY_TRACK_ID,RALLY_DRIVING_PROFILE,getRallyDrivingProfile,
  nextRallyThrottleHeld,applyRallyDriveProfile} from './rallyDrivingProfile.js';
export {ARAFO_RALLY_TRACK_ID};
export const ARAFO_RALLY_PACE=RALLY_DRIVING_PROFILE;
export const isArafoRallyPace=key=>key===ARAFO_RALLY_TRACK_ID;
export const nextArafoThrottleHeld=(key,seconds,pressingGas,dt)=>
  nextRallyThrottleHeld(getRallyDrivingProfile(key),seconds,pressingGas,dt);
export const arafoRallyDrivePace=(key,inputs,seconds)=>
  applyRallyDriveProfile(getRallyDrivingProfile(key),inputs,seconds);
