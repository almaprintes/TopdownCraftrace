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
The asphalt shader adapts filtering to dynamic camera zoom. Live screenshots around this stage showed roughly 60 FPS and frame max around 16–17 ms, so the PBR shader itself was not showing the later 40 ms regression in the observed test.

### v6 — grass richness + irregular dirt shoulder
Added a second **full-world grass TileSprite** plus one large Graphics object containing many dirt ellipses and dry-grass strokes along both road edges.

This looked modestly better, but subsequent screenshots showed FPS around the high 20s and frame max in the mid/high 30 ms range. At first the regression was blamed on later rubber experiments.

### v7-v10 — rubber experiments — rejected
Several vector/decal/RenderTexture approaches were tried and rejected visually. The last version also showed FMAX around 43 ms. All custom rubber code was removed.

### Performance diagnosis after rubber rollback
After restoring the nominal v6 implementation, the user confirmed **FMAX still remained around 40 ms**. Therefore the rubber system was not the root cause of the sustained regression.

The timeline points much more strongly at the v6 environmental additions:
- before v6: shader-only screenshots showed frame max about 16–17 ms;
- after adding full-world grass variation + dense shoulder Graphics: screenshots moved into roughly 36–40 ms;
- removing rubber did not recover frame time.

For a clean A/B test, the active runtime has now been rolled back further to the **shader-only CraftPBR baseline**: exact road mask + asphalt PBR shader only. The full-world grass variation and procedural shoulder marks are removed from active rendering.

Commit for this performance isolation: `5a59553a6184f4bcbcaa46ef4c029ff08c50235e`.

## Current performance baseline under test
Active beauty pass now contains only:
- exact `track.geom.left/right` geometry mask;
- one CraftPBR asphalt TileSprite;
- `AsphaltPBRPipeline` with zoom-aware anti-moire filtering;
- stable existing border/kerb renderer.

Temporarily removed:
- second full-world grass TileSprite;
- procedural dirt/soil shoulder ellipses;
- dry-grass Graphics strokes;
- every rubber/groove experiment.

## Performance rule from this point
Do not add another visual layer until the iPhone baseline is measured again. Every future effect must be introduced one at a time and compared against `FMAX`.

If frame time returns to the previous ~16–20 ms range, reintroduce environmental detail only as lightweight localized or pre-baked assets, never another full-world translucent layer plus thousands of Graphics primitives.

If FMAX remains ~40 ms even with this shader-only baseline, investigate the shader / multi-texture filtering path next instead of making further visual additions.

## Explicitly untouched
- dynamic camera zoom behaviour/range
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
