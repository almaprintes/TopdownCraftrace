# Rewarded actions + secure Shipaton Judge access — 2026-09-22

## Scope

DEV 1.1.170 extends the existing rewarded flow without adding purchases or changing the game economy. One native AdMob rewarded unit is reused; RevenueCat receives a distinct placement for each product action:

| Action | RevenueCat placement | Grant condition |
| --- | --- | --- |
| Post-race loot x2 | `post_race_double_loot` | Native reward callback plus successful RevenueCat SSV |
| Publish Race Control record | `race_control_publish_record` | Verified reward before the atomic record/ghost RPC |
| Download a rival ghost | `race_control_ghost_download` | Verified reward before the ghost RPC; local unlock is then reused |
| Recycler second daily exchange | `recycler_exchange_2` | Verified reward before exchange 2 |
| Recycler third daily exchange | `recycler_exchange_3` | Verified reward before exchange 3 |
| Store +100 coins / 4 h | `store_coins_100_4h` | Verified reward plus the existing local cooldown claim |

The client checks both `completed === true` and `verified === true`. A dismiss, load/show failure, timeout or failed SSV never grants the requested action. Claim identifiers are stable for the underlying record, ghost, recycler day/ordinal or store cooldown window. The business operations remain idempotent: best-time publication is an upsert, a downloaded ghost is unlocked once, recycler state advances once, the Store retains its 4-hour cooldown and the post-race x2 keeps its existing claim ledger.

After a successful record publication, Race Control fetches and stores a fresh snapshot for that track in the same interaction, then rerenders its leaderboard. Watch and VS share the same local ghost entitlement so the player does not watch twice for one record.

## Android bridge

The local Capacitor wrapper accepts only the six placements and their matching claim prefixes. Production continues to load the configured AdMob unit through RevenueCat Ads and requires SSV before returning `verified: true`. The dedicated test application variant uses Google's official rewarded test unit and can return a verified test result without affecting the production package. No new AdMob, RevenueCat or secret identifier was invented.

The web wait is 180 seconds and the native watchdog is 170 seconds, allowing load, playback and real SSV to complete without the old 45-second browser timeout winning the race. Native logging retains attempt, placement, claim, SDK error code/message, reward, dismiss and final claim state.

## Shipaton Judge Mode

Judge authority now comes from Supabase, not from a manipulable local flag. Migrations:

- `20260922_009_shipaton_judge_access.sql`: private hashed codes and entitlements plus authenticated RPCs.
- `20260922_010_shipaton_judge_hardening.sql`: foreign-key index and removal of unintended execution grants from the RLS event-trigger helper.

The activation RPC hashes the submitted code with SHA-256 inside PostgreSQL, locks the matching row, checks active/expiry/activation limit and associates the entitlement with the current anonymous `auth.uid()`. Tables live in the private schema, have RLS enabled with no direct policies/grants, and are accessible only through the two narrowly-scoped `SECURITY DEFINER` RPCs with an empty `search_path`. Anonymous/public execution is revoked; authenticated execution is intentional.

One real review code exists in Supabase, active through 2026-12-31 UTC, with at most 25 activations. Its plaintext exists only in the owner's local protected file `~/.topdownrace/shipaton-judge-code.txt` (mode 600); the repository and database contain no plaintext copy. The transactional activation test was rolled back, leaving activation and entitlement counts at zero.

Judge Mode temporarily exposes all cars, tracks and modes. Garage/Factory evaluation uses an in-memory sandbox with ample coins, materials and parts, while unlock writes and garage saves remain outside the player's real progression. Disabling the mode returns to the untouched stored garage. The client revalidates an enabled preference with Supabase at startup/pageshow and fails closed when verification is unavailable.

Normal players incur no extra startup request: entitlement lookup runs only after opening the Judge panel or when a previously enabled Judge preference needs revalidation.

## Validation

- `scripts/rewarded-access-smoke.mjs` covers strict verification, placement/claim mapping, Store cooldown, native bridge acceptance/rejection and source guards for the five new gates plus backend Judge authority.
- Supabase migrations are applied to project `juukbnkjboiazqggqcyv`.
- Security Advisor reports the two private no-policy tables as informational deny-all and the two authenticated `SECURITY DEFINER` RPCs as intentional. The remaining warnings predate this change (anonymous-auth policies, password leak protection and existing Race Control RPCs).
- Performance Advisor reports only pre-existing RLS init-plan warnings and unused indexes; the Judge foreign-key index is present and initially unused as expected.

Before the next Android release, run the wrapper unit tests with JDK 21, build the official test variant, exercise every placement on an emulator/device, then repeat the production x2/SSV path with the real configuration. Do not promote an AAB solely from web smoke results.
