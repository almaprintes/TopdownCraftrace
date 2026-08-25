# Season system handoff — 2026-08-25

## Decision
The old finite 7-event progression is being evolved into a season system.

### Season 0 · Induction
- Permanent, one-time onboarding season per player.
- Target: 14 stages.
- Purpose: teach the game by making the player use its systems naturally instead of presenting a separate tutorial.
- Mission families include racing, clean laps, circuits, garage visit, crafting, equipping, Store purchase with soft currency, alternate modes and material collection.
- No mission may require watching an ad.
- No mission may require a real-money purchase.
- Premium monetization is disabled for Induction.

### Recurring seasons after Induction
Monthly themed seasons rotate cyclically:
1. Speed
2. Precision
3. Progression

This gives a repeating quarterly loop. The architecture remains open to adding a fourth Competition/Survival family later.
Each theme should draw roughly 14 monthly missions from a larger bank and vary parameters so a repeated theme does not repeat the exact same checklist.

## Reward lanes
The UI is designed from the start with two parallel lanes:
- FREE — active.
- PREMIUM PASS — visible but disabled and marked COMING SOON / PRÓXIMAMENTE.

If Premium is activated in the future, it should use the same season progress and unlock already-earned premium rewards retroactively when purchased. Premium should focus on cosmetic/exclusive/convenience rewards and avoid pay-to-win advantages.

## Implementation state
### Commit `87e84a0ada48bb350ca739cc314c22eb465cd097`
`Add season framework catalog`

Added `src/game/seasons/seasonCatalog.js` with:
- `SEASON_CYCLE = speed / precision / progression`;
- 14-stage Induction catalog in ES/EN;
- season-family labels;
- FREE/PREMIUM/COMING SOON UI copy;
- Premium disabled in the Induction definition.

### Commit `ba4bd16c44ce28ae47635cc221cc4f6405a73a47`
`Add Season 0 free premium screen`

Added `src/game/scenes/MenuSeasonScene.js` as a descendant of the existing active Menu chain. It overrides only the event/season presentation and leaves Store, controls, garage, duel and other menu behavior inherited.

The lobby event card is now presented as `Season 0 · Induction` and can open a full season modal.
The modal shows:
- 14 stages across a horizontal progression road;
- FREE rewards lane;
- PREMIUM PASS lane below it;
- Premium locked and labelled COMING SOON;
- current/completed state for the existing functional event chain.

Important: the original seven race-event objectives remain the current functional core. Stages 8–14 are deliberately catalogued and visible but not yet wired to telemetry/actions. They must not be presented as fully functional until their hooks are implemented.

### Commit `7e47ad7da7ecce7997e076a37a7b91d3d1f5da6d`
`Activate Season 0 menu scene`

`src/game/game.js` now imports `MenuSeasonScene.js`, activating the new presentation while preserving the rest of the menu inheritance chain.

## Next implementation work
Wire stages 8–14 to explicit telemetry rather than inferred UI state. Candidate hooks:
- garage visited;
- first craft completed;
- part equipped;
- soft-currency Store pack purchased;
- alternate mode completed;
- material amount collected;
- final combined induction completion.

Then migrate the first seven legacy event definitions into the same season mission engine so all 14 stages share one persistence/state model.

## Economy linkage
The baseline simulation is documented in `docs/economy/2026-08-25-store-economy-simulation.md`.
Season rewards should become controlled recurring monthly income rather than a one-time permanent 5,250-coin injection.

## Validation
The new Season 0 screen has been activated in code but has NOT yet been confirmed on iPhone. Do not claim it works correctly on iPhone until the user tests it.
