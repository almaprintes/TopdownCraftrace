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

### v1
The first live integration used one Albedo layer plus restrained AO. It proved the material and exact mask worked, but the road still looked too uniform and the mineral aggregate read too large at gameplay zoom.

### v2 — multiscale material variation
`raceExactRuntimeBeautyPass.js` now:
- reduces the base albedo scale so aggregate reads finer at gameplay distance;
- keeps fine AO aligned to the albedo;
- reuses the real Roughness map at a much larger world scale with MULTIPLY blending for broad dark/polished variation;
- reuses the real Height map at another large scale with very low SCREEN blending for soft worn highlights;
- adds a second large-scale AO sample at a different offset/frequency to break uniformity;
- does **not** composite the tangent-space Normal map as color, avoiding purple contamination;
- keeps Normal loaded for a future proper WebGL lighting shader;
- keeps Metalness unused visually because asphalt is correctly non-metallic.

This replaces the previous procedural repairs, aggregate dots and center rubber stripe. The goal is organic multiscale variation derived from the actual PBR source maps, not painted game effects.

## Explicitly untouched
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
