# TDR Supabase security audit — 2026-10-31

## Confirmed hole closed: direct cloud-save DML

Prior to migration 035, authenticated users could INSERT/UPDATE their own public.player_progress via Data API, bypassing the CAS revision, JSON format/size and deduplication checks in the save RPC. RLS prevented cross-user updates but NOT bypassing the rules on one's own save.

Applied migration cloud_save_rpc_only_permissions_20261031 changes only the existing save RPC to SECURITY DEFINER (the body and empty search_path remain unchanged) and removes direct INSERT/UPDATE/DELETE privileges on the progress table. Own SELECT with RLS remains. RPC is executable only by authenticated role and uses auth.uid(); anonymous Supabase Auth players still work. User data was not changed.

Post-migration live checks: two cloud saves, fifteen records/ghosts, twenty-six profiles preserved; authenticated direct DML denied, SELECT and RPC EXECUTE allowed; unauthenticated RPC denied.

The game client src/game/online/playerProgressRepository.js reads player_progress via scoped GET and saves ONLY through RPC. A synthetic, independent PostgreSQL regression runs in scripts/cloud-save-rpc-privilege-smoke.mjs on GitHub Actions.

## Remaining audit blockers

- Independent geometric/physical anti-cheat is not deployed: structural ghost validation exists, score-only submission still bypasses trajectory proof. Tenerife original + clockwise judge is shadow-only.
- Account transition: 96 anonymous Supabase Auth accounts need safe link-to-Google/Apple with unchanged UUID; do not lock existing players.
- 14 signed-in SECURITY DEFINER RPCs (including the newly hardened cloud save) are deliberately exposed. Exact role/ownership tests for each RPC remain necessary; the linter marks exposure even when intentional.
- Public web comment RPC deliberately accepts anon; rate-limited and input bounded. Monitor distributed abuse.
- Info lints: 5 RLS-enabled-without-policy tables intentionally deny direct access. 2 backup tables lack primary key; index profiles_country_idx remains until measured.
- Auth leaked-password protection warning remains: official Supabase docs say HaveIBeenPwned leaked-password protection requires Pro or higher. Current TDR organization is Free; do not buy Pro just to silence the linter. See https://supabase.com/docs/guides/auth/password-security .
- Performance p50/p90/p99, network egress, backup restoration on real Android/iOS, and future multiplayer architecture still need live evidence.

Never silence advisors by granting unnecessary permissions. Do not overwrite, ban or delete any past player data, nor alter production Google Play or suspended ads.
## CI result (2026-10-31 07:46 UTC)
- Hosted isolated PostgreSQL audit: SUCCESS, GitHub run 41181910996.
- Tests proved synthetic authenticated save insert/no-op/conflict/update, cross-user read denial, direct DML denial.
- Existing native ghost structural checks and both Tenerife shadow-judge directions also passed.
- These tests do not yet constitute real Android/iOS OAuth linking QA or authoritative physics certification.
