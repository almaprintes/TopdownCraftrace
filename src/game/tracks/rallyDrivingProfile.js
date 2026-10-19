// Shared, frame-local rally handling. Opt in with drivingProfile: 'RALLY' on
// future open stages. Do not rewrite car specs, upgrades or closed circuits.
export const ARAFO_RALLY_TRACK_ID='rally-arafo-los-loros';
export const RALLY_DRIVING_PROFILE_ID='RALLY';
export const RALLY_DRIVING_PROFILE=Object.freeze({
  acceleration:1.00,forwardSpeed:0.22,reverseSpeed:0.60,brakeForce:1.15,
  throttleRampSeconds:0.22,initialThrottleFraction:0.75,
  steering:1.35,artificialBrakeYaw:false
});
export function getRallyDrivingProfile(trackKey,meta) {
  if(trackKey===ARAFO_RALLY_TRACK_ID)return RALLY_DRIVING_PROFILE;
  if(meta?.closed===false && meta?.raceType==='stage' &&
     String(meta?.drivingProfile||'').toUpperCase()===RALLY_DRIVING_PROFILE_ID)
    return RALLY_DRIVING_PROFILE;
  return null;
}
export function nextRallyThrottleHeld(profile,previousSeconds,pressingGas,dt) {
  if(!profile||!pressingGas)return 0;
  return Math.min(profile.throttleRampSeconds,
    Math.max(0,Number(previousSeconds)||0)+Math.max(0,Number(dt)||0));
}
export function applyRallyDriveProfile(profile,inputs,heldSeconds) {
  if(!profile)return inputs;
  const progress=Math.max(0,Math.min(1,
    (Number(heldSeconds)||0)/profile.throttleRampSeconds));
  const ramp=profile.initialThrottleFraction+
    (1-profile.initialThrottleFraction)*progress;
  return {...inputs,
    accel:inputs.accel*profile.acceleration*ramp,
    maxFwd:inputs.maxFwd*profile.forwardSpeed,
    maxRev:inputs.maxRev*profile.reverseSpeed,
    brakeForce:inputs.brakeForce*profile.brakeForce};
}
