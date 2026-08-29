# Launch progression, Season 0/1, locked collection and real clean laps — 2026-08-29

## Scope of this handoff
This document is the source of truth for the work and product decisions made on 2026-08-29 around launch content, seasonal progression, car/track discovery, reward presentation and clean-lap detection.

The goal is to launch with a smaller, polished playable core while preserving the full existing content as visible future progression instead of exposing unfinished tracks/cars too early.

---

## Rollback / safety point
Before applying the launch-progression layer, a rollback branch was created from the known-good state:

- Branch: `backup/pre-launch-progression-locks-2026-08-29`
- Baseline SHA: `53a321cc2413a425c6c379c7c58fadfdf1f43f87`

Nothing in the new progression layer deletes tracks, cars, Beauty Layers, physics, AI data or authored geometry. The changes are intended to be reversible gating/presentation changes.

---

# PRODUCT DECISION — LAUNCH CONTENT

## Launch philosophy
Do not expose all 16 circuits just because they exist. Several still need substantial visual/gameplay polish and would lower the perceived quality of the launch build.

Instead, treat tracks like cars: a visible collection that is progressively discovered/unlocked.

This turns unfinished-but-existing content into future progression rather than launch baggage.

## Initial public track set
Only these three tracks are available immediately to a normal player at launch:

1. `track01` — Circuito Atlántico
2. `karting-tenerife` — Karting Tenerife
3. `karting-canarias` — Karting Canarias

Reason: these are the current launch-quality/template tracks and give enough variety to support Induction + Season 1 while the remaining tracks are polished one by one.

## Remaining tracks
All other official tracks stay in the build and remain visible in the selector as future content, but:

- they are locked for normal players;
- their public presentation is mystery/locked rather than fully revealed;
- they cannot launch a race while locked;
- their real geometry, names, Beauty Layers, AI, surfaces and authored data remain untouched;
- Admin/development access must still allow testing all tracks.

`Raven Hollow` is also locked initially. Its differentiated surface penalties/physics remain untouched and will be preserved when it is eventually homologated for public release.

## Track unlock architecture
New persistence/helper layer:

- `src/game/tracks/trackUnlocks.js`
- Player launch tracks are seeded as unlocked.
- Admin mode bypasses player locks.
- The system is intentionally separate from track geometry and rendering.

Progression selector layer:

- `src/game/scenes/TrackGarageProgressionScene.js`
- Active lazy scene route changed in `src/game/game.js` so TrackGarage uses the progression wrapper.

Important rule: future circuit releases should be unlocks, not deletions/additions to the registry. The full registry remains the development catalog.

---

# CARS — COLLECTION / DISCOVERY MODEL

## Current intended progression
The game contains 16 cars.

Known early progression:

- `helix_spark` — starter car.
- `avenir_gripline` — final reward of Season 0 / Induction.
- `crown_axis` — reserved as final reward of Season 1.

The other cars are future progression content and must not be casually gifted simply because they already exist.

## Garage presentation
Normal player garage now keeps the complete 16-car collection visible instead of filtering locked cars out.

Locked cars are presented as mystery collection entries:

- name becomes `???`;
- artwork/card is shown as a black silhouette;
- lock indicator/message is shown;
- stats/specification details are hidden;
- primary action cannot select/use the car.

Unlocked cars remain fully normal.

Admin/dev full-car access remains unrestricted.

File changed:

- `src/game/scenes/GarageLazyCardsScene.js`

Existing ownership source remains:

- `src/game/cars/carUnlocks.js`
- key: `tdr2:carUnlocks:v1`
- starter is always `helix_spark`.

Important design rule: visible locked cars/circuits communicate the size of the future collection without forcing us to publish unfinished content.

---

# SEASON 0 — INDUCTION

## Role
Season 0 is not a normal monthly season. It is the permanent induction/tutorial progression for a new player.

It contains 14 stages and ends with the AVENIR Gripline.

Current event data lives in:

- `src/game/events/raceEvents.js`

## Final reward
Stage 14:

- Car: `avenir_gripline`
- Reward art: `assets/season/reward_cards/avenir_gripline_reward_top_down_race.webp`

## Mystery reveal rule
Final-season cars must not be fully revealed before acquisition.

The Season UI now reuses the same reward asset but applies a programmed black silhouette while the car reward is locked. No duplicate silhouette asset is required.

When the reward becomes obtained/claimed, the black filter is removed and the real artwork is revealed with a short visual transition.

This behavior was implemented in `src/game/scenes/SeasonScene.js` and is intended to be the standard for all final car rewards.

Commit that introduced the Season 0 mystery-car treatment:

- `53a321cc2413a425c6c379c7c58fadfdf1f43f87` — `Hide final season car until unlocked`

## Completed-state UX
When Induction is fully completed, the lobby must not fall back to the old `PILOTO DE ÉLITE · 7/7 EVENTOS` presentation.

