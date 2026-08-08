// src/game/scenes/RaceEnvironmentLayer.js
// Environment reset.
//
// The previous procedurally-painted placeholder furniture has deliberately
// been removed. Track geometry, kerbs, timing, physics and HUD are untouched.
//
// Next environment pass will use authored top-down semi-realistic animated
// assets (vegetation, guardrails, tyre walls, concrete blocks, fencing,
// marshal/control buildings, gantries, grandstands, tents, containers,
// generators, portable facilities, boards, braking markers, flags, cones,
// cameras, windsocks, gravel/terrain details, etc.) rather than synthetic
// Canvas primitives.

export function addCircuitEnvironment(scene, center, defaultTrackW = 160) {
  if (!scene || !Array.isArray(center) || center.length < 24) return [];

  // Keep the integration point alive so RaceScene does not need to change and
  // the proven circuit renderer remains isolated from environment work.
  const placed = [];
  scene._circuitEnvironment = placed;
  return placed;
}
