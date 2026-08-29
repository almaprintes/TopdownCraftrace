# Poly Haven rollout — normal tracks — 2026-08-29

## Decision
Circuito Atlántico (`track01`) is the approved visual/technical baseline for the first homogeneous Poly Haven pass.

There are 16 circuits total. The rollout covers the 15 normal circuits; Atlántico is already baked and is frozen, so the batch regenerates the remaining 14. `offroad-raven-hollow` is explicitly excluded because it uses differentiated driving surfaces and keeps its existing treatment.

## Safety / rollback
Rollback branch created before the rollout:
`backup/pre-polyhaven-all-tracks-2026-08-29`

Rollback SHA:
`bd56e576bd62be01fb9dc213113667497d0e1954`

The batch workflow contains hard guards:
- excludes `track01` from regeneration;
- excludes `offroad-raven-hollow` from regeneration;
- requires exactly 14 bake targets;
- verifies protected manifests before baking;
- verifies protected directories are unchanged before commit;
- requires 16 beauty-enabled entries after rebuilding the catalog.

## Baseline recipe
All 14 generated circuits initially receive the exact Atlántico material recipe:
- road: `asphalt02Clean`, cleanMicrodetail, cell 205, macroGrid 4, brightness 0.96;
- shoulder/grass: `sparseGrass`, repeat 1126, brightness 1.0;
- outer/offroad: `rockyTrail02`, repeat 983, brightness 0.78;
- WebP quality 86 / effort 3;
- preview width 1215;
- depth 9.

This is deliberately a homogeneous first pass. After Android visual review, individual circuits may replace specific surfaces without changing the common pipeline.

## Batch targets
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
- practice-area
- santa-cruz

## Protected circuits
- `track01` / CIRCUITO ATLÁNTICO — frozen baseline; no rebake in batch.
- `offroad-raven-hollow` / Raven Hollow — excluded from this rollout.

## Files
- `scripts/track-beauty-config.mjs`: canonical per-track material configuration.
- `scripts/bake-track-beauty.mjs`: approved generic offline baker.
- `.github/workflows/bake-all-tracks.yml`: bounded manual batch.
- `scripts/build-track-beauty-catalog.mjs`: rebuilds runtime beauty catalog after publishing baked assets.