The intended post-completion state is:

- `TEMPORADA 0 · COMPLETADA`
- `PILOTO COMPLETO`
- `14/14 ETAPAS`
- countdown / next-season messaging

Ordinary seasons begin on day 1 of a calendar month. If the next ordinary season is not available in the current build, UI must fail safely with a “próxima temporada / muy pronto” state rather than resetting or breaking.

---

# SEASON 1 — DESIGN DECISIONS

## Final reward
Season 1 final reward is confirmed as:

- `CROWN Axis`
- car id: `crown_axis`

Reasoning:

- do not repeat HÉLIX immediately after starter Spark;
- do not repeat AVENIR immediately after Gripline;
- CROWN gives the player a third distinct brand/personality;
- Axis is already homologated and visually/gameplay-wise appropriate as an early progression reward;
- more extreme cars should be saved for later seasons/events.

## Reward artwork
Approved reward composition:

- CROWN Axis placed on the same rectangular reward plinth/angle language as the AVENIR Gripline reward.
- Transparent-background WebP was generated and uploaded by the user.
- Canonical intended path:
  `assets/season/reward_cards/crown_axis_reward_top_down_race.webp`

Season 1 stage 14 should use this asset.

Before acquisition, Axis must use the same programmed black-silhouette treatment as Gripline; when claimed, it reveals to full color.

## Season cadence
Season 1 is the first normal monthly season.

Calendar rule:

- ordinary seasons begin on the first day of a month;
- Season 0 is special/permanent induction;
- completed monthly season waits for the next season rather than immediately looping/restarting;
- lobby/season panel should display a live countdown to the next start when appropriate.

## Anti-rush design goal
Do NOT allow an engaged player to clear the entire monthly season in ~5 days and then have nothing seasonal to pursue for the remaining ~25 days.

Do not solve this by inflating every target into boring grind.

Chosen direction: staged availability by weekly blocks, with previous stages never expiring.

Proposed block schedule:

- Days 1–7: stages 1–5 available
- Day 8: stages 6–8 become available
- Day 15: stages 9–11 become available
- Day 22: stages 12–14 become available

This means the final CROWN Axis cannot be earned before approximately day 22 by a player who starts on day 1, while a late-arriving player can catch up because prior blocks remain open.

Target completion pacing:

- regular consistent player: roughly 20–25 days;
- highly active day-one player: still calendar-gated until final block;
- late starter: should still have a realistic recovery path with concentrated play.

## Difficulty curve
Season 1 mission difficulty should rise meaningfully:

- stages 1–3: easy / onboarding to the season;
- stages 4–6: easy-medium;
- stages 7–9: medium;
- stages 10–12: medium-high;
- stage 13: difficult;
- stage 14: compound final challenge.

Avoid pure “do N more laps” escalation. Later missions should combine cleanliness, variety, distance, crafting/equipment or competitive activity when those metrics are reliable.

## Track availability constraint for Season 1
Because launch public content is now only three tracks, Season 1 missions must be designed around:

- Circuito Atlántico
- Karting Tenerife
- Karting Canarias

Do not require 4/5/6 public circuits until additional circuits have actually been homologated and unlocked.

---

# REAL CLEAN LAPS

## Problem found
Season 0 already distinguished in text between a valid lap and a clean lap, but the implementation did not.

Previously `src/game/events/raceEvents.js` counted a lap as clean when its stored `penaltyMs` was zero.

That is not a reliable definition of a clean lap. In practice valid laps could be counted as clean simply because the lap history had no penalty value, even if the car had left the track.

## Definitions
### Valid lap
A lap that completes the required checkpoint sequence in the correct order and crosses the finish line correctly.

### Clean lap
A valid lap during which the player's car never leaves the legitimate track ribbon for the entire lap.

A lap may therefore be valid but not clean.

## Detection rule
A lap starts in a clean state.

During the lap:

- runtime samples the player's position;
- if `_isOnTrack(x,y)` becomes false, that lap is permanently marked dirty;
- returning to the track does not restore clean status for the same lap;
- at valid lap completion, clean telemetry is incremented only if the dirty flag was never triggered.

Kerbs/pianos that are part of the legitimate drivable surface remain valid because existing kerb geometry bridges into `_isOnTrack`.

This is intentionally independent of grip/speed/penalty physics. Therefore Raven Hollow can preserve unique surface penalties without redefining what a clean lap is.

## New telemetry
Files:

- `src/game/seasons/cleanLapTelemetry.js`
- `src/game/scenes/RaceCleanLapScene.js`

Storage key:

- `tdr2:cleanLapTelemetry:v1`

`src/game/events/raceEvents.js` now reads the dedicated clean-lap telemetry instead of deriving clean laps from `penaltyMs === 0`.

Commit:

- `296dd32e5ee7197fe10bd304b374fa56c69f7eff` — `Use genuine clean-lap telemetry in season objectives`

