# DEV recovery and Production Studio rebuild — 2026-09-02

## Purpose

This document records the operational subtleties discovered while recovering `develop` after circuit/runtime regressions. It is mandatory context before touching Admin Hub, Track Studio, Environment Studio, Production Studio, circuit identity, race loading, audio integration, or deployment.

## Branch contract

- `main` = stable beta for testers. Treat as frozen.
- `develop` = active development branch.
- GitHub Pages root (`/TopdownCraftrace/`) is built from `main`.
- GitHub Pages DEV (`/TopdownCraftrace/dev/`) is built from `develop`.
- Never commit directly to `main` for experiments, diagnostics, rescues, audio work, track work, or Admin Hub work.
- Only move/merge to `main` after Juanfran explicitly approves the DEV state for beta.
- Before risky work on `develop`, create a backup branch/checkpoint first.

## Recovery point established on 2026-09-02

`develop` was deliberately rolled back to:

`738c47404b5dd1769f0f7b10bcc9acb477b71e09`

This is the last selected DEV preview before the later Environment Studio → Production Studio reconstruction chain began.

Safety branches created during recovery:

- `backup/develop-before-production-rollback-2026-09-02`
- `backup/develop-production-studio-start-2026-09-02`

Do not delete these until the rebuilt Production Studio and all circuits have been revalidated.

## Why the rollback was necessary

Symptoms seen after later experimental work included:

- Selecting Circuito Atlántico could show Velocity/Veloce Ring geometry.
- Karting Tenerife could also enter a bad runtime state.
- Cars could appear far too large relative to the circuit.
- Cars could feel abnormally slow.
- The visible circuit could occupy the wrong scale/viewport.
- Safari could report that the DEV page repeatedly caused problems.
- Changes initially blamed on audio turned out to coexist with a much wider chain of Environment/Production/runtime changes.

Important lesson: when multiple circuits fail at once, do **not** repair individual circuit JSON/environment files first. Suspect shared runtime state, scene loading, camera/scale, persisted studio data, registry resolution, or deployment state.

## Circuit safety rules

1. Never infer circuit identity from a legacy key such as `track01`, `track02`, position in a list, or editor history alone.
2. Do not rename or repurpose a legacy circuit ID without tracing every runtime consumer first.
3. A circuit that looks wrong may be caused by a shared runtime loader or persisted studio state; do not overwrite the circuit asset until that is ruled out.
4. If several circuits exhibit the same scale/physics/loading symptoms, stop circuit-specific edits immediately.
5. Before changing any race/circuit runtime code, test at least two known-good circuits in DEV.
6. After any change to Track Studio, Environment Studio or Production Studio, regression-test normal race loading separately. Authoring tools must never silently override the selected race circuit.
7. Editor/project data must only affect a race when an explicit editor/test mode requests it. Normal race flow must not consume “last edited project” as an implicit override.

## Studio isolation rule

Production Studio, Track Studio and Environment Studio are authoring tools. They must be isolated from normal racing.

A rebuild must preserve this boundary:

- Studio state belongs to studio/project storage.
- Normal race selection belongs to the race/track registry flow.
- Entering or saving a studio project must not mutate canonical track geometry.
- Opening Environment Studio must not change the identity of the base track.
- Production Studio must pass project data explicitly to another studio; it must not alter global race-selection state as a side effect.
- Persisted material/decoration/editor settings must be namespaced per project/track and never interpreted as canonical race data unless deliberately published.

## Production Studio rebuild plan

Rebuild Production Studio on top of the recovered DEV base instead of restoring the later implementation wholesale.

Features that were useful and may be reimplemented deliberately:

- Production Studio hub inside Admin Hub.
- Project creation/opening.
- Track Studio project save/return flow.
- iOS-safe paste/input behavior.
- Keyboard-safe layout on iPhone.
- Explicit actions to move between Production, Track Studio and Environment Studio.
- Correct return navigation.
- Grid/preview rendering.
- Environment bridge that carries the intended project/track explicitly.

Do **not** cherry-pick the whole old studio chain. Recreate features one at a time against the healthy runtime and test racing between milestones.

## Mandatory incremental test sequence

For every meaningful Production/Environment/Track Studio milestone:

1. Build/deploy `develop` to `/dev/`.
2. Confirm DEV homepage/admin navigation opens.
3. Run Karting Tenerife in a normal race.
4. Run one additional known-good circuit.
5. Check car scale, camera, speed/physics feel and selected track identity.
6. Open the studio feature being developed and exercise only that feature.
7. Return to a normal race and repeat the two-circuit smoke test.
8. Only then continue to the next studio feature.

If step 3–5 regresses, revert the most recent studio milestone rather than modifying circuit assets.

## Audio integration rule

Audio work must be treated as a separate subsystem.

- Adding audio folders/assets is safe only if it does not touch race loading, track selection, camera, physics or studio project resolution.
- Wire vehicle audio only after the recovered DEV baseline and Production Studio rebuild are stable.
- Introduce audio in small commits: assets → loader → one car → runtime modulation → additional cars.
- After each audio runtime change, perform the same two-circuit smoke test.
- If audio causes a crash/performance regression, revert the audio runtime change; do not compensate by changing track geometry or camera settings.

## Deployment diagnosis

A successful build is not the same as a successful GitHub Pages deployment.

When `/dev/` behaves strangely, check the workflow first:

- stable main checkout/build
- develop checkout/build
- copy develop under `/dev`
- Pages artifact upload
- final deploy job

If the final deploy fails, do not diagnose the visible DEV page as proof that the latest source code is broken; the served version may be stale or inconsistent.

## Rollback procedure

When DEV becomes broadly unhealthy:

1. Stop feature work.
2. Identify the last known-good commit by actual tested behavior, not by commit title alone.
3. Create a backup branch from current `develop` before moving the ref.
4. Move only `develop` to the chosen commit.
5. Never move `main` as part of DEV recovery.
6. Wait for `/dev/` deployment and retest multiple circuits.
7. Rebuild lost tooling incrementally instead of copying the entire broken chain back.

## Current operating principle

Protect the racing game first. Admin/authoring tools are secondary and must never destabilize normal race runtime.

When in doubt: preserve the healthy circuit/runtime baseline, checkpoint the branch, and rebuild the tool on top of it.
