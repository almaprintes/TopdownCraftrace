# CraftPBR asphalt integration — 2026-08-24

## Goal
Replace the temporary/procedural asphalt beauty material on Karting Tenerife with the user-approved CraftPBR material while preserving the exact runtime road footprint.

## Source assets
Stored in `public/assets/materials/asphalt-pbr/`:
- `albedo.png`
- `normal.png`
- `roughness.png`
- `height.png`
- `ao.png`
- `metalness.png`

## Geometry invariant
The asphalt mask is still built exclusively from `track.geom.left/right`, using the exact per-sample quads previously validated with the solid-red debug mask. There is no widening, smoothing, offsetting or reinterpretation of the circuit geometry.

## Border invariant
No replacement edge polyline or kerb geometry is drawn by the beauty pass. The proven border/kerb renderer remains responsible for the white lines and red/white kerbs.

## Runtime
`RaceWorldAlignedMaterialsScene` remains the normal active RaceScene through `src/game/game.js`.

`RaceRealSurfaceAssetsScene` loads the CraftPBR maps from `assets/materials/asphalt-pbr/`.

## Iterations and lessons
### v1
Photographic CraftPBR albedo through the exact road mask.

### v2 / v3 — retired
2D Roughness/Height/AO compositing mostly darkened the road without convincing material response.

### v4 — WebGL material response
Dedicated `AsphaltPBRPipeline` consumes Albedo, Normal, Roughness and Height.

### v5 — dynamic zoom anti-moire
The asphalt shader adapts filtering to dynamic camera zoom. Some low-speed shimmer remains detectable only when deliberately looking for it.

### v6 — grass richness + irregular dirt shoulder
Added a second full-world grass TileSprite plus many dirt ellipses/dry-grass strokes. This produced only a modest visual gain and coincided with a large performance regression.

### v7-v10 — rubber experiments — rejected
Several vector/decal/RenderTexture approaches were tried and rejected visually. The final versions also worsened FMAX. All custom rubber code is removed from active runtime.

## Performance isolation timeline
After removing rubber, FMAX stayed around ~40 ms, proving rubber was not the sustained root cause.

The v6 environmental layers were then removed, leaving only exact road mask + one asphalt TileSprite + PBR shader. User live measurement on iPhone after this rollback:
- FPS: **51**
- FRAME MAX / FMAX: **23.4 ms**

This was a major recovery from ~40 ms but still slower than the earlier ~16–17 ms screenshots.

## Current A/B test — shader disabled
The user noted that the PBR shader barely changes the visible result, so the next test removes it completely to measure its real cost.

Active beauty pass now contains only:
- exact `track.geom.left/right` geometry mask;
- one CraftPBR asphalt TileSprite using **albedo only**;
- stable existing border/kerb renderer.

Temporarily inactive:
- `AsphaltPBRPipeline` application;
- Normal/Roughness/Height shader sampling;
- zoom-aware shader filtering;
- extra grass layer;
- shoulder Graphics;
- all rubber/groove code.

The shader implementation file remains in the repository for reference, but the active beauty pass no longer imports or applies it.

A/B commit: `f601e1063cd3de7921b570aaec7d78e7b692afae`.

## Decision rule
Measure FPS and FMAX on the same iPhone/circuit area:
- if FMAX improves materially from the 23.4 ms shader-on baseline, keep the shader disabled and favor the clean photographic albedo;
- if there is little/no difference, the remaining cost is more likely the masked full-world asphalt TileSprite / renderer path rather than the shader itself.

Do not add another visual effect until this A/B result is recorded.

## Explicitly untouched
- dynamic camera zoom behaviour/range
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
