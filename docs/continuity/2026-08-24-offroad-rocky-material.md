# Rocky off-road material — 2026-08-24

## User intent
`rocky_terrain_diff_4k.jpg` replaces the visual texture of the **existing OFF surface only**.

The renderer already had three distinct texture slots before this work:
- `asphalt`
- `grass`
- `off`

The correct implementation is therefore a direct asset swap on `off`. No new grass layer, no extra mask and no new surface geometry are required.

## Mistake and correction
The first integration incorrectly put the rocky material into the `grass` slot. A follow-up then tried to compensate by creating a separate `grassTrack` texture plus an additional runtime grass mask. Both approaches were unnecessary and are retired.

Corrected runtime:
- `grass` -> `assets/materials/grass-real.webp`
- `asphalt` -> `assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg`
- `off` -> `assets/materials/offroad/rocky_terrain_diff_4k.jpg`

`RaceRealSurfaceAssetsScene` now loads the rocky JPEG directly under the existing `off` key and preserves that asset through `ensureOffTexture()`.

`raceExactRuntimeBeautyPass.js` is restored to asphalt-only behavior. It creates no grass/off-road GameObjects and no grass mask.

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
- camera zoom

This is strictly a texture replacement in the renderer's pre-existing OFF slot.

## Performance
The original 4K rocky JPEG in the repo is ~10.75 MB. A live iPhone screenshot while displaying it showed approximately 56 FPS and FMAX 17.9 ms, so the asset itself did not show the major frame-time regression previously caused by runtime shader/layer experiments.

## Final correction commits
- `7d1946d483f97ba123b226a74607ef6a6568f093` — rocky material assigned directly to existing `off` texture key; grass restored to its existing slot.
- `0a8752ef6d9a01b6dd1ab5aa28b04ace7e27693b` — removes the unnecessary added grass mask/TileSprite and restores asphalt-only beauty pass.
