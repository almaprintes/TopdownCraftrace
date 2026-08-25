# Season system handoff — 2026-08-25

## Decision
The old finite 7-event progression has been replaced by a real 14-stage Season 0 · Induction.

### Season 0 · Induction
- Permanent, one-time onboarding season per player.
- 14 functional stages.
- Purpose: teach the game by making the player use its systems naturally instead of presenting a separate tutorial.
- Mission families include racing, garage visit, material collection, crafting, equipping, clean laps, Store purchase with soft currency, circuit variety, alternate modes and a final combined challenge.
- No mission requires watching an ad.
- No mission requires a real-money purchase.
- Premium monetization is disabled for Induction.

### Recurring seasons after Induction
Monthly themed seasons rotate cyclically:
1. Speed
2. Precision
3. Progression

This gives a repeating quarterly loop. The architecture remains open to adding a fourth Competition/Survival family later.
Each theme should draw roughly 14 monthly missions from a larger bank and vary parameters so a repeated theme does not repeat the exact same checklist.

## Reward lanes
The UI is designed from the start with two parallel horizontal lanes:
- FREE — active.
- PREMIUM PASS — visible but disabled and marked COMING SOON / PRÓXIMAMENTE.

If Premium is activated in the future, it should use the same season progress and unlock already-earned premium rewards retroactively when purchased. Premium should focus on cosmetic/exclusive/convenience rewards and avoid pay-to-win advantages.

## Core implementation
- `87e84a0ada48bb350ca739cc314c22eb465cd097` — Add season framework catalog.
- `ba4bd16c44ce28ae47635cc221cc4f6405a73a47` — Add Season 0 free/premium screen.
- `7e47ad7da7ecce7997e076a37a7b91d3d1f5da6d` — Activate Season 0 menu scene.
- `5f1201dda814e6421419bf7e920ae6474013033c` — Add induction season telemetry.
- `008ab0eec5ad50beb9681f5419dbe5b891aa4ab7` — Track soft-currency Store purchases.
- `2d85dfd4e4b44a977d1d6f37f9c1374fa302bdfc` — Track garage visits.
- `517251afcdd327dbe82049eff1b8228a554baaea` — Track mode starts.
- `9e37a861da2ae4b44a977d1d6f37f9c1374fa302bdfc` — Replace the placeholder/legacy stage list with the new induction mission order.
- `0d3eed511a9ce46dd19c531159c04b9c05abdcf1` — Replace the old seven-event engine data with the full 14-stage induction mission set.
- `5fd940e27a6860534642d16e28f2e32b01c190c4` — Add dedicated full-screen Season scene.
- `2ae1a3b990eb36aa082733e17190dea59f21d5f4` — Redesign lobby season card and make it navigate to the Season scene instead of opening an overlay.
- `7c5f32c535454918bc05bfd058e352fd400200ba` — Register SeasonScene in the Phaser scene list.
- `3dd362cc701030c215c74278b54efc318b2526c2` — Ensure Season scene resize listeners are cleaned up on shutdown.
- `cc679132facbae9e8f066d54c331b784f74960bd` — Replace all SeasonScene Phaser text/layout objects with a DOM/CSS interface while keeping Phaser only as the scene lifecycle/router.
- `c51f05a21c78d0e10d3743e97aa4ba03bcde17fe` — Replace the compact 7×2 stage grid with a long horizontal scroll of near-full-screen mission slides and two parallel FREE/PREMIUM reward rails.

## Season UI architecture
The season progression must never be rendered as a large overlay on top of the lobby. The lobby only shows a compact Season 0 summary card with current mission, reward preview and progress. Tapping the card navigates to the dedicated `season` scene.

The dedicated Season scene is intentionally separate from the lobby and now uses:
- a clear top header with back navigation and overall 14-stage progress;
- one long horizontal scroll with scroll-snap and iPhone momentum;
- one mission per large slide, sized to occupy almost the whole viewport so objectives are readable instead of compressed;
- two horizontal reward rails inside every mission slide: FREE above and PREMIUM below;
- the real title, description, objective target and free reward for all 14 induction missions;
- the current stage centered automatically when the scene opens;
- no road/track lines behind the lobby and no semi-transparent season overlay competing with the car/track cards.

### Text rendering rule
SeasonScene player-facing text is DOM/HTML/CSS, not Phaser Text. This makes typography, wrapping, spacing, localization and later visual iteration directly editable with normal CSS. Phaser remains responsible only for scene lifecycle/navigation. Do not reintroduce Phaser Text into the Season screen unless there is a specific rendering reason that DOM cannot satisfy.

## Active 14-stage induction order
1. First Miles / Primeros metros — complete 1 valid lap.
2. Know Your Machine / Conoce tu máquina — visit Garage.
3. First Loot / Primer botín — earn 8 material drops.
4. Hands On / Manos a la obra — have crafted/discovered a part.
5. Tune the Car / Ajusta el coche — equip a part.
6. Drive Clean / Conduce limpio — 2 clean laps.
7. Shop Visit / De compras — buy one material pack with in-game coins.
8. Change of Scenery / Cambia de escenario — one lap on 2 tracks.
9. Try Something New / Prueba algo diferente — start another game mode.
10. Collector / Coleccionista — 20 material drops.
11. Find Your Rhythm / Coge el ritmo — 5 clean laps.
12. Build Mileage / Suma kilómetros — 10 valid laps.
13. Explorer / Explorador — 2 laps on 3 tracks.
14. Complete Driver / Piloto completo — after reaching the final stage, complete 5 laps, 3 clean laps and 2 tracks.

## Persistence migration
The old event state key `tdr2:raceEvents:v1` is no longer used by the active induction mission engine.
The new progression key is `tdr2:seasonInduction:v1`, so existing seven-event progress does not leak into the new tutorial season.
Telemetry for garage visits, Store purchases and mode starts uses `tdr2:seasonTelemetry:v1`.

## Economy linkage
The baseline simulation is documented in `docs/economy/2026-08-25-store-economy-simulation.md`.
The 14 induction rewards are one-time onboarding rewards. Recurring monthly season rewards should later become the controlled steady-state seasonal income.

## Validation
The horizontal DOM Season scene is active in code but has NOT yet been confirmed on iPhone. Do not claim it works correctly on iPhone until the user tests it.
