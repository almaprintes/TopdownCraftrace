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

## Shader A/B result — confirmed expensive, disabled
The user noted that the PBR shader barely changes the visible result, so it was removed completely for a direct A/B test.

With the same race setup, exact road mask and CraftPBR albedo still active, but without `AsphaltPBRPipeline`, the user measured:
- **FMAX: 16–18 ms**

Compared with the shader-on baseline of **23.4 ms**, disabling the shader recovered roughly **5–7 ms of worst-frame time** while preserving almost all of the perceived asphalt quality.

Decision: **keep the custom PBR shader disabled in the active runtime**. The visual gain does not justify its cost on the target iPhone.

Active beauty pass now contains only:
- exact `track.geom.left/right` geometry mask;
- one CraftPBR asphalt TileSprite using **albedo only**;
- stable existing border/kerb renderer.

Inactive / retired from active runtime:
- `AsphaltPBRPipeline` application;
- Normal/Roughness/Height shader sampling;
- zoom-aware shader filtering;
- extra full-world grass layer;
- procedural shoulder Graphics;
- all rubber/groove code.

The shader implementation file may remain in the repository for reference, but it is not part of the production render path.

A/B shader-off commit: `f601e1063cd3de7921b570aaec7d78e7b692afae`.

## Current performance baseline
Use **FMAX 16–18 ms** as the accepted visual/performance baseline for Karting Tenerife with photographic asphalt active.

Future visual work must preserve approximately this frame-time envelope. Any effect that adds more than a small measurable cost must produce an obvious visual gain to survive.

## Next visual direction
Do not reintroduce runtime PBR or procedural rubber. Prefer:
1. pre-baked/static texture detail;
2. very small localized overlays rather than full-world layers;
3. pre-authored kerb wear or terrain patches;
4. sparse props/shadows with strict object-count control.

Every addition should be tested independently against the **16–18 ms FMAX baseline**.

## Explicitly untouched
- dynamic camera zoom behaviour/range
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
