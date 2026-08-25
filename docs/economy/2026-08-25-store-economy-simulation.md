# Store economy simulation — 2026-08-25

Branch: `main`

## Source data
This analysis uses the live economy values in `main`:
- Material Store packs: 450 / 500 / 650 / 800 coins.
- Free rewards: 250 coins every rolling 24 h from Daily Gift; rewarded path currently modeled at 150 coins every rolling 4 h for balance discussion (runtime implementation may still differ until explicitly changed).
- Material loot cadence: 150 material rolls per hour of validated competitive driving.
- Material target shares: scrap 38%, alloy/rubber/disc/spring/gear 10% each, compound 8%, ECU 4%.
- Average stack assumptions implied by runtime stack-size code: scrap 3, family materials 2, compound 1.5, ECU 1.
- One-time race-event coin rewards total 5,250 coins.
- Economy 2.0 target in code: about 50 active hours to complete all five Prototype parts of one car when material rewards are consistently doubled.

## Expected material income per active racing hour
At 150 rolls/h the long-run expected material income is approximately:

| Material | Expected units / hour |
| --- | ---: |
| Scrap | 171 |
| Alloy | 30 |
| Rubber | 30 |
| Disc | 30 |
| Spring | 30 |
| Gear | 30 |
| Compound | 18 |
| ECU | 6 |

These are long-run expectations; the adaptive loot-balancing code intentionally reduces variance over time.

## Current Store pack value as equivalent racing time
Equivalent time is estimated as the slowest naturally-earned ingredient in each pack at the rates above.

| Pack | Current price | Approx. equivalent racing time |
| --- | ---: | ---: |
| Mechanics | 450 | 24 min |
| Chassis | 500 | 44 min |
| Technology | 650 | 60 min |
| Paddock | 800 | 40 min |

The relative prices are therefore not linear with the amount of racing time replaced. Technology is naturally more valuable because ECU is deliberately scarce.

## Prototype progression sanity check
A complete Street → Sport → Racing → Prototype chain for one family requires cumulatively about:
- 3,413 scrap
- 2,982 units of that family's secondary material
- 356 compound
- 113 ECU

At the expected raw drop rates the family-specific secondary material is the bottleneck at about 99.4 active racing hours. Doubling material rewards consistently cuts this to about 49.7 hours, matching the ~50-hour Economy 2.0 design target in code. This validates the drop-rate math and gives a useful anchor for Store pricing.

## Free-coin scenario: 250 daily + 150 rewarded every 4 h
The theoretical maximum is 1,150 free coins in a 24-hour period (250 + six rewarded claims × 150). This is an extreme ceiling, not a realistic median.

A 10,000-player / 30-day Monte Carlo was run with explicit engagement assumptions:

- Casual: active on 55% of days, ~0.25 rewarded claims per active day.
- Habitual: active on 85% of days, ~1.4 rewarded claims per active day.
- Intensive: active on 98% of days, ~3.8 rewarded claims per active day, capped by the six-claim daily physical maximum.

Recurring free-coin results, excluding one-time race events:

| Profile | Median 30-day free coins | P10–P90 |
| --- | ---: | ---: |
| Casual | 4,750 | 3,700–5,850 |
| Habitual | 11,750 | 10,145–13,350 |
| Intensive | 23,450 | 21,550–25,255 |

The event chain can inject another 5,250 one-time coins, so early-game purchasing power is materially higher than recurring income alone.

## Price-range conclusions
For rewarded ads to feel worthwhile without becoming the dominant progression source, a useful target is for one 150-coin ad to cover roughly 15–30% of a material pack, while the 250-coin daily gift covers roughly 25–50%.

Recommended test ranges:

| Pack | Current | Recommended test range |
| --- | ---: | ---: |
| Mechanics | 450 | 500–600 |
| Chassis | 500 | 600–700 |
| Technology | 650 | 800–950 |
| Paddock | 800 | 750–900 |

These are balancing ranges, not final prices. Technology deserves the strongest premium because ECU is the principal rare ingredient. Paddock can remain relatively efficient because it is broad rather than focused.

## Reward recommendation
Balance recommendation from this pass:
- Daily Gift: 250 coins / rolling 24 h.
- Rewarded video: 150 coins / rolling 4 h.

100 coins per rewarded view is likely to feel weak relative to current pack prices. 200–250 every four hours starts making repeated ads too powerful. 150 is the best first test point.

## Major risk discovered: event front-loading
The seven race events award 5,250 coins in total. Because the objectives are finite and sequential, this can finance roughly 6–12 current material packs during the onboarding/event chain. This is not automatically bad — it can provide a strong early progression burst — but it means Store balance must be tested in two phases:
1. onboarding while event coins are flowing;
2. steady-state after the event chain is exhausted.

Do not balance recurring Store prices solely against the first few sessions, or prices will become too cheap in steady-state.

## Next test
Before changing all Store prices, keep this document as the baseline and test the economy with real play sessions. Track:
- active racing minutes;
- material income by type;
- coins earned by source;
- packs purchased;
- time to first Street/Sport/Racing/Prototype upgrade;
- rewarded-video claims per active day.

Then adjust within the ranges above rather than making large jumps.
