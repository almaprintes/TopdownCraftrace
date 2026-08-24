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

## Iterations
### v1
One photographic Albedo layer plus restrained AO. This proved the new material and exact mask worked.

### v2 / v3
Tried compositing Roughness/Height/AO as 2D grayscale layers at different scales. In live iPhone tests this mostly made the road darker; the intended material response was not convincingly visible. This approach is retired.

### v4 — real WebGL material response
A dedicated `AsphaltPBRPipeline` handles the visible road surface in WebGL.

The shader consumes:
- Albedo as base colour;
- Normal as tangent-space micro-surface direction;
- Roughness to control broad weak asphalt highlights;
- Height as restrained micro-relief/tonal variation.

### v5 — dynamic zoom anti-moire
Live iPhone testing exposed shimmer in the fine asphalt aggregate because race camera zoom changes continuously with speed (`~0.75` fast/far to `~1.50` slow/near).

The PBR shader now receives camera zoom every bind and applies a permanent low-pass floor, increasing filtering as the camera moves farther away. Albedo, Normal, Roughness and Height are filtered; normal/specular/height strength are attenuated when detail becomes sub-pixel. The dynamic zoom itself is unchanged.

Live validation: some shimmer remains detectable when deliberately looking for it at low speed, but it is no longer expected to be noticeable to a first-time player. Further filtering would trade away visible surface detail for a marginal gain, so the current balance is accepted.

### v6 — grass richness + irregular dirt shoulder
The next beauty gain moves outside the asphalt rather than further filtering the road.

`raceExactRuntimeBeautyPass.js` now adds:
- a broad second sample of the existing real grass texture at a much larger world scale and low opacity, creating slow vegetation tonal variation without adding fine-frequency shimmer;
- deterministic dirt/soil specks immediately outside `track.geom.left/right`;
- sparse dry-grass strokes farther outside the edge;
- natural clean gaps so the dirt never reads as a continuous painted halo.

The shoulder system derives the outward direction from each exact left/right edge point relative to the local road centre. It does **not** construct any offset border polyline. Therefore it cannot recreate the old twisted-line failure mode.

The stable white border and red/white kerb renderer is untouched and remains above these environmental marks.

### v6 live validation — iPhone screenshot
User validation on 2026-08-24: "No está mal. Se nota algo." The environmental pass is visible and accepted as a modest improvement rather than a finished visual target.

Screenshot observations:
- asphalt reads substantially more like a real aggregate surface than the earlier flat procedural road;
- grass has some texture and large-scale variation, but large interior islands still read too uniformly dark/green and lack convincing terrain structure;
- the transition from asphalt to vegetation is cleaner than before but remains visually dominated by the pristine continuous white border;
- red/white kerbs are crisp and geometrically stable, but their perfectly clean colour makes them feel newer than the surrounding surface;
- the scene still lacks medium-scale environmental cues that give a real kart track depth: tyre rubber on racing/braking lines, kerb wear, edge dust accumulation, irregular worn grass/soil patches, and selective trackside objects/shadows.

### v7 — geometry-driven racing-line rubber and braking wear
`raceExactRuntimeBeautyPass.js` now adds a static rubber/wear decal layer above the PBR asphalt and below the proven border/kerb render.

Implementation rules:
- the visual guide path is derived only from the midpoint between existing `track.geom.left/right` samples;
- local curvature is calculated from neighbouring centre samples;
- curves bias the visual rubber path gently toward the inside, while straights relax back toward centre;
- the path is **visual only** and never feeds AI, physics, checkpoints, lap timing or surface detection;
- three broad, very low-alpha passes with deterministic gaps/width variation create diffuse rubber accumulation instead of one obvious black ideal-line stripe;
- approaching sharp curvature increases a separate broader braking-zone haze before the corner;
- every rubber mark is clipped by the exact already-validated asphalt geometry mask, so it cannot leak outside the road or modify borders.

This is intentionally a first-pass strength chosen to be visible on iPhone without making the circuit look painted. Live validation is required before increasing/decreasing opacity.

## Next visual priorities
Proceed in controlled layers, preserving exact geometry and performance:
1. **Racing-line rubber / braking-zone wear** — v7 implemented; awaiting iPhone validation.
2. **Kerb weathering** — restrained dirt/desaturation/scuff overlays clipped to existing kerb areas; do not rebuild kerb geometry.
3. **Terrain breakup** — a few larger irregular dry/worn/soil zones in grass islands to remove the uniform green-carpet appearance.
4. **Edge integration** — local dirt accumulation and grass encroachment near selected edges while leaving deliberate clean sections.
5. **Trackside depth** — later add sparse tyre stacks/barriers/vegetation with soft baked-style shadows, prioritising recognizable circuit areas rather than filling every empty space.

Do not add all effects at once. Validate each layer on iPhone before proceeding so visual gains and performance regressions remain attributable.

## Explicitly untouched
- dynamic camera zoom behaviour/range
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
