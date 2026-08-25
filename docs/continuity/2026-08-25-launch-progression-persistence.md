# Launch progression, beta reset and persistence — 2026-08-25

## Scope
This document records the decisions made after the Season 0 reward-card redesign concerning launch progression, beta save handling, orientation messaging and production persistence.

## 1. Beta saves are disposable
- Current beta/development saves are temporary and may be reset at any time during development.
- Existing beta-tester progress does NOT need migration or compatibility guarantees for the public 1.0 launch.
- The public launch is intended to start from a clean game state because systems, economy and progression are still changing heavily during beta.
- Do not spend engineering time protecting obsolete beta save formats unless needed for active development/testing.

## 2. Public launch starts as a true fresh progression
The intended 1.0 starting state is:
- one starter car owned/unlocked;
- minimal initial inventory/economy;
- Season 0 · Induction at stage 1;
- remaining cars locked and earned through game progression rather than all being available from the beginning.

This means the ownership/unlock model can be redesigned directly for launch without preserving current beta ownership state.

## 3. Season 0 reward rule: one reward per stage
Season 0 FREE milestones should move to ONE reward type per mission card.

Reason:
- the large reward card is now a marketing object and should have one clear visual hero;
- multiple reward assets compete for space and reduce desirability;
- the interaction reference is the season-pass principle where each milestone clearly communicates one thing worth earning.

Design rule:
- never place two independent reward types inside one FREE reward card;
- coins may alternate with a material/piece to create visual rhythm;
- later stages should feel progressively more valuable;
- the final stage should not be a pile of small rewards; it should be a single aspirational reward.

Proposed rhythm/direction, to be balanced before implementation:
1. Coins
2. Scrap/material
3. Coins
4. Better material
5. Coins
6. Better material/piece
7. Coins
8. Material/piece
9. Coins
10. Better piece
11. Coins
12. Higher-value piece
13. Rare/high-value component
14. Full car unlock

Exact quantities and exact assets remain to be balanced against the economy simulation.

## 4. Season 0 final reward: second car
The intended Stage 14 reward for Season 0 is a complete car unlock.

Player journey:
- player begins the public game with one starter car;
- the 14-stage Induction season teaches the main systems;
- completing Stage 14 awards the player's second car;
- the final card should visually break the normal reward rhythm and make the car the only hero asset.

Narrative/product intent:
"You now know how the game works. You earned another car. The real progression starts here."

This establishes cars as meaningful progression rewards that can later come from seasons, challenges, events and other systems without needing to give cars away constantly.

## 5. Orientation screen must become editable/localized UI
Current state:
- `index.html` uses `public/assets/ui/orientation_active.webp` inside `#rotateOverlay`.
- the visible orientation instruction is baked into the image rather than being editable/localizable DOM text.

Required redesign:
- keep/reuse the visual orientation artwork as appropriate;
- move all player-facing copy to DOM/HTML/CSS;
- support ES and EN through the active language setting;
- avoid introducing new baked-in language text inside orientation images.

Required orientation copy:

Spanish:
- `GIRA TU DISPOSITIVO`
- `Top Down RACE se juega en horizontal.`
- `⚠ VERSIÓN BETA`
- `TODO EL PROGRESO DE LA BETA SE REINICIARÁ CON EL LANZAMIENTO DEL JUEGO.`

English:
- `ROTATE YOUR DEVICE`
- `Top Down RACE is played in landscape.`
- `⚠ BETA VERSION`
- `ALL BETA PROGRESS WILL BE RESET WHEN THE GAME LAUNCHES.`

The BETA warning should have strong visual hierarchy and be impossible to miss.

## 6. Current persistence vs production persistence
Current beta/development persistence is primarily device-local (`localStorage` and existing local game stores). That is acceptable during beta but must not be the only source of truth for the published game.

Public-release target architecture:
- local persistence remains for fast startup, responsiveness, caching and offline tolerance;
- important progression is also synchronized to cloud storage associated with the player;
- reinstalling, replacing a phone or clearing local app data should not permanently destroy the player's public progression once cloud sync has been established.

Important cloud-backed state includes at minimum:
- car ownership/unlocks;
- currencies;
- materials/inventory;
- equipped/crafted progression where applicable;
- season progress and claimed rewards;
- important career/progression flags;
- purchase/entitlement state where applicable;
- important statistics needed across devices.

