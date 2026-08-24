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
No custom edge stroke, dirt stroke or replacement kerb geometry is drawn by the CraftPBR beauty pass. The proven border/kerb renderer in the base race scene remains responsible for those visuals. This specifically avoids reintroducing the previously fixed twisted-line artefacts.

## Runtime
`RaceWorldAlignedMaterialsScene` remains the normal active RaceScene through `src/game/game.js`.

`RaceRealSurfaceAssetsScene` loads all six CraftPBR maps from `assets/materials/asphalt-pbr/`.

## Iterations
### v1
One photographic Albedo layer plus restrained AO. This proved the new material and exact mask worked.

### v2 / v3
Tried compositing Roughness/Height/AO as 2D grayscale layers at different scales. In live iPhone tests this mostly made the road darker; the intended material response was not convincingly visible. This approach is retired.

### v4 — real WebGL material response
A dedicated `AsphaltPBRPipeline` now handles the visible road surface when Phaser is running in WebGL.

The shader consumes:
- Albedo as the base colour;
- Normal as real tangent-space micro-surface direction;
- Roughness to control the strength of broad, weak asphalt highlights;
- Height as restrained micro-relief/tonal variation.

The lighting direction is fixed and soft to read as outdoor daylight from the top-down camera. The aim is perceptible surface relief and material response on a phone screen without making the asphalt look wet, metallic or exaggerated.

The previous fake 2D Roughness/Height/AO stacks are removed. If WebGL or the custom pipeline is unavailable, the game falls back to the clean photographic Albedo only.

`AO` and `metalness` remain loaded as source material maps. Metalness is correctly black for asphalt. AO can be incorporated later if the shader needs further refinement after live validation.

## Explicitly untouched
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
