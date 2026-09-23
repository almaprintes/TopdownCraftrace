# Part dismantling in Recycler — 2026-09-21

## Tester-driven problem
A closed-test player unfamiliar with CraftRace accidentally crafted five Street engines. Crafted duplicates previously had no recovery path, so materials could become trapped in unwanted parts.

## Audit
The canonical crafting source is `src/game/garage/partsCatalog.js`: five families (engine, brakes, tires, suspension, transmission) and four tiers (Street, Sport, Racing, Prototype). `DIRECT_CRAFT_RECIPES` is the authoritative recipe table. Higher tiers consume the previous tier plus raw materials, so dismantling recursively flattens the full construction chain back to raw materials rather than returning a lower-tier part.

## Implemented rule
- Recycler now supports MATERIALS and PARTS.
- Part dismantling returns 90% of the raw materials represented by the canonical recipe chain.
- Integer rounding uses a largest-remainder allocation so low-cost Street recipes are not punished by rounding each material independently.
- No rewarded ad and no daily recycler limit for dismantling: the 10% material loss is the cost.
- Dismantling is irreversible and requires explicit confirmation.
- Quantity can be adjusted, including MAX.
- If a part ID is equipped on any car, one owned unit is protected and cannot be dismantled. Spare duplicates remain dismantlable.
- The operation revalidates inventory immediately before consuming the part and granting materials.

## Example
A Street engine uses the canonical Street engine recipe (8 scrap + 2 alloy). One dismantle targets 9 returned units out of 10 total input units, distributed proportionally. Multiple duplicate engines are calculated as one batch to keep the 10% fee consistent.

## Files
- `src/game/store/partDismantle.js` — quote/execution, recursive recipe flattening, equipped protection.
- `src/game/ui/PartDismantleDom.js` — part inventory, quantity, exact recovery preview, confirmation.
- `src/game/ui/MaterialExchangeDom.js` — entry from Recycler to PARTS.
- DEV version: 1.1.101.


## Closed-testing feedback and product response

This feature is a direct response to feedback and observed behaviour during the Google Play closed beta.

A tester who was not yet familiar with CraftRace's progression and crafting rules unintentionally crafted five Street engines. The game allowed the action correctly, but there was no way to recover resources from unwanted duplicate crafted parts. This exposed a usability/economy problem that could affect other new players: an understandable crafting mistake could permanently lock a significant amount of progression materials into duplicate parts.

We treated this as a beta finding rather than as user error. Based on that tester experience, the Recycler was expanded from material exchange only to include a dedicated part-dismantling flow.

The resulting design:
- lets players select unwanted crafted parts and dismantle one or several copies;
- previews the exact materials that will be recovered before confirmation;
- returns 90% of the original raw-material investment and keeps 10% as a dismantling cost, preserving an economic consequence without making the mistake permanent;
- protects an equipped copy so an active car part cannot be accidentally destroyed;
- requires explicit confirmation because dismantling is irreversible;
- uses a simple three-step interface: choose a part, choose quantity, see what comes back;
- was subsequently adjusted for short screens so the primary dismantle action remains reachable.

No rewarded advertisement is required for part dismantling. The material loss itself is the balancing cost.

### Google Play closed-test evidence

This change is an example of the closed-testing phase directly influencing the product before production review. Tester behaviour identified a real onboarding/progression issue that was not obvious from development testing alone. The beta feedback led to a concrete gameplay and UX change, implemented and tested in DEV 1.1.101 and visually refined in DEV 1.1.102-1.1.103.

For production-review questionnaires, the factual summary is:

> During closed testing, a tester accidentally crafted several duplicate upgrade parts and had no way to recover the materials. We used that feedback to add part dismantling to the Recycler. Players can now recover 90% of the materials from unwanted crafted parts, with safeguards for equipped parts, quantity selection, a recovery preview and irreversible-action confirmation. We also simplified the interface after testing so the process is easy to understand and the main action remains accessible on smaller screens.


## Additional closed-test feedback — engine audio

At least one closed-test tester specifically asked for an improvement to the car/engine audio. This feedback has been accepted and is part of the next polish work planned after the Recycler changes.

The current plan is to improve the engine sound using original/legal source recordings and a more convincing RPM-based audio treatment. Work is planned to begin on 2026-09-22. This item should be recorded as tester feedback that influenced the pre-production polish roadmap, but it must not be described as completed until the improved audio has actually been implemented and validated.

For production-review questionnaires, while the work is still pending, the factual summary is:

> A tester also specifically asked us to improve the vehicle audio. We took that feedback into account and added engine sound improvement to our pre-production polish work. We are preparing original engine recordings and an RPM-based implementation so the sound responds more naturally to the car. This work is being carried out as a direct result of closed-test feedback.
