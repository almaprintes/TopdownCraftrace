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

## Suggested next localization blocks
After iPhone validation of the lobby, continue in small reversible blocks:

1. Dynamic race-event content/reward labels.
2. Garage player UI.
3. Track selector / race-mode selector.
4. Pre-race and race HUD/results.
5. Store/inventory/factory player-facing modals.
6. Admin/internal tools last.

For every write: fetch the current file from `main`, use its real blob SHA, keep commits narrow, verify each resulting commit with `fetch_commit`, and update continuity documentation.
