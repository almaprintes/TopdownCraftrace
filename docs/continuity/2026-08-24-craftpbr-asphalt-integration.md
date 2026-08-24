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

The visible 2D race pass currently uses Albedo plus a restrained AO layer. Normal/Roughness/Height/Metalness are loaded and reserved for a later WebGL shader/PBR pass; they are not approximated procedurally.

## Geometry invariant
The asphalt mask is still built exclusively from `track.geom.left/right`, using the exact per-sample quads previously validated with the solid-red debug mask. There is no widening, smoothing, offsetting or reinterpretation of the circuit geometry.

## Border invariant
No custom edge stroke, dirt stroke or replacement kerb geometry is drawn by the CraftPBR beauty pass. The proven border/kerb renderer in the base race scene remains responsible for those visuals. This specifically avoids reintroducing the previously fixed twisted-line artefacts.

## Removed from beauty pass
The previous stacked asphalt layer, micro layer, generated repair patches, aggregate dots, rubber center stripe and procedural overlay were removed from the runtime beauty pass. They created visible banding/repetition and fought the photographic material.

## Runtime
`RaceWorldAlignedMaterialsScene` remains the normal active RaceScene through `src/game/game.js`.

`RaceRealSurfaceAssetsScene` now loads the CraftPBR maps from `assets/materials/asphalt-pbr/`.

`raceExactRuntimeBeautyPass.js` renders the photographic albedo world-space through the exact runtime mask and adds AO at low opacity. No gameplay systems are changed.

## Explicitly untouched
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
