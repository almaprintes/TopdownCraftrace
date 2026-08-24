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
No replacement edge polyline or kerb geometry is drawn by the beauty pass. The proven border/kerb renderer remains responsible for the white lines and red/white kerbs. This specifically avoids reintroducing the previously fixed twisted-line artefacts.

## Runtime
`RaceWorldAlignedMaterialsScene` remains the normal active RaceScene through `src/game/game.js`.

`RaceRealSurfaceAssetsScene` loads all six CraftPBR maps from `assets/materials/asphalt-pbr/` plus the existing `grass-real.webp` world material.

## Stable visual baseline
The accepted runtime baseline is now **v6**:
- CraftPBR asphalt through the exact `track.geom.left/right` mask;
- WebGL asphalt shader with zoom-aware anti-moire filtering;
- broad grass tonal variation;
- irregular dirt/soil specks and sparse dry-grass marks outside the exact road edge;
- no custom rubber/groove layer;
- existing border/kerb renderer untouched.

## Iterations and lessons
### v1
One photographic Albedo layer plus restrained AO. This proved the new material and exact mask worked.

### v2 / v3 — retired
Compositing Roughness/Height/AO as grayscale 2D layers mainly darkened the road without convincing material response.

### v4 — WebGL material response
Dedicated `AsphaltPBRPipeline` consumes Albedo, Normal, Roughness and Height.

### v5 — dynamic zoom anti-moire
The asphalt shader adapts filtering to the dynamic camera zoom. Some shimmer remains detectable only when deliberately looking for it at low speed; further filtering would cost too much visible detail.

### v6 — grass richness + irregular dirt shoulder
Adds large-scale grass variation and small irregular dirt/dry-grass marks immediately outside the exact road edge. Live validation: "No está mal. Se nota algo." This remains the accepted environmental baseline.

### v7 — continuous vector rubber — rejected
Live result read as a centred stripe: "Se aprecia una franja totalmente centrada".

### v8 — corner-phase vector rubber — rejected
Moving the vector marks outside/apex/outside still produced obvious blobs: "Ahora mismo son plastas mal colocadas."

### v9 — sparse textured decals — rejected
Runtime-generated textured decals were technically better than vector blobs but visually too subtle and placement still lacked the coherent repeated-use pattern of the supplied real-track reference.

### v10 — continuous multi-streak groove — rejected and rolled back
The supplied real-track reference showed the desired visual target clearly: several coherent dark tyre-use streaks wrapping around a hairpin, not isolated marks.

A new continuous multi-streak baked RenderTexture approach was tried. Live iPhone validation showed two problems:
1. visually it still did not convincingly reproduce the reference;
2. **performance regressed** — user observed higher `FMAX`, with the screenshot showing frame max around 43.6 ms and live FPS in the low 20s.

User decision: "Este camino no nos lleva a ningún lado y ha hecho subir el fmax".

Therefore all custom racing-rubber/groove code from v7-v10 is removed from the active runtime. `raceExactRuntimeBeautyPass.js` has been restored to the v6 implementation. This is an intentional rollback, not a temporary disable.

## Performance rule from this point
Visual additions must justify their GPU/CPU/frame-time cost on the target iPhone. Runtime RenderTexture baking, many decal stamps, or additional full-world masked layers should not be reintroduced casually. Prefer cheap baked/static assets or small localized overlays with measurable benefit.

## Next visual priorities
Do **not** continue the procedural rubber experiment. Better candidates for visible gain at lower risk:
1. kerb weathering using lightweight overlays without rebuilding kerb geometry;
2. larger irregular terrain breakup in grass islands;
3. selective edge dirt/grass encroachment;
4. sparse trackside props/shadows using existing or pre-baked assets.

Validate one layer at a time on iPhone and watch both appearance and `FMAX`.

## Explicitly untouched
- dynamic camera zoom behaviour/range
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
