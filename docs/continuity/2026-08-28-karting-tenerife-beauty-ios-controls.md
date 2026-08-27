# Karting Tenerife Beauty Layer + iOS pedal input — 2026-08-28

## Context

Karting Tenerife is the second circuit being migrated to the same four-large-tile Beauty Layer pipeline used as the reference approach for Atlántico.

Current intended Karting Tenerife materials:

- road: `cleanAsphalt`
- shoulder/grass: `sparseGrass`
- outer/offroad: `rockyTrail02` with the same treatment as Atlántico
- Beauty Layer revision: `karting-tenerife-clean-asphalt-sparse-grass-v1`
- four world-aligned WebP tiles

The baked terrain is visual only. Track geometry, physics, checkpoints, timing, AI and kerb logic remain independent.

## Regression found after publishing the Tenerife bake

On iOS, Karting Tenerife entered the race but showed a flat/segmented grey legacy road above the baked terrain and suffered stutter. The performance overlay showed active legacy chunks (`CHUNK 25/73`) even though a working Beauty Layer should own the terrain and should not need legacy visual chunks.

### Root cause

`RaceWorldAlignedMaterialsScene` correctly activated the four baked Beauty Layer tiles and disabled/destroyed the legacy ground renderer. However, `RaceGraphicsPresetScene` subsequently enforced `track.cullRadiusCells = 1/2` again according to the selected graphics preset on every frame.

That re-enabled the legacy chunk renderer after the Beauty Layer had disabled it. Consequences:

- legacy grey asphalt could be drawn above the baked road;
- duplicate rendering work remained active;
- extra chunk/overlay work reduced performance, especially on iOS;
- the visual result made it appear that the Clean Asphalt bake had not loaded.

### Fix

Commit `50d4604206bc0782ae676da498396eb77c8b18ba` changes `RaceGraphicsPresetScene.js` so that when `_beautyLayerActive === true` and the Beauty Layer has not failed:

- `cullRadiusCells` stays at `0`;
- directional lookahead does nothing;
- graphics presets never reactivate legacy chunk/overlay rendering;
- particles can still obey the selected quality preset independently.

### Required validation for every future Beauty Layer circuit

After activating a baked circuit on-device:

1. verify the Beauty Layer is visibly present;
2. verify no legacy road is drawn above it;
3. with the performance diagnostic enabled, verify legacy active chunks do not return during driving;
4. drive across multiple areas of the world and zoom ranges;
5. validate both iOS and Android before marking the circuit approved;
6. only then freeze the circuit revision.

A Beauty Layer circuit must never rely on a graphics preset continually reactivating the old chunk renderer.

## iOS GAS/BRAKE long-press selection bug

A separate iOS issue was photographed during the same test: while holding the accelerator, Safari/WebView could visually select/magnify the pedal text. When the native selection/callout took control of the gesture, throttle input could stop responding.

There was already an iOS hardening layer (`user-select:none`, `-webkit-touch-callout:none`, selection/context-menu guards), so simply repeating those properties was not enough.

### Fix

Commit `337a648bd23b5cf240ec0e727c62b2ffd20f2377` strengthens `controlLayout.js`:

- `-webkit-user-drag:none` is applied to race controls;
- decorative/text children inside each pedal are made `pointer-events:none`;
- only the `.tdr-pedal` container remains the touch target;
- draggable state is explicitly disabled on descendants;
- existing context-menu, selection, gesture and double-tap guards remain in place.

This avoids Safari treating `GAS`, `ACELERADOR`, `FRENO` or their decorative elements as selectable content while preserving the existing pointer capture and continuous pedal input.

## Other open issue

Android had separately been reported to return to the lobby after selecting a race mode while iOS entered the race. Do not conflate that Android navigation/load issue with the iOS pedal-selection bug or the Tenerife Beauty Layer renderer regression. Diagnose it independently after the current iOS/Tenerife validation.
