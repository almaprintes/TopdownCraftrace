# Top Down RACE — ES/EN localization: language UI + lobby

Date: 2026-08-25
Branch: `main`

## Goal
Prepare the player-facing game for Shipaton 2026 with Spanish and English at launch, while keeping the i18n architecture ready for French, German and Italian later.

## Language selector status
The Settings 2.0 language selector is approved on iPhone by the user.

- Five compact pills are visible: ES, EN, FR, DE, IT.
- ES and EN are selectable.
- FR, DE and IT remain disabled/reserved for a later update.
- Pills use dark asphalt styling, circular flag badges, a narrow national stripe at the right edge and the Top Down RACE green active state.
- The English badge uses a CSS-built schematic Union Jack. No new image asset is required.
- Do not redesign these pills unless a concrete issue is found.

Latest approved pill commit before lobby work:
`586338fef753919ac8afc98d2ddc06e489da6a5b` — `Move language stripes clear of labels`

## Lobby localization block
Added ES/EN dictionary keys for the main player lobby and wired the current DOM lobby to `t()`.

Dictionary commit:
`a3135e9b4182dfd555c5956df6cc508b946422e1` — `Add lobby ES EN translations`

Lobby implementation commit:
`8d8c8f7df3510139f6473848ec1b3c71ac2b17a6` — `Localize main lobby ES EN`

### Localized static lobby UI
- Coins label.
- Inventory, Store and Settings top actions.
- Start Engine CTA.
- Garage, Factory and Tracks bottom navigation.
- Selected car / selected track headings.
- Track Length, Sectors, Surface and Direction.
- Asphalt / Dirt and Clockwise / Counterclockwise values.
- Track-layout accessibility label.
- Season-complete/event chrome and Claim Reward button.
- Main navigation accessibility labels.
- Number formatting now follows ES (`es-ES`) or EN (`en-US`).

### Intentionally not translated yet
Dynamic race-event titles, descriptions, progress labels and reward labels still come from their source data/functions. They need their own localization pass instead of hardcoded substitutions in the lobby.

Car names, brand names and track proper names are also left as data/proper nouns.

## Safety / scope
No car physics, controls, calibration, race logic, garage persistence or i18n persistence were intentionally changed in this block.

Language remains stored in `tdr2:settings`.

## Validation
The language-pill layout has been confirmed by the user on iPhone.

The new lobby localization has NOT yet been confirmed on iPhone. Do not claim it works on iPhone until the user tests it.

## App-wide text localization audit — decision after iPhone lobby review
The iPhone screenshot after the first lobby pass showed that several Spanish strings remained inside otherwise-English panels, especially the progression event card and some metadata labels.

Important finding: those remaining strings are not all Phaser-rendered text. The event title, description, objective label and reward names currently come from `src/game/events/raceEvents.js`, where the progression data itself is hardcoded in Spanish. Therefore converting every Phaser `Text` object to DOM would not by itself solve the localization problem.

A repository-wide search for `this.add.text(` also shows many Phaser text call sites across active gameplay scenes and older inheritance layers, including race HUD, garage, track garage, game-mode UI, settings ancestors, editors and internal/dev scenes.

The runtime scene registration in `src/game/game.js` confirms that the active player-facing classes are layered through current descendants such as `MenuDuelModeScene`, `GarageLazyCardsScene`, `SettingsLanguageScene`, `GarageDetailSpeedConsistencyScene`, `RacePracticeAreaSurfaceTuningScene`, `UpgradeWorkshopInventorySizingScene` and `TrackGarageHideSpecialScene`. An audit must follow those active inheritance chains rather than blindly converting every historical scene file.

### Architecture decision
Do **not** perform a global Phaser-to-DOM rewrite just for localization.

The renderer and the source of the string are separate concerns:
- DOM/CSS is preferred for menu/settings/card interfaces where responsive layout, accessibility and easy styling benefit from editable HTML text.
- Phaser text can remain in realtime race/HUD/gameplay overlays where it is efficient and tightly coupled to the canvas, but every user-facing literal must come from `t()` or from localized data instead of hardcoded Spanish/English.
- Text baked into image assets should be identified and replaced by text-free assets plus DOM/Phaser overlays when practical.
- Dynamic content/data (race events, rewards, categories, item labels, mode descriptions, etc.) must use language-neutral IDs and resolve labels/descriptions through i18n.

### Migration objective
Before expanding ES/EN translation coverage, audit all active player-facing screens and classify every visible string into one of four buckets:
1. Already localized through `t()`.
2. DOM text but still hardcoded.
3. Phaser text still hardcoded.
4. Data/asset text still hardcoded or baked into images.

Then migrate screen by screen, keeping each commit small and reversible. Do not convert a stable realtime Phaser HUD to DOM merely because it contains text; localize its string source instead.

### First concrete source issue found
`src/game/events/raceEvents.js` currently stores all seven progression-event titles/descriptions/objective labels in Spanish and also formats item/reward labels in Spanish (`MONEDAS`, `Chatarra`, `Aleación`, `Goma`, etc.). This is why the English lobby screenshot still showed `PILOTO PRO`, `COMPLETA 50 VUELTAS LIMPIAS`, Spanish reward names and `VUELTAS LIMPIAS` even though the card itself is DOM.

### Audit order
1. Main lobby + progression event data and player-facing lobby metadata.
2. Garage and garage detail active inheritance chain.
3. Track garage + game-mode/pre-race flow.
4. Race HUD, pause/results/replay/spectator overlays.
5. Factory/store/inventory.
6. Settings ancestors still producing visible labels.
7. Editors/Admin/dev tools last.

No further broad translation pass should be considered complete until this source-of-text audit is performed for the active player flow.

## Suggested next localization blocks
After iPhone validation of each block, continue in small reversible steps:

1. Localize dynamic race-event content/reward labels at the data source.
2. Audit and localize Garage player UI.
3. Audit and localize Track selector / race-mode selector.
4. Audit and localize pre-race and race HUD/results.
5. Audit and localize Store/inventory/factory player-facing modals.
6. Admin/internal tools last.

For every write: fetch the current file from `main`, use its real blob SHA, keep commits narrow, verify each resulting commit with `fetch_commit`, and update continuity documentation.
