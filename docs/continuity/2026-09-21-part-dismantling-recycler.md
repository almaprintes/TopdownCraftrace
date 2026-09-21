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
