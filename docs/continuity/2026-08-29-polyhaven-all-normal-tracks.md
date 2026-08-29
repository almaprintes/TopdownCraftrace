# Poly Haven rollout — official tracks — 2026-08-29

## Decision
Circuito Atlántico (`track01`) is the approved visual/technical baseline.

The 16 official circuits will share Atlántico's current baked terrain treatment for this first homogeneous pass. Atlántico is already approved and remains frozen; the batch therefore regenerates the other 15 official circuits, including `offroad-raven-hollow`.

This rollout is VISUAL ONLY. It must not modify:
- track geometry / centerlines / widths;
- circuit names or public identity;
- race logic;
- surface classification;
- grip/speed/penalty values.

Raven Hollow keeps its existing differentiated surface penalties exactly as they are. Only the baked visual appearance of its road/shoulder/outer terrain changes.

## Atlántico architecture being copied
The approved Atlántico system does not use runtime texture tiling/chunks as the final visual terrain. Poly Haven assets are offline bake inputs. The generic baker reads the existing `track.json`, rasterizes the circuit's existing geometry and produces at most four large WebP quadrants plus preview and manifest. Runtime then draws those pre-baked WebP layers.

For Atlántico (2430x2000 world) the output is four 1215x1000 quadrants. Other circuits keep their own geometry/world dimensions; the same baker adapts the output to each circuit rather than changing its trace.

### Geometry topology — frozen rule
The original approved Atlántico baker (`scripts/bake-track-visual.mjs`, historical commit `2a711f8049b0d0f0bd3472a9c8877e43c734bb16`) renders the asphalt and shoulder as a **quad ribbon**: one four-point polygon for every consecutive pair of left/right samples returned by `buildTrackRibbon()`.

This topology is now the required beauty-bake rule. Do **not** replace it with:
- one giant closed road polygon (can self-intersect at tight hairpins);
- a thick rounded SVG stroke (creates circular lobes/discs and radial artefacts at bends);
- per-vertex radial expansion of the final polygon.

`scripts/bake-track-beauty.mjs` was restored to the Atlántico quad-ribbon topology on 2026-08-29 after the rounded-stroke experiment produced obvious geometry artefacts in Karting Tenerife.

## Baseline materials and treatment
Exact approved Atlántico recipe:
- road: Poly Haven `asphalt_02`, processed with `cleanMicrodetail` to remove recognizable long crack repetition while preserving asphalt micrograin;
- road scale: cell 205 world px, macroGrid 4 (820x820 macro scale), brightness 0.96;
- shoulder/grass: Poly Haven `sparse_grass`, repeat 1126 world px, brightness 1.0;
- outer/offroad: Poly Haven `rocky_trail_02`, repeat 983 world px, brightness 0.78;
- WebP quality 86 / effort 3;
- preview width 1215;
- depth 9.

Source texture resolution and apparent world scale remain separate concepts: changing 1K/2K/4K input resolution must not change the physical scale seen in-game.

## Karting Tenerife exception — visual width only
Karting Tenerife's authored data uses a different width convention from Atlántico:
- `trackWidth` is `66.6` and centerline widths are roughly in that range;
- the circuit sheet reports an asphalt width of about `133 u`;
- Atlántico stores its full road width directly (`trackWidth` about `162`, centerline widths about `160+`).

Therefore Karting Tenerife's offline beauty road is rendered with `visualWidthScale: 2.0` before passing its road-only centerline to the same `buildTrackRibbon()` + quad-ribbon path used for Atlántico. This is a **render interpretation only**. `track.json`, collision geometry, checkpoints, AI, surface classification, grip and penalties remain untouched.

Karting Tenerife currently uses the user-selected Poly Haven `asphalt_pit_lane` family, processed as cleaned baked-PBR microdetail, at approximately the original Tenerife physical calibration (`cell: 225`). Shoulder and outer terrain remain on the Atlántico baseline unless explicitly reviewed later.

Current Karting Tenerife beauty revision:
`karting-tenerife-atlantico-quad-pitlane-v3`

## Safety / rollback
Rollback branch created before the rollout:
`backup/pre-polyhaven-all-tracks-2026-08-29`

Rollback SHA:
`bd56e576bd62be01fb9dc213113667497d0e1954`

The workflow now has hard guards:
- `track01` is excluded from regeneration and its published beauty directory must remain unchanged;
- exactly 15 official targets are listed explicitly;
- `switchback-park` and `technical-ridge` are excluded from this official batch;
- every target must have an existing `track.json`;
- SHA-256 checksums of every `track.json` are captured before bake and compared after bake;
- `git diff` must show no changes under `src/game/tracks/library`;
- final generated runtime catalog must contain exactly 16 beauty-enabled official tracks.

These guards protect Raven Hollow's existing gameplay/surface penalties because those values live outside the generated visual WebP output and no gameplay track data is permitted to change.

## Batch targets (15)
- chicane-vale
- f1-baku
- f1-imola
- f1-jeddah
- f1-melbourne
- f1-miami
- f1-monte-carlo
- f1-sakhir
- f1-shanghai
- forest-endurance
- karting-canarias
- karting-tenerife
- offroad-raven-hollow
- practice-area
- santa-cruz

## Frozen reference
- `track01` / CIRCUITO ATLÁNTICO — approved reference; no rebake in this batch.

## Non-official library tracks excluded
- `switchback-park`
- `technical-ridge`

They physically exist under the generic track library and the registry can discover them, but they are not part of this 16-circuit official visual rollout.

## Files
- `scripts/track-beauty-config.mjs`: material library and per-track visual configurations.
- `scripts/bake-track-beauty.mjs`: approved generic offline baker, now locked to Atlántico-style quad-ribbon geometry.
- `.github/workflows/bake-all-tracks.yml`: bounded batch with gameplay-data integrity checks.
- `.github/workflows/bake-karting-tenerife.yml`: single-track bake/publish path for Karting Tenerife.
- `scripts/build-track-beauty-catalog.mjs`: rebuilds runtime beauty catalog from published manifests.

## Review after bake
After the homogeneous pass, review each circuit on Android. Any surface that does not suit a circuit can then be replaced individually while keeping the common Atlántico architecture and performance model.
