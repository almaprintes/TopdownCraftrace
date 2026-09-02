# Production Studio rebuild specification

Date: 2026-09-02
Repository: `almaprintes/TopdownCraftrace`
Branch policy: build later on `develop`; never use `main` as a scratch branch.

## Purpose

Production Studio is an Admin Hub tool for taking a circuit/project through a controlled production pipeline. It is NOT part of the normal player flow and it must never become an authority for runtime circuit identity, physics, car scale, race routing or live player state.

The tool can wait until after the current DEV DOM recovery / publication push. When work resumes, rebuild it deliberately from this specification rather than blindly restoring the experimental chain from 2026-09-01/02.

## Non-negotiable architecture

1. Production Studio is an isolated admin/editor subsystem.
2. Normal game scenes must not depend on Production Studio state.
3. Production Studio may read/copy/export project data, but it must not mutate canonical runtime circuit data merely by opening, previewing or navigating.
4. No global aliases like `track01`, recycled keys or hidden fallbacks should be introduced by Production Studio.
5. Circuit/project identity must be semantic and explicit. Prefer stable IDs/slugs such as `atlantico`, `karting-tenerife`, etc.
6. Every transition between Track Studio -> Production Studio -> Environment Studio must carry the same explicit project/circuit identity object. Never infer the active track from stale `localStorage` keys, scene leftovers or previous runtime selection.
7. The editor pipeline and the player runtime must have separate state ownership.

## Intended flow

Admin Hub
  -> Production Studio
  -> choose existing project OR start from a project saved by Track Studio
  -> inspect production checklist / project status
  -> open Track Studio for geometry work when needed
  -> return to the SAME Production Studio project
  -> open Environment Studio for surface/environment work when needed
  -> return to the SAME Production Studio project
  -> later add validation/export/publish steps

Return navigation must preserve project identity and must never drop the user into an unrelated circuit or the last player-selected track.

## Features already explored and worth rebuilding

The experimental implementation taught us several useful things. Rebuild these, but do not blindly cherry-pick the whole old chain:

- Production Studio shell/UI reachable from Admin Hub.
- iOS-safe native DOM UI for text fields, buttons and project controls.
- iOS paste handling that works reliably in text/project inputs.
- Keyboard-safe layout using `visualViewport` / safe-area behavior so the virtual keyboard does not make controls inaccessible.
- Save/import flow for projects coming from Track Studio.
- Explicit action buttons for continuing the production pipeline.
- Correct return navigation back to Production Studio after editing.
- Production Studio -> Environment Studio bridge that preserves the selected project/track.
- Production grid / project preview rendering.
- Material/environment persistence work: sliders/settings should survive navigation and reload once explicitly saved.

Historic reference commits (for reading implementation ideas only, not automatic restoration):

- `13de5ec720a6eee8b1424126c6047a018afc7a54` — Production Studio 1.0 preview
- `56a569753605e4136bb4101654bcf97ed2c5958f` — iOS paste fix
- `927895ce7151c7a5d2cebb7837087978831a8843` — keyboard-safe layout
- `e7c0967d26a53977a04d774a0e00a59f89d17408` — Track Studio project saves
- `8c3f3da20c40dc9feb4a738968a9fca9b1c08ab3` — Production flow actions
- `805308a572c6d9835b3890f0ea7616f23a4936b7` — return navigation
- `ab5795d5443b96530d1dfabcaf303c3e303ff112` — Production/Environment track bridge
- `9bcbc5eec28244872315737b787ca86ed20b587c` — Production grid rendering

These commits are references because they contain useful lessons, not because the whole state is considered safe.

## Project data contract

Define one explicit project object and pass it through every Studio. Example shape (names can change, the principle cannot):

```js
{
  schemaVersion: 1,
  projectId: 'uuid-or-stable-id',
  trackId: 'atlantico',
  trackSlug: 'atlantico',
  displayName: 'Circuito Atlántico',
  geometry: {...},
  environment: {...},
  production: {...},
  updatedAt: 'ISO timestamp'
}
```

Rules:

- `trackId` / `trackSlug` are not numeric legacy aliases.
- Public/display name is metadata, not identity.
- Geometry, environment and production metadata are separate namespaces.
- Opening a Studio works on an explicit project snapshot/object.
- Saving is an explicit action.
- Previewing must not silently overwrite runtime files or player preferences.
- Add `schemaVersion` now so migrations can be controlled later.

## Persistence

Use one well-defined editor storage namespace, separate from player progress and runtime selection.

Do NOT reuse generic keys such as `trackKey` or previous player-selection keys for Studio project ownership.

Recommended pattern:

