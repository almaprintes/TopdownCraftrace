# Top Down RACE — ES/EN localization: language UI + app-wide player pass

Date: 2026-08-25
Branch: `main`

## Goal
Prepare Top Down RACE for Shipaton 2026 with Spanish and English at launch, while keeping the i18n architecture ready for French, German and Italian later.

## Language selector status
The Settings 2.0 language selector is approved on iPhone by the user.

- Five compact pills are visible: ES, EN, FR, DE, IT.
- ES and EN are selectable.
- FR, DE and IT remain disabled/reserved for a later update.
- Pills use dark asphalt styling, circular flag badges, a narrow national stripe at the right edge and the Top Down RACE green active state.
- The English badge uses a CSS-built schematic Union Jack. No new image asset is required.
- Do not redesign these pills unless a concrete issue is found.

Latest approved pill commit:
`586338fef753919ac8afc98d2ddc06e489da6a5b` — `Move language stripes clear of labels`

## First lobby localization block
Dictionary commit:
`a3135e9b4182dfd555c5956df6cc508b946422e1` — `Add lobby ES EN translations`

Lobby implementation commit:
`8d8c8f7df3510139f6473848ec1b3c71ac2b17a6` — `Localize main lobby ES EN`

Initial continuity commit:
`758f2d711f9065a8a00082f4ec81b3ffec54b188` — `Document ES EN lobby localization`

The first iPhone review showed that dynamic progression-event data remained in Spanish even when the surrounding lobby DOM had switched to English. This proved that the source of a string and the renderer are separate concerns.

## Architecture decision
Do **not** rewrite the whole app from Phaser text to DOM merely for translation.

- DOM/CSS remains preferred for menu/settings/card UI where responsive layout and accessibility benefit from editable HTML text.
- Phaser text remains valid for realtime HUD/gameplay overlays, but player-facing strings need translation at creation/update time.
- Dynamic data uses stable IDs and resolves display strings through i18n where practical.
- Legacy hardcoded UI is covered by compatibility translation bridges while high-value active screens are migrated directly to `t()`.
- Text baked into image assets cannot be translated as text. Where this was found or strongly suspected in the game-mode cards, translated live overlays were added so the active language is always visible without generating replacement images.

Audit/decision commit:
`9aa58771d5d86c45f5d2875bc94f1690f48db53c` — `Document app-wide text localization audit`

## App-wide ES/EN player-facing pass
The user requested one complete pass without intermediate iPhone reviews. The following work was therefore performed consecutively and should be reviewed together afterward.

### Progression events and rewards
`768b36c812833050183da49b52adf585e13188e5` — `Add ES EN event translations`

`c42ba5a5a34dbac91a622c94cf39d75e77b3dfb1` — `Localize progression event data`

The seven progression events now use language-neutral event IDs and resolve title, description and objective labels through i18n. Reward formatting also resolves coins/material names through i18n. Progression state, targets, rewards and economy logic were not intentionally changed.

### Runtime compatibility layers
`f781c0854eb012d7ede4fe36da4b9d2c06b46a0f` — `Add legacy Phaser text localization bridge`

`6b483899e6b5f34b3a704b82df13d76603fcb355` — `Localize legacy Phaser text at runtime`

`0053b14c15b615ccbd722579383049b2432bc621` — `Translate legacy DOM UI at runtime`

`23256b693da991ce72b6edad919e7b8055004eca` — `Install legacy DOM localization bridge`

`8e164f54e4978e69f3c29c255fe810bec26eccce` — `Add DOM UI English compatibility translations`

`77d30ddfd00cbeaf52cab61464ca3a96684e0623` — `Install extended DOM translation bridge`

`846bc45041281c2e0901c67f93bcefe7613f82e9` — `Add extended Phaser player text translations`

`a83f7d1990f877904574a1cb00ff6a805b651110` — `Install extended Phaser translation bridge`

The Phaser bridge translates legacy text both when `this.add.text()` creates it and when a `Text` object later receives `setText()`. The DOM bridges observe newly-created player UI and translate known hardcoded Spanish text nodes and common dynamic variants when English is active. This is a compatibility net, not a replacement for proper dictionary keys on modern screens.

### Extended dictionaries
`9b900fae49e473c153376f6bea43d384d3031acf` — `Add garage modes and inventory translations`

`642f8d5075ed986bbe14d6106522e8ecd5992cfd` — `Add extended player UI translations`

`bdd08bb5297f9f10d69da239fd6282b49ac624ad` — `Extend i18n with player UI dictionary`

Coverage includes garage actions/stats and car personality copy, game-mode selector text, inventory labels, track labels, common race/session text, workshop/crafting terminology, part families and common store terminology.

### Game-mode flow
`e5888a4c7b8c63b784ed566d8aa694ceeeba3625` — `Localize game mode selector ES EN`

`cae2f35e282c3d1510a2fc85367b7284583e8b72` — `Overlay localized game mode titles`

The selector title, instructions, last-used marker, duel distance selector and lap choices use `t()`. The existing mode card assets are retained; each card now has a live translated title overlay so English is readable even if historical artwork contains baked Spanish lettering.

### Inventory
`a43fa16c1a7689699f3201ccdc016fc757b2043d` — `Localize lobby inventory ES EN`

Inventory title, tabs, coins, empty states, install/uninstall actions, material names and numeric locale handling now follow the selected language. Generated legacy part names receive additional compatibility translation where they are still sourced from the old parts catalog.

