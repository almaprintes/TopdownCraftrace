# Rocky off-road material — 2026-08-24

## User intent
The 4K `rocky_terrain_diff_4k.jpg` material is an **OFF-ROAD** surface, not a replacement for grass.

Live validation of the first integration showed the texture itself looked excellent, but it was incorrectly assigned to the scene's global `grass` visual slot, which made every non-asphalt area rocky. User feedback: "Se ve brutal pero te dije como offroad no como hierva".

## Corrected visual model
The base race renderer historically uses the texture key `grass` as the world background. To avoid changing physics or the old renderer contract:

- `grass` key now carries `assets/materials/offroad/rocky_terrain_diff_4k.jpg` and therefore visually represents the world **off-road** background.
- `grassTrack` is a separate texture key loading `assets/materials/grass-real.webp`.
- `raceExactRuntimeBeautyPass.js` builds an exact visual mask for the existing authored grass margin from `track.geom.grass.left/right` together with `track.geom.left/right`.
- The grass mask is a ring only: road edge -> authored outer grass edge on both sides.
- Asphalt remains the Poly Haven `clean_asphalt_diff_2k.jpg` through the exact road mask.

This produces three visually distinct surface zones:
1. asphalt inside `track.geom.left/right`;
2. grass only in the existing authored grass margin;
3. rocky terrain everywhere outside that grass margin.

## Geometry and gameplay invariants
No new surface geometry is invented. The visual grass band uses the exact arrays already produced by TrackBuilder.

Untouched:
- physics
- surface classification
- FORGE off-road behavior
- AI
- checkpoints
- lap timing
- track.geom generation
- white borders
- kerbs
- dynamic camera zoom

## Performance
The rocky 4K JPEG is ~10.75 MB on disk. First live screenshot with it used globally showed ~56 FPS and FMAX 17.9 ms, indicating the large JPEG itself was not causing the previous shader-style regression.

The corrected implementation adds one masked grass TileSprite for the authored grass ring. This must now be measured on iPhone against the accepted ~16-18 ms FMAX baseline. If the extra masked layer materially harms frame time, the next approach should be a pre-baked/static combined terrain asset rather than procedural runtime effects.

## Commits
- `19154b346ac3b02e0174fe8e1dd3f28e8fce07ff` — separates grass/off-road texture keys.
- `5255014e67a64f9c3646c3a3a6cbccc210c30d0f` — renders grass only in the exact authored grass band.