Race lazy loader in `src/game/game.js` now loads `RaceCleanLapScene.js`, which wraps the existing graphics/race chain while leaving the established race implementation intact.

---

# IMPORTANT IMPLEMENTATION COMMITS FROM THIS BLOCK

- `53a321cc2413a425c6c379c7c58fadfdf1f43f87` — Hide final season car until unlocked.
- `d8d22b7165efd58f8a170b7e90ee16ea87885e16` — add track unlock persistence layer.
- `ae89b0ed33c73697483ff0e63cf1bbf2edeec8fd` — garage collection shows locked cars as mystery entries.
- `f954ff34d7b348d4107c07bf21483c47e34454c7` — add track progression selector wrapper.
- `f774b1970a658ba6aa5da52eaa9c920dabb8b904` — route TrackGarage lazy loading through progression wrapper.
- `5bf290db593b8dffbb7cd1d17daf058f4f01191b` — add clean-lap telemetry helper.
- `553960b0fbcd1648d910fb76b278f6c540004b42` — add race clean-lap runtime wrapper.
- `669afcf55cd1f54e822b104a422c9a746717f8c9` — route race loader through clean-lap wrapper.
- `296dd32e5ee7197fe10bd304b374fa56c69f7eff` — Season objectives consume genuine clean-lap telemetry.

Documentation expansion commit follows this list.

---

# FILES TO KNOW

## Cars/progression
- `src/game/cars/carUnlocks.js`
- `src/game/scenes/GarageLazyCardsScene.js`

## Tracks/progression
- `src/game/tracks/trackUnlocks.js`
- `src/game/scenes/TrackGarageProgressionScene.js`
- `src/game/tracks/trackRegistry.js`

## Seasons
- `src/game/events/raceEvents.js`
- `src/game/scenes/SeasonScene.js`
- `src/game/seasons/seasonCatalog.js`
- `src/game/seasons/seasonTelemetry.js`

## Clean laps
- `src/game/seasons/cleanLapTelemetry.js`
- `src/game/scenes/RaceCleanLapScene.js`
- `src/game/scenes/RaceKerbSurfaceScene.js`

## Runtime scene routing
- `src/game/game.js`

## Reward assets
- `assets/season/reward_cards/avenir_gripline_reward_top_down_race.webp`
- `assets/season/reward_cards/crown_axis_reward_top_down_race.webp`

---

# VALIDATION STILL REQUIRED ON DEVICE

Do not claim these are visually/functionally approved until the user verifies the deployed build on real Android/iPhone.

Next device checks:

1. Garage normal-player mode shows all 16 entries.
2. Locked car: `???`, silhouette, lock, hidden stats, cannot select.
3. Existing unlocked Spark/Gripline remain selectable.
4. Admin/dev garage still accesses everything.
5. Track selector shows all intended tracks but only Atlántico, Karting Tenerife and Karting Canarias are usable by normal player.
6. Locked track cannot launch.
7. Admin track selector bypass works.
8. Complete a valid lap without leaving track -> clean count increases.
9. Complete a valid lap after leaving track and returning -> valid count increases but clean count does not.
10. Drive over legitimate kerb/piano without leaving allowed surface -> should remain clean.
11. Check Raven Hollow later in admin to confirm no surface-penalty regression.
12. Confirm Season 0 stage 14 Gripline silhouette/reveal still works after the new wrappers.

At the time of writing, GitHub Actions for the clean-lap/progression changes had been triggered; build success must be checked rather than assumed.

---

# NEXT DEVELOPMENT ORDER

1. Verify garage + track locks + real clean laps on Android.
2. Fix any visual/input regressions before adding more progression complexity.
3. Implement Season 1 as a separate monthly season data set, not as a rewrite of Induction.
4. Use staged weekly availability so stage 14 cannot be rushed in the first days.
5. Use `crown_axis_reward_top_down_race.webp` for Season 1 stage 14 with mystery silhouette until claim.
6. Design Season 1 missions specifically around the three launch tracks and genuine clean-lap telemetry.
7. Continue polishing locked tracks one by one; when a track reaches launch quality, define a deliberate unlock path and release it as new progression content.
8. Do not burn through all 14 remaining cars rapidly; distribute them across seasons/events/progression over time.

---

# NON-NEGOTIABLE RULES FROM THIS SESSION

- Do not modify track geometry just to implement locking/progression.
- Do not modify Raven Hollow's special surface penalties as part of clean-lap work.
- Do not equate `penaltyMs === 0` with a clean lap again.
- Do not hide unfinished content by deleting it; keep it as locked collection/progression.
- Do not expose locked car stats/names if the design intent is mystery discovery.
- Admin/development must retain full access to locked content.
- Season 0 remains special Induction; ordinary seasons are monthly.
- Final season car uses one real reward asset plus programmed silhouette, not duplicate black assets.
- CROWN Axis is the confirmed Season 1 final car.
