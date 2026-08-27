# 2026-08-27 — Android race performance + kerb haptics

## Reported on device
- Xiaomi Redmi 11 / Android: race feels much slower than iPhone while the stopwatch advances normally, producing worse lap times.
- Kerb/piano haptics still not felt on Android or iPhone web.

## Root cause found in timing/physics path
`RaceScene.update()` computes driving dt as `Math.min(0.05, deltaMs / 1000)` while the visible stopwatch uses `performance.now()` wall time.
Therefore, if rendering falls below ~20 FPS (frame delta > 50 ms), driving simulation deliberately stops consuming all elapsed wall time while the stopwatch keeps consuming it. This can make the car physically slower relative to the clock on an overloaded device. This is a fairness issue; performance must stay above that threshold until the base simulation is moved to a true fixed timestep/substep architecture.

## Performance work applied
- Added `RaceMobilePerformanceScene.js`.
- Replaced the legacy minimap projection that scanned the entire centerline every frame with a cached local-segment search and a global fallback only after teleports/resets.
- Added conservative emergency particle trimming only after sustained >42 ms average frames.
- Added detailed update, frame and render profilers plus an A/B render isolation cycle.
- Redmi measurements show the bottleneck is overwhelmingly render-side: roughly 50–73 ms render time while update stays near 2 ms.
- iPhone 16 Pro Max showed a different pattern in the same diagnostic path, with much lower render time and more residual/other frame time.
- A/B results on Redmi: removing UI camera has almost no benefit; removing asphalt overlay gives only a small benefit; removing all track chunks saves roughly 10–12 ms but still leaves an unacceptably expensive frame. Therefore track chunks matter but are not the only bottleneck.

## Real graphics presets
The first attempt at a user-facing render-resolution slider was rejected after diagnostics proved Phaser still reported `RES 1.00`; it was not a reliable real framebuffer reduction in the current Phaser 3.90 + RESIZE setup. The control has therefore been removed instead of leaving a cosmetic/non-functional setting.

`RaceGraphicsPresetScene.js` now makes the existing quality preset affect actual race rendering:
- **LOW**: `cullRadiusCells = 1` (3×3 neighborhood instead of 5×5), disables directional lookahead chunks, disables asphalt overlay, disables non-essential particles.
- **MEDIUM**: normal chunk radius but asphalt overlay disabled; user particle preference respected.
- **HIGH**: full current render path.
- Game renderer uses `powerPreference: 'high-performance'` instead of `low-power`.
- Settings now expose only controls with a real effect: LOW/MEDIUM/HIGH, 30/45/60 target FPS, antialiasing, particles, performance HUD. LOW automatically selects AA OFF and particles OFF before applying.

Commits for this stage:
- `5aba0d6846672b4133469a8da69d1c6981fb7679` — real runtime graphics preset layer.
- `a9873d66f8d75caf9a9cc0ec0e6f164634c4a4af` — activate preset scene and remove fake Phaser resolution wiring.
- `3063ec5ccb47e1707ced1fdd78f9299467aae549` — remove non-functional render-resolution UI and describe real preset effects.

## Kerb detector correction
The prior haptic detector used a generated turn-based approximation of where kerbs should be. Current tracks can draw exported kerb geometry (`geometry.trackOuter/curbOuter` and `trackInner/curbInner`), so visible pixels and detected surface could disagree.
`RaceKerbSurfaceScene.js` now detects the exact exported red/white kerb bands first and keeps the old generated detector only as a fallback for legacy tracks.
Commit: `32d348dfcac097ba58752fcee09db43e6864751d`.

## Next validation
1. Hard reload Android build.
2. Select LOW, AA OFF, particles OFF, 60 FPS target, apply once.
3. Re-run Karting Canarias with the performance HUD enabled and compare render time, visible object count and active chunks against the previous ~50–73 ms render measurements.
4. If LOW still cannot hold a playable frame rate, extend render isolation to terrain/background, environment decoration, cars/shadows and effects families before degrading more visuals globally.
5. Independently, replace the 50 ms capped driving dt with a proper fixed timestep/substep architecture so competitive lap time never depends on device frame rate.
6. Deliberately drive with two wheels over a clearly visible red/white piano and continue validating Android vibration/camera micro-rumble once rendering is stable.
