# DEV 0.0.2 recovery — current state and continuation point

Date: 2026-09-02

## READ THIS FIRST WHEN RESUMING

This document records the recovery performed on 2026-09-02 after a chain of audio / track / Production Studio experiments and misleading tests caused by stale GitHub Pages deployments.

### Branch contract

- `main` = stable beta for testers. DO NOT modify it during normal development.
- `develop` = active development branch.
- `/TopdownCraftrace/` = stable beta build from `main`.
- `/TopdownCraftrace/dev/` = development preview built from `develop`.
- Never move, commit to, merge into, or otherwise modify `main` unless Juanfran explicitly orders a beta merge/promotion.

## Current recovered develop baseline

`develop` was restored to:

`38057072c3327ea1ac7143e2482c33cccaca5120`

This is the important recovery point. It contains the complete DEV 0.0.2 line plus the subsequent work up to immediately before the new car-audio work began on 2026-09-02.

The last commit found that explicitly publishes DEV 0.0.2 is:

`8e6499ce5040abd7bb048b59ccab7497655835b0` — `chore: publish statistics card fix to DEV 0.0.2`

Comparison proved that `38057072...` is 33 commits ahead of `8e6499ce...` and 0 commits behind it. Therefore the DEV 0.0.2 progress was not lost; `38057072...` contains it and later work.

## Stable beta state

At the time of recovery, `main` points to:

`006853c7876b1b9b31518d0100972dc2cd5e1426`

Do not use `main` as a scratch branch and do not repair `develop` by copying arbitrary files from `main` one by one. Main is a stable tester reference, not a donor tree for uncontrolled restoration.

## Safety branches created during recovery

- `backup/develop-before-production-rollback-2026-09-02` -> `38057072c3327ea1ac7143e2482c33cccaca5120`
  - This became the authoritative recovery source for DEV 0.0.2 + later pre-audio work.
- `backup/develop-production-studio-start-2026-09-02` -> `13de5ec720a6eee8b1424126c6047a018afc7a54`
  - Snapshot around early Production Studio work.
- `backup/develop-after-bad-rollbacks-2026-09-02`
  - Snapshot of the later rollback/deploy-debug state before restoring develop to `38057072...`.

Do not delete these branches until the project is fully verified again.

## What happened

1. Work began on a new car audio system.
2. After that, Circuito Atlantico appeared to load Velocity Ring-like content, cars appeared huge/slow, and later Karting Tenerife also looked wrong.
3. Several attempts were made to repair track01 and to roll `develop` backwards.
4. Those visual tests were misleading because `/dev/` was not necessarily serving the commit currently pointed to by `develop`.
5. Rolling back `develop` also rolled back `.github/workflows/pages.yml` to an older workflow.
6. That older workflow listens only to pushes on `main`, even though its build job checks out BOTH `main` and `develop`, builds stable at the root and copies the develop build into `/dev/`.
7. Therefore moving `develop` backwards did NOT automatically prove that `/dev/` had changed. We were sometimes testing stale deployed output.
8. Re-running an old Pages workflow created two artifacts named `github-pages`; `deploy-pages` failed because it found multiple artifacts with the same name.
9. A later attempt to alter Pages behavior from develop must NOT be treated as canonical. The recovered workflow at `38057072...` is the historical deployment model: trigger from main, build both branches.

## Critical lesson: Git state != deployed /dev state

Before diagnosing gameplay from `/dev/`, verify BOTH:

1. the exact SHA at `develop`, and
2. the exact workflow/deployment that produced the currently served `/dev/`.

Never conclude that a rollback failed merely because the browser still shows the old behavior. A stale Pages build can make a correct Git rollback look broken.

## Track selector distance finding

During debugging, the selector showed roughly 759 m for Atlantico while another lobby panel showed roughly 217 m.

The 759 m value was traced to an old local conversion in the selector (`pixels * 0.18`). The canonical game conversion is approximately `0.05139 m/px` (`0.185 / 3.6`). Applying the canonical scale maps ~759 to ~217. This means that discrepancy alone was NOT proof that Velocity Ring geometry was loaded.

Do not reapply the selector fix blindly after this recovery. First verify the current recovered code and desired canonical implementation.

## Production Studio

Before the recovery incident, Production Studio / Admin Hub work had progressed substantially. Known work included:

- Production Studio 1.0
- iOS paste handling
- keyboard-aware layout
- project saving from Track Studio
- action flow and return navigation
- Production -> Environment Studio project/track bridge
- grid/rendering work
- subsequent Material Studio persistence improvements

However, the priority now is to verify the recovered DEV 0.0.2 baseline before rebuilding or reintroducing Production Studio changes.

If Production Studio needs rebuilding, use the backup branches and commit history as REFERENCE, but reintroduce changes deliberately onto the verified healthy `develop`. Do not wholesale restore a later tree if it risks bringing back track/runtime contamination.

## Audio

The new audio work from 2026-09-02 is deliberately outside the recovered baseline. Do not reintroduce it until the game and circuits are verified healthy.

When audio is attempted again:

- isolate it from track identity/registry/loading code;
- do not touch track01 aliases or generic track keys;
- do not change physics, car scale, camera scale, or race initialization as part of audio integration;
- make a safety branch/checkpoint before the first audio commit;
- verify at least Atlantico and Karting Tenerife before and after the audio change;
- add audio incrementally: loading first, then idle/rev loop, then gears/turbo/effects.

## Safe next steps

1. Treat `38057072...` as the recovered development baseline.
2. Do not move `develop` again unless a new backup branch is created first.
3. Do not touch `main`.
4. Resolve/understand the Pages publication mechanism separately from game code.
5. Verify that `/dev/` is actually built from `38057072...` before using browser/gameplay observations as evidence.
6. Once the recovered game is proven healthy, continue Admin Hub / Production Studio work.
7. Reintroduce later improvements in small, auditable commits.
8. Audio comes later and must be isolated.

## Operational rule

If multiple previously healthy circuits suddenly fail in similar ways (wrong geometry, wrong scale, huge cars, slow movement, wrong camera), DO NOT start repairing each circuit file. Assume a shared runtime / registry / loading / deployment problem until proven otherwise.

If a browser result contradicts the Git commit that should be running, verify deployment freshness before changing code.

---

This file exists specifically so a future session does not reconstruct the events from memory. Read it before making branch, deployment, Production Studio, track, or audio changes.