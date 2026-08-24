# Rocky off-road material — 2026-08-24

## Surface model
The renderer keeps the same three pre-existing visual surface slots:
- `asphalt`
- `grass`
- `off`

No fourth semantic surface has been created and no gameplay surface geometry has changed.

## Current assets
- `grass` -> `assets/materials/grass/rocky_terrain_02_diff_2k.jpg`
- `asphalt` -> `assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg`
- `off` -> `assets/materials/offroad/rocky_terrain_diff_2k.jpg`

Both natural-terrain textures are Poly Haven CC0 assets by Amal Kumar. Full provenance/contact information is recorded in `docs/ASSET_LICENSES.md`.

The original 4K OFF source remains in the repository as a high-resolution source, but runtime now uses the much lighter 2K version.

## Live validation
The natural terrain combination was approved visually on iPhone. Grass and rocky OFF now have strong photographic detail and retain good frame-time behavior compared with earlier shader/procedural experiments.

The remaining visible issue after the 2K swaps was the mathematically hard seam between `grass` and `off`.

## Grass ↔ OFF transition feather
Commit `fe38ef6915de72383257ef052abc1ed89e446a8c` adds a deliberately minimal visual feather to that existing boundary.

Implementation:
- uses the existing `track.geom.grass.left/right` outer boundaries;
- does not modify either boundary;
- creates one narrow 22 px visual mask centered on those existing lines;
- overlays the same `grass` texture at 0.22 alpha only inside that narrow strip;
- world-space tile alignment remains identical to the main grass texture;
- the transition object sits below track/asphalt rendering;
- it is destroyed on scene shutdown.

This is a visual cross-fade aid, **not a new surface**. Surface classification remains exactly asphalt / grass / off as before.

The implementation intentionally uses only one additional masked TileSprite so it can be A/B tested on iPhone. If FMAX materially worsens, remove the feather rather than stacking more runtime layers.

## Geometry and gameplay invariants
Untouched:
- track geometry
- grass-band geometry
- physics
- surface classification
- FORGE terrain behavior
- AI
- checkpoints
- lap timing
- white borders
- kerbs
- dynamic camera zoom

## Historical correction
An earlier integration incorrectly assigned the rocky OFF material to the grass slot and then attempted to compensate with an extra grass surface layer. That approach was removed. The accepted architecture is still the original three surface slots; only the narrow visual feather described above is added for presentation.
