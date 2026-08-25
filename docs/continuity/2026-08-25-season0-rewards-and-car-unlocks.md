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

## Car unlock persistence scaffold
New file:
`src/game/cars/carUnlocks.js`

Current local beta key:
`tdr2:carUnlocks:v1`

The scaffold guarantees `helix_spark` is present as the starter ID and provides helpers to load/save/unlock/check car IDs. Claiming Stage 14 records `avenir_gripline` as unlocked.

Important: this is the progression data layer. Full garage filtering/locking of the other cars is a separate implementation step and must not be claimed complete until the Garage UI actually consumes this unlock store.

## Season presentation
`SeasonScene.js` now understands car rewards in addition to coins/materials. The final card uses the Gripline display asset without a quantity badge and has a larger hero-art treatment. Standard Season 0 cards continue using the four reusable FREE card backgrounds under `public/assets/season/reward_cards/`.

## Implementation commits
- `cded4d05e199c106563673c92ce5cdb256d90922` — Add car unlock progression store.
- `9c06bcd80d1d22be1b01f5dbb710ac7515277375` — Simplify Season 0 rewards and add Gripline finale.
- `88367c38ce49800eadb63be62b5fdd9dfb746ad0` — Show single hero rewards and Gripline finale.

## Validation status
Code is committed to `main`, but the new single-reward cards and the Gripline Stage 14 card have NOT yet been visually confirmed on iPhone by the user. Do not claim the layout is approved until tested.
