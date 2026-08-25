# Season 0 rewards and car unlock progression — 2026-08-25

## Decisions implemented
Season 0 · Induction now uses exactly ONE FREE reward type per stage. Reward cards are meant to read like marketing objects: one hero asset, one quantity when applicable, no bundles of unrelated items competing for space.

## Active 14-stage FREE reward sequence
1. First Miles — 250 coins
2. Know Your Machine — Scrap ×8
3. First Loot — 400 coins
4. Hands On — Rubber ×6
5. Tune the Car — 600 coins
6. Drive Clean — Gear ×4
7. Shop Visit — 800 coins
8. Change of Scenery — Alloy ×4
9. Try Something New — 1,000 coins
10. Collector — Metal Disc ×4
11. Find Your Rhythm — 1,250 coins
12. Build Mileage — Compound ×4
13. Explorer — ECU ×1
14. Complete Driver — AVENIR Gripline full car unlock

Total Season 0 coin income from coin stages: 4,300 coins.

## Starter and finale direction
- Intended public 1.0 starter car: `helix_spark`.
- Stage 14 reward car: `avenir_gripline`.
- The Stage 14 reward uses the official uploaded promotional asset:
  `public/assets/season/reward_cards/avenir_gripline_reward_top_down_race.webp`
- The final car card deliberately breaks the normal material/coin rhythm and is rendered larger as an aspirational graduation reward.

## Car unlock persistence and garage filtering
File:
`src/game/cars/carUnlocks.js`

Current local beta keys:
- progression: `tdr2:carUnlocks:v1`
- explicit development bypass: `tdr2:devFullCarAccess:v1`

The unlock store guarantees `helix_spark` is present as the starter ID and provides helpers to load/save/unlock/check car IDs. Claiming Stage 14 records `avenir_gripline` as unlocked.

The player Garage now consumes this unlock state:
- normal player mode shows only cars recorded as unlocked;
- a fresh progression therefore exposes HÉLIX Spark as the starter;
- if the previously selected car is locked, Garage falls back to the first unlocked car and updates `tdr2:carId`;
- Admin Garage (`mode:'admin'`) always sees the complete fleet regardless of progression.

### DEV homologation bypass
Admin Hub now includes `COCHES DEV · ON/OFF`.

- OFF: player Garage behaves like the real launch progression and only exposes unlocked cars.
- ON: player Garage exposes the full fleet so homologation, physics and equipment testing can continue without falsely unlocking those cars.
- Toggling DEV access does NOT modify the player's unlock list.
- Admin Hub also includes `GARAGE JUGADOR` to jump directly into the player Garage and compare the two states.

This separation is intentional: homologation access is a development privilege, not progression data.

## Season presentation
`SeasonScene.js` understands car rewards in addition to coins/materials. The final card uses the Gripline display asset without a quantity badge and has a larger hero-art treatment. Standard Season 0 cards continue using the four reusable FREE card backgrounds under `public/assets/season/reward_cards/`.

## Track selector regression found during validation
While validating the new player progression on iPhone, opening the track selector raised:
`TypeError: t is not a function` around `t('tracks.sectors')`.

Cause: `_trackItem(x,y,w,h,t,i)` in `TrackGarageCleanTypographyScene.js` used `t` as the track parameter, shadowing the imported i18n translation function `t`.

Fix: the track parameter was renamed to `track`, restoring translation calls inside the selector.

## Survival five-lap regression found with a clean player profile
A clean Opera profile was used to test the game from a new-player perspective. In Survival, the player was able to continue beyond lap 5 and the session info showed nine laps.

The repository already contained `RaceSurvivalFinishStateScene.js` with a five-lap cap, but the active race class registered in `src/game/game.js` came from the newer `RacePracticeAreaSurfaceTuningScene.js` chain, which did not inherit that finish-state wrapper. Therefore the intended cap existed in the repo but was not part of the runtime scene actually being launched.

Fix:
- Added `src/game/scenes/RaceSurvivalHardLapCapScene.js` on top of the current active race chain.
- `src/game/game.js` now registers this wrapper as `RaceScene`.
- When the player accepts the fifth Survival lap, completed laps are clamped to 5, authoritative Survival history is truncated/synced to five laps, vehicle velocity is stopped, round is set to 5, and Survival finishes as a win. A sixth player lap can no longer be recorded by the active runtime chain.

## Implementation commits
- `cded4d05e199c106563673c92ce5cdb256d90922` — Add car unlock progression store.
- `9c06bcd80d1d22be1b01f5dbb710ac7515277375` — Simplify Season 0 rewards and add Gripline finale.
- `88367c38ce49800eadb63be62b5fdd9dfb746ad0` — Show single hero rewards and Gripline finale.
- `206c9cece78157e2e84b0cd7d8d522c00aadafd3` — Add dev full car access toggle.
- `81e6884762e5ee636fe64e50db999618a7fbc54c` — Respect car unlocks with dev bypass.
- `917a66cf53532bf3651e684bb368c4a5b07b7e46` — Add homologation full car access control.
- `c4e518ec02014e476f4778c7ce21940e31713809` — Fix track selector translation shadowing crash.
- `06300e3e18815112c9dfad78040e7aa40ecb1038` — Enforce active survival five-lap finish.
- `4772d816d05b79efa2378221f4bea8940c5c5f10` — Use hard survival lap cap scene.

## Validation status
- Single-reward Season 0 presentation and Gripline finale were visually confirmed by the user as looking great.
- Player Garage with real progression was confirmed on iPhone showing only HÉLIX Spark.
- DEV full-car toggle still needs explicit on-device confirmation in ON state.
- Track selector crash fix is committed and awaits a fresh on-device retry.
- Survival five-lap hard cap is committed and awaits a fresh clean-profile retry.