- `tdr:studio:projects` or IndexedDB equivalent for editor projects.
- Current working project reference such as `tdr:studio:activeProjectId` only inside the Studio layer.
- All stored project payloads include their own `projectId`, `trackId`, schema version and timestamps.
- Export/import JSON must validate schema and identity before acceptance.

Before writes, validate that the project identity matches the open Studio context. Reject conflicting/malformed data instead of guessing.

## DOM / iOS requirements

Production Studio should be native DOM-first, following the stable direction of the rest of DEV UI.

Required:

- no Phaser text-input hacks;
- touch targets sized for iPhone landscape;
- safe areas respected;
- `visualViewport` handling for keyboard appearance;
- paste must work on iOS;
- scroll areas must remain reachable with keyboard open;
- no accidental text selection on game-style controls;
- all listeners/subscriptions destroyed on Studio exit;
- no invisible DOM overlays left intercepting taps after navigation.

## Scene/state lifecycle rules

This is critical after the 2026-09-02 incident.

On opening Production Studio:

1. receive explicit `projectId` / project payload;
2. load/validate project;
3. render editor only;
4. never set player `trackKey` or race selection as a side effect.

On opening Track Studio or Environment Studio:

1. pass the explicit project identity/payload;
2. do not translate it through player/runtime aliases;
3. do not overwrite canonical circuit registry just to preview.

On return:

1. restore Production Studio using returned `projectId`;
2. merge only the expected editor namespace (geometry or environment);
3. validate identity before merge;
4. keep unrelated project state untouched.

On exit to Admin Hub:

- dispose DOM/listeners;
- leave player runtime selection unchanged;
- save only if user explicitly saved or autosave is deliberately designed and documented.

## Circuit identity guardrails

Never repeat the `track01` / alias confusion.

For new editor-created circuits:

- semantic unique slug required;
- duplicate ID/slug validation;
- display name kept separately;
- no creation of `track02`, `track03`, etc.;
- old legacy identifiers, if still needed for historical content, remain isolated compatibility mappings and are never generated for new projects.

A Studio project must never be resolved by "whatever track was last loaded".

## Runtime isolation tests

Before considering Production Studio safe, automate or manually verify at least these regressions:

1. Start game normally, select Atlántico, run it. Record identity/scale/geometry.
2. Exit, open Production Studio, inspect another project, return to game WITHOUT publishing/saving runtime data.
3. Atlántico must remain identical.
4. Repeat with Karting Tenerife.
5. Open Production -> Environment -> Production several times; identity must remain stable.
6. Reload app; player track selection must not be replaced by editor project identity.
7. Delete/clear an editor project; no player circuit may disappear.
8. A malformed imported JSON must fail closed, not fall back to another circuit.
9. Opening Studio must not alter car sprite scale, physics, lap distance or track metadata.
10. Test iPhone back/forward, keyboard open/close, background/resume and orientation transitions.

If two or more normal circuits break after a Studio change, STOP. Treat it as shared-state contamination, not as two broken track files.

## Deployment discipline

Production Studio work must happen after a confirmed healthy DEV checkpoint.

Before starting:

1. create a named safety branch/checkpoint;
2. record the exact healthy `develop` SHA;
3. verify `/dev/` is truly serving that SHA/build before modifications;
4. keep `main` untouched;
5. make small commits grouped by subsystem;
6. validate normal player flow after each structural milestone.

Do not combine Production Studio reconstruction with audio integration, circuit migrations, physics tuning or Pages workflow experiments in the same change window.

## Recommended rebuild order

Phase A — shell and identity
- Admin Hub entry
- DOM shell
- explicit project data contract
- editor-only persistence namespace
- project picker/create/import

Phase B — Track Studio bridge
- save Track Studio project in canonical editor schema
- open Track Studio from Production
- return with same `projectId`
- verify no player state mutation

Phase C — Environment Studio bridge
- open Environment with explicit same project
- save environment namespace only
- return safely
- material controls persistence

Phase D — Production preview/grid
- render project geometry/environment preview
- production checklist/status
- validation feedback

Phase E — export/publish pipeline
- validate schema + unique identity
- generate runtime-ready output in a deliberate publish step
- publishing is the ONLY phase allowed to modify/add canonical runtime track resources
- produce clear diff/summary before promotion

## Current priority (do not ignore)

As of 2026-09-02, Production Studio is DEFERRED.

Current priority is recovering and stabilizing the DEV build with all important DOM migrations for release. Production Studio, new audio and nonessential editor expansion must not distract from that publication-critical work.

When Production Studio resumes, read this file plus:

- `docs/continuity/2026-09-02-dev-002-recovery-and-pages-handoff.md`
- `docs/continuity/2026-09-02-dev-branch-production-studio-recovery.md` (if present)

Then inspect the historic reference commits listed above, but rebuild selectively on top of the then-current healthy DEV rather than moving the branch backwards to an experimental state.
