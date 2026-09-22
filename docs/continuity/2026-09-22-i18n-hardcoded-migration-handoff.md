# i18n hardcoded migration handoff — 2026-09-22

## Objective
Migrate absolutely all player-facing hardcoded interface copy to the central i18n system so additional languages can be added mainly by filling dictionaries and QA, not by rewriting scenes.

## Repository / branch rules
- Repository: `almaprintes/TopdownCraftrace`
- Work ONLY on `main`.
- `beta-1.0` is the frozen public beta. Do not touch it without explicit authorization.
- Do not mix old/recovery/backup/lab/preview/feat/fix/tmp/beta-0.0.3 branches.
- `/dev` and `/dev-live` come from main.
- Every visible/functional DEV change must increment the visible DEV version and every verifier in `.github/workflows/pages.yml`.
- Never report a version deployed until GitHub Actions Build + Deploy is `completed/success`.

## Current safe state
- Latest DEV: **1.1.121**
- Latest verified deployment: GitHub Actions **35678536985**, `completed/success`.
- DEV 1.1.120 was also verified successful before starting 1.1.121.
- No pending known broken main state at this handoff.

## User working preference
The user explicitly authorized continuous work in large batches. Do NOT stop after every small change to ask “adelante”. Continue through multiple coherent blocks per turn. Only stop for:
1. a real anomaly/design decision requiring user input,
2. an execution/time boundary, after leaving main in a verified safe state.
If an Action fails, diagnose, repair and rerun before reporting success.

## i18n architecture
Relevant files:
- `src/game/i18n/index.js`
- `src/game/i18n/canonicalRuntimeText.js`
- `src/game/i18n/legacyUiText.js`
- `src/game/i18n/phaserUiExtra.js`
- `src/game/i18n/playerUiExtra.js`
- `src/game/i18n/domUiEnglishBridge.js`
- `src/game/game.js`

The legacy runtime patches Phaser text/setText through localization bridges. That can make hardcoded Spanish appear translated, but it is technical debt. The goal is explicit keyed `t('...')` calls for player-visible copy.

## Audit
- Script: `scripts/audit-i18n-hardcoded.mjs`
- Workflow runs it as “Audit hardcoded interface text”.
- Last quoted broad audit before latest batches: 739 candidate lines / 138 files at DEV 1.1.118.
- This count contains many false positives: fonts, CSS/style strings, internal IDs, developer diagnostics, units, admin/dev tools and string-matching logic.
- The script currently defines a DEV_ONLY filter but historically did not consistently apply it. Do not interpret candidate count as remaining visible strings.
- Do not make CI fail on candidate count until false positives are classified and migration is essentially complete.
- Final goal: a focused player-facing audit strict enough to fail CI on new hardcoded visible UI.

## Completed migration blocks
### 1.1.107
`raceEvents.js`: induction/race event titles/descriptions/labels moved to keys.
### 1.1.108
`PartDismantleDom.js`, `MaterialExchangeDom.js`: recycler/dismantling UI migrated.
### 1.1.109
Lobby UI/publish polish migrated.
### 1.1.110
`StatsMasteryScene.js` migrated.
### 1.1.111–1.1.114
Race Control and replay UI migrated in several blocks.
### 1.1.115
`StatsScene.js` statistics hub migrated.
### 1.1.116
`SettingsAVOptionsScene.js` controls/video/audio settings migrated.
### 1.1.117
`MenuCarPreviewFixScene.js`: lobby event/season reward/track card visible copy migrated.
### 1.1.118
`MenuGameModesScene.js`: mode selector migrated.
### 1.1.119
`StatsTesterExchangeScene.js`, `SettingsHelpTutorialScene.js`, `RaceReplayControlsScene.js` migrated. First Action failed because two interpolated HTML strings remained single-quoted; fixed to template literals and rerun succeeded (35675631675).
### 1.1.120
`RaceSessionRewardsScene.js` and native `RaceTop10ReplayScene.js` controls/accessibility strings migrated. Verified successful before continuing.
### 1.1.121
`UpgradeWorkshopPerformanceScene.js` large Workshop block migrated:
- garage/storage/fusion bench/assembly
- materials/parts
- drag/fusion/mount/race copy
- result/no recipe
- workshop hints
- duplicate loot
- equipped-part effect
- mounted/remove/drop states
- family labels engine/brakes/tires/suspension/transmission
- fusion/crafted/toast messages
Translations added to `playerUiExtra.js`.
Verified Action: **35678536985 success**.

## Important remaining targets
Continue from the Workshop cluster first:
- `src/game/scenes/UpgradeWorkshopSimpleCraftScene.js`
- `src/game/scenes/UpgradeWorkshopCrafterraScene.js`
- `src/game/scenes/UpgradeWorkshopPremiumV2Scene.js`
- `src/game/scenes/UpgradeWorkshopPremiumV3Scene.js`
Then re-audit and attack remaining player-facing Race UI, store/garage, settings/legal/tutorial/startup/orientation overlays.

Other known debt:
- `LobbyPublishPolish.js` still detects mission state via literal Spanish/English text such as “CONOCE TU MÁQUINA” / “KNOW YOUR MACHINE”. Replace language-dependent logic with IDs/state, not more translated string comparisons.
- `seasonCountdownLabel()` has hardcoded day unit `D`.
- `index.html` startup loader has hardcoded Spanish loading strings; needs bootstrap i18n solution.
- Recycler/catalog item names may still fall back to hardcoded `GARAGE_ITEMS[id]?.name`; centralize item/material names eventually.
- Brand/proper names, technical values (FPS, percentages, DualSense/DualShock), units and developer console diagnostics should not be blindly translated.
- Verify existing keys such as `common.back`, `common.close` and interpolation behavior where used.

## Version bump procedure
For every visible/functional batch:
1. Update source + translations.
2. Bump `index.html` visible DEV comment and both ES/EN overlay spans.
3. Update **all** DEV version references/verifiers in `.github/workflows/pages.yml`, including escaped grep patterns and `DEV_VERSION`.
4. Search for stale previous-version verifier residues.
5. Make a final source trigger commit after workflow/version edits so the final run validates the complete batch.
6. Wait until final GitHub Actions run is `completed/success`.
7. If failed: inspect job logs, repair, trigger again, wait for success.

## Next action
Start by reading `UpgradeWorkshopSimpleCraftScene.js`, `UpgradeWorkshopCrafterraScene.js`, Premium V2/V3 and the current `playerUiExtra.js`. Migrate coherent player-visible Workshop copy to keyed i18n. Preserve game logic and layout. Do not translate internal IDs or developer-only diagnostics. Use a new DEV version after 1.1.121 and verify Actions before proceeding to the next batch.
