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
- Shipping race scene now uses this layer.
- Commits: `839b5e20f8a1bbfe78707bdc1c46b61fb665bc13`, `08d22ffc4d7418bb659ebd3c01b6a38b6350ad5f`.

## Kerb detector correction
The prior haptic detector used a generated turn-based approximation of where kerbs should be. Current tracks can draw exported kerb geometry (`geometry.trackOuter/curbOuter` and `trackInner/curbInner`), so visible pixels and detected surface could disagree.
`RaceKerbSurfaceScene.js` now detects the exact exported red/white kerb bands first and keeps the old generated detector only as a fallback for legacy tracks.
Commit: `32d348dfcac097ba58752fcee09db43e6864751d`.

## Next validation
1. Hard reload Android build.
2. Re-run same car + same circuit as iPhone.
3. Check whether movement is now smooth and lap time converges toward iPhone result.
4. Deliberately drive with two wheels over a clearly visible red/white piano and check for Android vibration/camera micro-rumble.
5. If Android still spends frames over 50 ms, profile the remaining race update chain and then replace the 50 ms capped driving dt with a proper fixed timestep/substep solution rather than another platform-specific multiplier.
