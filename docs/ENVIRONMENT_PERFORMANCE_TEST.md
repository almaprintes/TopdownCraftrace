# Environment performance test — 2026-08-08

## Purpose

Increase visible environment density gradually and verify iPhone/Safari/Vercel performance over several complete laps before adding new asset families.

## Camera test

The first wide-camera preview (`min 0.70 / max 1.24`) was reported as barely perceptible on iPhone.

Current deliberate test values in `RaceWideCameraPreviewScene.js`:

- `_zoomGameplayMin = 0.62`
- `_zoomGameplayMax = 1.06`
- `_zoomKmhRef = 105`
- `_zoomLerp = 0.042`
- initial `zoom = 0.96`

This is intentionally more open so scenery can be judged while driving. Physics, track geometry, HUD and minimap are unchanged.

## Vegetation density test

`RaceEnvironmentLayer.js` now reuses the same four approved WebP textures but increases the scene from 4 sprites to a target of 12 static vegetation sprites arranged in four authored clusters around the lap.

Assets reused:

- `tree_deciduous_01.webp`
- `tree_conifer_01.webp`
- `shrub_round_01.webp`
- `shrub_flowers_01.webp`

Important performance properties:

- textures are loaded once;
- sprites are created once when the environment is built;
- no collision;
- no random scatter;
- no object creation in `update()`;
- placement still validates clearance from every nearby track section.

## Test protocol

1. Wait for Vercel to deploy commit `129ea6c` or later.
2. Drive at least 6–8 complete laps.
3. Specifically watch for progressive stutter after half a lap or after several laps, because that failure mode happened earlier in development.
4. Judge whether the wider camera improves circuit awareness and makes environment assets visible without making the car too small.
5. If performance remains stable, increase density in another controlled step and only then begin adding a new decoration asset family (barriers, signage, marshal posts, etc.).

## Rule

Do not jump from a handful of sprites to a finished decorated circuit. Increase density/families in measured stages so any performance regression can be attributed to a specific change.