Not everything should be written remotely continuously. Race-frame state, movement and transient telemetry stay local unless a specific competitive/analytics system requires otherwise.

## 7. No classic username/password system planned
The intended player experience is NOT to build a traditional Top Down RACE registration form with a separate email/password database.

Target platform identity:
- iOS: use the player's Apple gaming/platform identity, with Game Center as the natural game identity integration;
- Android: use Google Play Games identity;
- the player should not normally have to create and remember an additional Top Down RACE password.

Important distinction:
- merely having an Apple ID or Google account on the device does not automatically synchronize our game data;
- the game still needs to authenticate/resolve the player identity and associate that identity with cloud save data.

## 8. Proposed backend: Firebase
Current preferred backend direction for public launch is Firebase because it gives a relatively direct mobile-game stack with managed infrastructure.

Proposed components:
- Firebase Authentication / platform identity integration;
- Cloud Firestore for cloud progression/save data;
- local game storage as cache/offline layer;
- later optional Firebase/Google services for analytics, crash reporting, notifications and server-side validation where useful.

Why Firebase currently fits:
- no conventional server fleet to administer;
- managed scaling;
- suitable integration path for mobile platform identities;
- a common cloud source can later support cross-device and potentially cross-platform progression;
- server-side functions can be added later for sensitive economy/competitive operations.

Supabase remains a plausible alternative if a Postgres-first architecture becomes desirable, but Firebase is the current preferred direction for the 1.0 planning phase.

## 9. Cross-platform progression
Two possible levels exist:

### Simple first release
- iOS save tied to iOS/Game Center identity;
- Android save tied to Google Play Games identity;
- no requirement that the same person automatically shares one save between Android and iOS.

### Future/full cross-platform model
- Firebase/common backend becomes the identity/save authority;
- Apple/Game Center and Google/Play Games identities can be linked to a common game account/UID;
- a player can recover the same progression across ecosystems once identities are deliberately linked.

This decision does not need to block current beta development, but the save schema should avoid making future cross-platform support unnecessarily difficult.

## 10. Economy/security rule for production
Sensitive progression must not trust only client-local values in the public game.

Especially sensitive:
- premium currency if introduced;
- real-money purchase entitlements;
- Premium Pass ownership;
- valuable car unlocks tied to purchases or controlled events;
- competitive rewards where cheating would affect other players.

For public release, sensitive operations should eventually be validated through store receipts and/or trusted server-side logic rather than accepting arbitrary client-edited local values.

## 11. Cost philosophy
Firebase may have a cost, but the architecture should be designed so infrastructure cost remains a small fraction of revenue.

Cost-control principles:
- use free quotas while the player base is small where applicable;
- sync meaningful state changes rather than every frame or every trivial event;
- examples of sensible sync points: race completion, reward claim, purchase, car unlock, equipment change, important progression update;
- batch/debounce writes where practical;
- monitor reads/writes/egress rather than treating cloud operations as free;
- set billing alerts/budgets before public scale;
- track `backend cost per monthly active player` against `revenue per monthly active player` as the game grows.

Desired business outcome:
backend cost should remain a very small percentage of game revenue. If backend cost becomes materially large because the game has grown, optimize usage before it becomes structurally inefficient.

## 12. Launch transition
The 1.0 launch is the clean boundary between beta and production persistence:

Beta:
- local progress;
- disposable saves;
- systems can be reset freely;
- explicit orientation-screen warning tells testers progress will be wiped.

Public 1.0:
- clean fresh start;
- one starter car;
- Season 0 begins from stage 1;
- Stage 14 awards second car;
- production-oriented local + cloud persistence begins;
- beta progress is not imported.

## Implementation status
These are documented product/architecture decisions. They are NOT all implemented yet.

Not yet to claim as complete:
- one-reward-per-stage Season 0 economy;
- Stage 14 car reward;
- one-car public starting ownership model;
- translated DOM orientation screen and beta-reset warning;
- Firebase authentication/cloud save;
- Game Center / Google Play Games production identity integration;
- production cloud security/receipt validation.

Do not state that any of those systems are live until they have been implemented and verified.