# Handoff — DEV 0.0.2 recovery, Pages and Production Studio

Date: 2026-09-02
Repository: almaprintes/TopdownCraftrace

## READ THIS FIRST

This document records the recovery performed on 2026-09-02 after a chain of misleading tests caused by stale `/dev/` deployments. Do not reconstruct this history from memory.

## Branch contract

- `main` is the stable beta used by testers. DO NOT modify it during normal development.
- `develop` is the working branch.
- Promotion to `main` happens only after explicit user approval.
- Never solve a DEV deployment problem by committing experimental game changes to `main`.

## Current recovered state

At the end of the recovery, `develop` was restored to:

`38057072c3327ea1ac7143e2482c33cccaca5120`

This is the state immediately before the new car-audio work began on 2026-09-02.

The last commit explicitly identified as DEV 0.0.2 was:

`8e6499ce5040abd7bb048b59ccab7497655835b0` — `chore: publish statistics card fix to DEV 0.0.2`

GitHub comparison proved that `38057072...` is 33 commits ahead of `8e6499ce...` and 0 commits behind it. Therefore `38057072...` contains the complete DEV 0.0.2 plus subsequent work up to immediately before the audio experiment.

Stable `main` was verified at:

`006853c7876b1b9b31518d0100972dc2cd5e1426`

Do not move `main` as part of DEV recovery.

## Safety branches created during the incident

- `backup/develop-before-production-rollback-2026-09-02` -> `38057072c3327ea1ac7143e2482c33cccaca5120`
- `backup/develop-production-studio-start-2026-09-02` -> `13de5ec720a6eee8b1424126c6047a018afc7a54`
- `backup/develop-after-bad-rollbacks-2026-09-02` -> preserves the later rollback/deployment-debug state before `develop` was restored to `38057072...`

These branches are recovery references. Do not delete them casually.

## What happened

The problems appeared while integrating new car audio. Atlántico then appeared to load Velocity Ring, cars appeared huge/slow in other tests, and Karting Tenerife also appeared unhealthy.

We attempted several rollbacks of `develop`, including going back toward the start of Production Studio. Those tests were misleading because `/dev/` was not actually publishing the newly selected `develop` commits.

Key lesson: NEVER infer that a rollback failed until the deployed `/dev/` build has been proven to contain the expected commit.

## Critical GitHub Pages subtlety

In the recovered `38057072...` state, `.github/workflows/pages.yml` is intentionally triggered by pushes to `main` (plus `workflow_dispatch`).

The workflow itself checks out BOTH branches:

1. `main` -> builds stable root `/TopdownCraftrace/`
2. `develop` -> builds `/TopdownCraftrace/dev/`
3. DEV output is copied under `stable/dist/dev`
4. one Pages artifact is uploaded and deployed

Therefore `/dev/` can contain current `develop` even though the Pages workflow run originates from `main`.

Do not casually change this workflow to trigger from `develop`. During the incident, develop-triggered deployment attempts hit the protected `github-pages` environment / deploy behavior and failed.

Also: rerunning an old successful workflow job can create duplicate artifacts named `github-pages`; `deploy-pages` then fails with a multiple-artifacts error. Do not use that as the normal deployment method.

Before changing Pages again, inspect the current workflow and understand this architecture.

## False diagnostic encountered: 759 m vs ~217 m

The circuit selector displayed roughly 759 m for Atlántico while the lobby showed roughly 217 m. Initially this looked like proof that Velocity Ring metadata was contaminating Atlántico.

Investigation found a separate unit-conversion bug in the selector: it used an old hard-coded `0.18 m/px`, while the game has a canonical conversion around `0.05139 m/px` (`0.185 / 3.6`). Applying the canonical scale turns ~759 into ~217.

Important: a wrong distance label is not by itself proof that the wrong circuit geometry is loaded.

Any future fix must use the shared canonical conversion (`pxToMeters` / shared units module), not another hard-coded factor.

## Circuit debugging rule

If multiple circuits suddenly appear wrong after a shared-system change:

- STOP editing individual circuit files.
- Suspect shared runtime state, routing, selection state, caches, deployment staleness, scale/unit code, or Studio leakage first.
- Verify the exact deployed commit before changing geometry or track metadata.
- Do not copy circuit files one-by-one from `main` into `develop` unless a concrete diff proves that file is the fault.

The attempt to restore Atlántico file-by-file was abandoned because it risked destroying two days of valid DEV progress.

## Production Studio status / intended next work

Before the incident, the active development goal was Admin Hub -> Production Studio.

Work already explored included:

- Production Studio shell/UI
- iOS paste handling
- keyboard-safe layout
- project saving from Track Studio
- action flow and correct return navigation
- Production -> Environment Studio bridge while preserving the selected project/track
- Production grid rendering
- Material Studio persistence work on iOS

However, after restoring `develop` to `38057072...`, DO NOT blindly cherry-pick the later experimental chain. Rebuild/continue Production Studio deliberately from this recovered base, using the old commits/backups only as implementation references.

The user explicitly prefers preserving the healthy DEV game over recovering any single broken circuit or Studio experiment.

## Audio status

The new audio integration started AFTER `38057072...`. That work is intentionally excluded from the recovered DEV state.

Do not reintroduce audio until the recovered game and DEV deployment path are confirmed healthy. When audio returns, isolate it from track identity, track geometry, physics, car scale and Studio state.

## Operational checklist before continuing

1. Read this document.
2. Confirm `main` has not moved unexpectedly.
3. Confirm `develop` ancestry/state before writing.
4. Confirm how `/dev/` is actually being deployed; do not assume a branch push reached Pages.
5. Establish a safety branch/checkpoint before structural Studio, track, physics, audio or deployment changes.
6. Change one subsystem at a time.
7. Validate lobby/selector first, then launch a known-good circuit, before broader edits.
8. Keep `main` untouched unless the user explicitly approves promotion.

## User priority

Preserve the progress of DEV 0.0.2 and subsequent good DEV work. Production Studio can be rebuilt with what we learned. A single circuit may be sacrificed if necessary. The stable beta and the accumulated DEV progress must not be sacrificed to save a circuit or an experimental feature.
