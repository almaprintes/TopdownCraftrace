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
Live iPhone testing exposed shimmer in the fine asphalt aggregate because race camera zoom changes continuously with speed (`~0.75` fast/far to `~1.50` slow/near`).

The PBR shader now receives camera zoom every bind and applies a permanent low-pass floor, increasing filtering as the camera moves farther away. Albedo, Normal, Roughness and Height are filtered; normal/specular/height strength are attenuated when detail becomes sub-pixel. The dynamic zoom itself is unchanged.

Live validation: some shimmer remains detectable when deliberately looking for it at low speed, but it is no longer expected to be noticeable to a first-time player. Further filtering would trade away visible surface detail for a marginal gain, so the current balance is accepted.

### v6 — grass richness + irregular dirt shoulder
`raceExactRuntimeBeautyPass.js` adds:
- a broad second sample of the existing real grass texture at a much larger world scale and low opacity;
- deterministic dirt/soil specks immediately outside `track.geom.left/right`;
- sparse dry-grass strokes farther outside the edge;
- natural clean gaps so the dirt never reads as a continuous painted halo.

The shoulder system derives the outward direction from each exact left/right edge point relative to the local road centre. It does **not** construct any offset border polyline. Therefore it cannot recreate the old twisted-line failure mode.

### v6 live validation — accepted as modest gain
User validation on 2026-08-24: "No está mal. Se nota algo."

### v7 — continuous geometry-driven rubber — rejected
The first rubber implementation drew several broad low-alpha vector passes along a visual guide derived from the midpoint between `track.geom.left/right`.

Live validation: "Se aprecia una franja totalmente centrada".

Diagnosis: even with low opacity and random gaps, long vector strokes read as a designed central lane rather than tyre deposition.

### v8 — corner-phase vector rubber — rejected
A second attempt removed straight-line rubber and moved wear through corner phases (outside approach → inside apex → outside exit).

Live validation: "Ahora mismo son plastas mal colocadas." This confirmed that the **representation itself** was wrong: solid Phaser `Graphics` strokes/blobs under MULTIPLY still look like dark painted shapes, regardless of improved placement logic.

## Research-backed correction of approach
External references were checked for both motorsport behaviour and common game-environment implementation practice.

Key conclusions used for implementation:
- real circuit rubber builds up on repeatedly used paths under braking/cornering load, rather than as one uniform black stripe;
- a convincing groove uses track width and is strongest through loaded bends;
- environment-art workflows commonly layer tyre/rubber decals/textures over a tileable road material instead of drawing solid vector strokes;
- Phaser `RenderTexture` can be used as a bake target so authored decal stamps do not remain as many live GameObjects;
- MULTIPLY is useful only once the source has useful alpha/texture variation.

### v9 — sparse baked textured rubber decals — rejected as wrong target
Three runtime transparent rubber decal textures were baked into RenderTextures. This removed the previous vector blobs, but live validation showed the result was almost invisible and, where visible, the isolated placement still did not resemble a real rubbered hairpin.

User feedback on 2026-08-24: "Casi no se aprecia y es lo mejor porque lo poco que se aprecia no tiene sentido." A supplied aerial reference of a kart-track U-turn established the visual target clearly: several **coherent, parallel, curved dark tyre paths** build up together through the braking zone and around the complete hairpin. The desired effect is cumulative track usage, not random isolated marks.

### v10 — reference-driven coherent multiline rubber groove
The v9 sparse random-decal plan is retired.

New approach in `raceExactRuntimeBeautyPass.js`:
- analyse signed curvature over a wider stencil and smooth it to identify sustained bends instead of reacting to individual geometry nodes;
- build one continuous visual trajectory around active corners: outside on approach, toward the inside through the main bend, opening back to the outside on exit;
- smooth lateral interpolation repeatedly so the trajectory forms a natural arc rather than disconnected phase jumps;
- derive **five nearby parallel vehicle paths** around that trajectory, matching the visual language of the supplied reference where many laps produce multiple adjacent rubber streaks;
- use narrow elongated transparent streak textures rather than broad blobs;
- stamp them densely along consecutive track samples so neighbouring stamps join visually into coherent curved tyre paths;
- retain small deterministic gaps and differing line strengths so the surface does not become a perfect CAD line;
- keep true low-curvature straights essentially clean;
- bake all temporary streak stamps into 2048px-or-smaller RenderTextures, then destroy the temporary Images;
- clip the final result with the exact validated asphalt mask.

This is still strictly a beauty layer. It does not feed racing-line logic back into AI, physics or gameplay.

## Next visual priorities
Proceed in controlled layers:
1. Validate v10 multiline groove against the supplied U-turn reference. The test is whether hairpins now show several plausible parallel rubber arcs rather than isolated marks or one centre stripe.
2. **Kerb weathering** — restrained dirt/desaturation/scuff overlays clipped to existing kerb areas; do not rebuild kerb geometry.
3. **Terrain breakup** — larger irregular dry/worn/soil zones in grass islands.
4. **Edge integration** — selective dirt accumulation and grass encroachment with clean gaps.
5. **Trackside depth** — sparse tyre stacks/barriers/vegetation with soft baked-style shadows.

Validate each layer on iPhone before proceeding so visual gains and performance regressions remain attributable.

## Explicitly untouched
- dynamic camera zoom behaviour/range
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
