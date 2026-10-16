# Crown Cuper — experimental handling physics (16 October 2026)

## Decision and scope
- Active source: `main`; game identity `crown_cuper` only (both original and gold skins).
- Experimental code is **DEV-only** (guard `!IS_PROD_BUILD` in `src/game/game.js`). Production bundle does not install this override; public Android Google Play version is not modified.
- Do **not** alter the original CROWN Axis handling, Cuper shop upgrades, speed limits, collision shapes, vehicle dimensions, reward flow, or tracks.
- Keep Arcade Physics as the **single integrator** of position and collisions. Extra physical model runs once after the regular race update and only touches velocity and a bounded angular correction for the Cuper.
- Handbrake and replay controllers retain full authority; Cuper supplemental dynamics are bypassed in those modes.
- Tested by `scripts/cuper-driving-physics-smoke.mjs` during GitHub Pages build.
- No Android APK or Google Play release authorized by this change.

## Files
- `src/game/cars/cuperDrivingPhysics.js`: pure, time-normalized local velocity solver and opt-in installer. Model version `cuper-dev-1`.
- `src/game/game.js`: installer invoked only under `!IS_PROD_BUILD`, after existing race-runtime patches, in lazy race entry.
- `.github/workflows/pages.yml`: focused regression must pass before DEV deployment.
- `scripts/cuper-driving-physics-smoke.mjs`: asserts Cuper isolation, yaw/lift, tyre friction, finite physics, 30/60 Hz consistency, handbrake/replay guards, production guard.

## Source research and attribution
Independent adaptation **inspired by**, not copied verbatim from:
- Ishan Manjrekar, `ishanmanjrekar/topdown-2d-car-engine`, MIT License © 2026: local-frame velocity decomposition, lateral relaxation and corner scrub. https://github.com/ishanmanjrekar/topdown-2d-car-engine
- Otto Seiskari, `oseiskar/js-car`, MIT License © 2019: physical fore/aft axle friction, lateral momentum and cornering breakaway as design ideas. https://github.com/oseiskar/js-car

We retain our actual Phaser controller, input ramp, reverse, upgrades, drivetrain, longitudinal simulation, surface setup, and bicycle steering. No p2.js or additional physics engine is installed.

## Review and user testing
Before considering wider adoption, drive **Cuper** against **CROWN Axis** on the same course, with both 30 FPS and 60 FPS devices, testing:
1. Straight-line speed and launch acceleration; neither may gain artificial extra velocity.
2. Hairpin steering/oversteer with throttle lifted vs held, and smooth straight-line recovery.
3. Braking, handbrake, reversing, collisions, grassy/offroad surfaces.
4. Recording/replay/ghost consistency, online PB fairness, session results.
5. iPhone temperature / Android performance. Profile inputs and yaw corrections are O(1) per frame.

This is a tunable *experimental driving feel*, not a validated real-world vehicle dynamics model. If replay or ranking parity is not proven, retain DEV-only implementation and separate times by physics version before any future public release.

## Rollback
Remove/disable the installer in `src/game/game.js`; the original Cuper factory spec remains identical to Axis baseline. The pure module can remain without changing any other car or saved progress.

## 16 October update — DEV 1.2.231
- User confirmed previous Cuper solver slowed the car too much. The extra scrub was stacked atop base Arcade friction and inertia reduction.
- `cuperDrivingPhysics.js` model `cuper-dev-2` preserves base engine speed at full throttle, retaining yaw and lateral momentum but only applying mild, bounded off-throttle scrub. No engine, gear, garage, car-spec or other vehicle changes.
- Karting Americas had a separate blocker: closed `circuit` exported with `startLine` and `finishLine`; `RaceScene` treats such a pair as an open stage, so no circuit laps count. The build-time importer now clears `startLine` on this **closed** track.
- `closedCircuitGateOrder.js` normalizes the two authored checkpoint crossing normals and orders checkpoints relative to the finish by centerline distance. Missing/unreachable CP gates are generated at ~1/3 and 2/3 along the existing centerline, without changing the source photo, shape or collisions.
- `karting-americas-official-smoke.mjs` asserts that generated checkpoints physically intersect the centerline in ordered forward directions, and source image/lines remain untouched.
- Test manually on Karting Americas: race startup, first finish + CP1 + CP2 + finish = counted lap; several laps; online submission only after recording. Validate Cuper peak speed and hairpin control separately. No Google Play publication.

## Update — Cuper power and Karting Américas paddock stripe (DEV 1.2.232)
- Direct feedback: Cuper drift/steering feel is approved, but acceleration and apparent top speed were still too low.
- The Cuper-only development physics installer now applies power tune `cuper-dev-3` on completed race create: +50% effective acceleration, +20% top-speed ceiling and 35% lower passive drag. The original cornering, handbrake, weight shift, rendering and all other cars' behavior remain untouched. This adjustment is guarded by `!IS_PROD_BUILD`, not added to the public car specs.
- The settings are idempotent for race re-entry and also update the pre-captured surface baseline to avoid being reverted each frame on dirt/asphalt tracks.
- Karting Américas paints a second paddock stripe on the same physical finish axis. The importer now exports an *invisible*, collinear logical extension at `track.meta.paddockFinishLine`, with the original graphical finish untouched. Runtime uses a direction-aware, swept segment intersection on this extra gate only for Karting Américas, within the existing CP1→CP2→finish and cooldown logic. No change to .tdrtrack, centerline, photo, collision barriers or other tracks.
- Automated tests: `scripts/cuper-driving-physics-smoke.mjs` (power, isolation, reset, 30/60 FPS); `scripts/karting-americas-official-smoke.mjs` (paddock crossing on the aligned paint, no backwards/stationary crossing, ordered checkpoint requirement).
- Manual test requested: accelerate Cuper on asphalt vs Crown Axis; then drive Karting Américas past the paddock-aligned stripe after CP1/CP2 and check lap counter.

## DEV 1.2.233 — 16 October visual calibrations from owner exports

Two original owner JSON exports were read in full and applied as **global source defaults**, without overwriting the unrelated legacy public community override dataset:
- `car-overrides.json` (updated_at 2026-10-16T16:35:46.243Z) specifies `crown_cuper.visualScale=1.10` and `veloce_juanicar_c220.visualScale=1.20`. Both were updated in `src/game/cars/carSpecs.js`; saved per-user editor overrides can still supersede them.
- The old Cuper/Juanicar collision radii were decoupled from their new sizes with `collisionScale=1.03` and `collisionScale=1.08`. Only the player's and debug grid cars' sprite sizes grow, **no physical hitbox change**.
- `tdr-vehicle-lights.json` calibrates Cuper Original: front pair (X ±.227604, Y -.385, size .066944), rear left (X -.253038, Y .31204, size .152604), rear right (X +.253038, Y .31204, size .148038), front intensity 1, halo .32, rear intensity 1, halo .18. All positions/sizes from the owner export remain exact.
- The one subjective correction explicitly requested by the owner: *rear parking lamps are too red*. Full braking stays `#ff0000`, intensity 1. **Position** uses muted `#8e2925` with 28% opacity instead of the exported 52% bright red. Added `rear.tailColor` normalization, real-race renderer support, and color selector in Admin Hub preview, so future exports preserve it.
- The Gold skin intentionally inherits Original calibration unless separately authored. The physical paint assets, braking behavior, other vehicles and image sprites remain untouched.
- Tests: `scripts/vehicle-lights-calibration-smoke.mjs`. No APK/Google Play release.
