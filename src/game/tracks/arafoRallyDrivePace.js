// Arafo -> Los Loros has a very narrow, hairpin-heavy photo track.
// Its touch accelerator is a digital button, not an analog pedal: even a
// quick press requests full power. Apply these race-local multipliers to the
// actual frame drive calculation, never to car specs or saved upgrades.
export const ARAFO_RALLY_TRACK_ID = 'rally-arafo-los-loros';
export const ARAFO_RALLY_PACE = Object.freeze({
  acceleration: 0.28,
  forwardSpeed: 0.30,
  reverseSpeed: 0.60,
  brakeForce: 1.15,
  throttleRampSeconds: 0.75,
  initialThrottleFraction: 0.25
});
export const isArafoRallyPace = trackKey => trackKey === ARAFO_RALLY_TRACK_ID;

// Time-based ramp: 30fps/60fps feel the same, and releasing the gas
// resets the ramp so short taps can't catapult the car through 3 hairpins.
export function nextArafoThrottleHeld(trackKey, previousSeconds, pressingGas, dt) {
  if (!isArafoRallyPace(trackKey) || !pressingGas) return 0;
  return Math.min(ARAFO_RALLY_PACE.throttleRampSeconds,
    Math.max(0, Number(previousSeconds)||0) + Math.max(0, Number(dt)||0));
}

export function arafoRallyDrivePace(trackKey, inputs, heldSeconds) {
  if (!isArafoRallyPace(trackKey)) return inputs;
  const progress=Math.max(0,Math.min(1,
    (Number(heldSeconds)||0)/ARAFO_RALLY_PACE.throttleRampSeconds));
  const ramp=ARAFO_RALLY_PACE.initialThrottleFraction+
    (1-ARAFO_RALLY_PACE.initialThrottleFraction)*progress;
  return {
    ...inputs,
    accel: inputs.accel*ARAFO_RALLY_PACE.acceleration*ramp,
    maxFwd: inputs.maxFwd*ARAFO_RALLY_PACE.forwardSpeed,
    maxRev: inputs.maxRev*ARAFO_RALLY_PACE.reverseSpeed,
    brakeForce: inputs.brakeForce*ARAFO_RALLY_PACE.brakeForce
  };
}
