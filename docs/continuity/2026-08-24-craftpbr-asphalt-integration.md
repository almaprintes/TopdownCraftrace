# CraftPBR asphalt integration — 2026-08-24

## Goal
Replace the temporary/procedural asphalt beauty material on Karting Tenerife with a photographic material while preserving the exact runtime road footprint and mobile performance.

## Source assets
Original CraftPBR material in `public/assets/materials/asphalt-pbr/`:
- `albedo.png`
- `normal.png`
- `roughness.png`
- `height.png`
- `ao.png`
- `metalness.png`

Additional external test asset:
- `clean_asphalt_diff_2k.jpg` — Poly Haven Clean Asphalt diffuse/albedo.

## Geometry invariant
The asphalt mask is built exclusively from `track.geom.left/right`, using the exact per-sample quads previously validated with the solid-red debug mask. There is no widening, smoothing, offsetting or reinterpretation of the circuit geometry.

## Border invariant
No replacement edge polyline or kerb geometry is drawn by the beauty pass. The proven border/kerb renderer remains responsible for the white lines and red/white kerbs.

## Runtime
`RaceWorldAlignedMaterialsScene` remains the normal active RaceScene through `src/game/game.js`.

`RaceRealSurfaceAssetsScene` supplies the visible asphalt texture.

## Iterations and lessons
### v1
Photographic CraftPBR albedo through the exact road mask.

### v2 / v3 — retired
2D Roughness/Height/AO compositing mostly darkened the road without convincing material response.

### v4 — WebGL material response
Dedicated `AsphaltPBRPipeline` consumed Albedo, Normal, Roughness and Height.

### v5 — dynamic zoom anti-moire
The asphalt shader adapted filtering to dynamic camera zoom. Some low-speed shimmer remained detectable only when deliberately looking for it.

### v6 — grass richness + irregular dirt shoulder
Added a second full-world grass TileSprite plus many dirt ellipses/dry-grass strokes. This produced only a modest visual gain and coincided with a large performance regression.

### v7-v10 — rubber experiments — rejected
Several vector/decal/RenderTexture approaches were tried and rejected visually. The final versions also worsened FMAX. All custom rubber code is removed from active runtime.

## Performance isolation timeline
After removing rubber, FMAX stayed around ~40 ms, proving rubber was not the sustained root cause.

The v6 environmental layers were then removed, leaving only exact road mask + one asphalt TileSprite + PBR shader. User live measurement on iPhone after this rollback:
- FPS: **51**
- FRAME MAX / FMAX: **23.4 ms**

## Shader A/B result — confirmed expensive, disabled
The user noted that the PBR shader barely changed the visible result, so it was removed completely for a direct A/B test.

With the same race setup, exact road mask and photographic albedo still active, but without `AsphaltPBRPipeline`, the user measured:
- **FMAX: 16–18 ms**

Compared with the shader-on baseline of **23.4 ms**, disabling the shader recovered roughly **5–7 ms of worst-frame time** while preserving almost all perceived asphalt quality.

Decision: **keep the custom PBR shader disabled in active runtime**.

## Poly Haven Clean Asphalt A/B
The user downloaded Poly Haven `Clean Asphalt` and uploaded only the diffuse/albedo map as `public/assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg`.

`RaceRealSurfaceAssetsScene` was switched to this texture only; exact mask, scale, camera, border renderer and shader-off state were preserved.

Live iPhone screenshot after the swap:
- **FPS: 61**
- **FRAME MAX / FMAX: 20.9 ms**
- **L1 max: 15.0 ms**

Visual observation: compared with the prior CraftPBR albedo, the Poly Haven surface reads cleaner and finer-grained, with less obvious gravel-like aggregate. It is still quite uniform, but is closer to a maintained kart circuit surface and avoids the expensive runtime shader path.

Performance interpretation: the single screenshot shows a 20.9 ms frame max, somewhat above the previously observed 16–18 ms shader-off range, but this is not enough evidence by itself to blame the texture. FMAX is a worst-frame statistic and may include transient spikes. Do not conclude a regression unless repeated runs show the higher value consistently.

Current active road surface commit: `73257316f13bdc69a4cf41e7d1cb25a1b3974458`.

## Current production direction
Prefer **photographic diffuse-only asphalt** over runtime PBR on iPhone.

Active beauty pass:
- exact `track.geom.left/right` mask;
- one asphalt TileSprite using photographic diffuse only;
- existing stable white-line / kerb renderer.

Inactive / retired:
- `AsphaltPBRPipeline` application;
- Normal/Roughness/Height runtime sampling;
- zoom-aware shader filtering;
- extra full-world grass layer;
- procedural shoulder Graphics;
- all rubber/groove code.

## Performance rule
Use **16–18 ms FMAX** as the target envelope, but evaluate changes across repeated laps rather than one isolated maximum spike. Any effect or texture that consistently pushes worst-frame time materially higher must provide a clear visual gain to remain.

## Next visual direction
Do not reintroduce runtime PBR or procedural rubber. Prefer:
1. better authored/static diffuse textures;
2. pre-baked variations or track-specific texture atlases;
3. small localized kerb/terrain wear overlays;
4. sparse props/shadows with strict object-count control.

## Explicitly untouched
- dynamic camera zoom behaviour/range
- physics
- AI
- checkpoints
- lap timing
- gameplay surface detection
- `track.geom`
- kerb/border geometry