### Garage
`8125d0e4381e26879249d971e474df684d77ef5c` — `Localize garage personality and actions`

`df0b527384fe2707321f39b9de01d5c535289596` — `Localize garage performance labels`

The approved 15-car personality descriptions have ES/EN entries. Current hero actions and top-speed/acceleration/braking labels use `t()`. Remaining inherited Phaser literals are handled by the runtime bridge. Proper car/model/brand names remain proper nouns.

### Track selector
`6b052aeba9a72e95575662a9772d01ae64d51de3` — `Localize track selector labels ES EN`

Track Length, Sectors, Surface, Width, Select/Edit and asphalt/dirt values use current-language strings. Track public names remain their designated proper names except the historical Atlantic display alias, which is localized in the race session layer.

### Race session/results/rewards
`ac4ec488f0d2f0123b86b2aa3856d7965ca87abe` — `Localize race session rewards and report UI`

Session-complete rewards, material names, chest wording, totals, rewarded laps, report/results actions and survival session-info UI now use current-language strings directly. The compatibility bridges additionally cover older pause/report/HUD/result DOM and inherited Phaser literals, including common lap/sector/record/penalty/navigation terms.

### Settings 2.0 and calibration
The language screen itself already uses direct `t()` keys. The active inherited Controls/Video/Audio panels and calibration overlay still contain historical Spanish literals in their source files; the DOM compatibility layer now translates the complete set of currently visible labels/descriptions/actions identified during this pass, including steering mode, on-screen layout, left-handed mode, sensitivity, video quality/render scale, audio labels, protected HUD zones and calibration controls.

### Workshop / factory / store
The active workshop and older inherited factory UI still contain many Phaser literals and generated item names. Common workflow labels, crafting terminology, material names, part-family names, install/equip actions and store terminology are covered by the extended i18n dictionaries plus Phaser/DOM compatibility bridges. Economy, recipes and inventory quantities were not intentionally changed.

## Runtime scope and safety
`src/game/game.js` registers the current active descendants, including `MenuDuelModeScene`, `GarageLazyCardsScene`, `SettingsLanguageScene`, `GarageDetailSpeedConsistencyScene`, `RacePracticeAreaSurfaceTuningScene`, `UpgradeWorkshopInventorySizingScene` and `TrackGarageHideSpecialScene`. The pass targets those runtime inheritance chains and adds compatibility coverage for visible strings inherited from older ancestors, instead of rewriting historical files wholesale.

No intentional changes were made to car physics, AI, track geometry, control mechanics, calibration persistence, race timing, reward quantities, crafting recipes or monetization behavior. Language remains persisted in `tdr2:settings`.

## iPhone review fixes
The first full-device review found store-related regressions after the broad localization pass.

`7bbefa62ec59ec4dcc94075a7575b0ec026206c4` — `Disable global DOM translation observers on iPhone`

The store could freeze on iPhone. The broad DOM MutationObserver translation layer was removed from the runtime path to avoid repeatedly scanning dynamic store UI. Translation should continue through direct i18n and Phaser/runtime mappings instead of global DOM observation.

`9d77cb32b3dd68b016f79629746c91bb91e99ea0` — `Fix store tab touch targets`

The Store top tabs (`Materials`, `Coins`, `Rewards`) originally made only the text itself interactive, producing a small unreliable touch target on iPhone. They also did not refresh their active visual state when jumping horizontally. The active runtime descendant overlays a full-size invisible hit rectangle across each complete tab and switches section on `pointerdown`; switching reopens the store at the selected section, so the selected tab receives the same highlighted style as the initial Materials tab. The user confirmed this fix on iPhone.

`248d70c57a6801a488dad94f1491ea20d7268216` — `Smooth store carousel and refresh pack cards`

The Store horizontal card navigation now adds a light inertial finish after finger drag: recent pointer velocity is sampled during the drag and a short clamped `Cubic.easeOut` tween continues the content after release. Existing drag behavior remains in place and starting a new drag kills any active inertia tween.

Material pack cards also receive a new visual header layer inspired by the game-mode cards without generating new images. The header uses the official material assets already preloaded by the Store and composes up to four of them as a small collage with slight rotation and overlap. Pack title/copy and the exact pack contents are rendered as live ES/EN text, while the existing detailed material grid and purchase button remain below. No pack quantities, prices or economy behavior were changed.

This inertia/card redesign is not considered validated until the user confirms it on iPhone.

## Review status
The compact language pills were previously confirmed on iPhone.

The **app-wide ES/EN pass described above has not yet been fully reviewed on iPhone**. Continue noting remaining Spanish strings, bad translations, overflow or layout regressions, then correct that punch list only.

Known review hotspots:
- historical game-mode card artwork may still visually contain baked Spanish under/around the new translated title overlay;
- uncommon Admin/editor-only terminology may not be covered by the player-facing compatibility dictionaries;
- proper names should not be reported as untranslated merely because they are language-neutral names;
- highly unusual dynamic combinations from old workshop/debug UI may need one final exact mapping after the walkthrough.

## Validation rule
Do not state that the full pass works correctly on iPhone until the user confirms it after the complete walkthrough.

For every future write: fetch the current file from `main`, use its real blob SHA, keep commits narrow, verify each resulting commit with `fetch_commit`, and update continuity documentation.
