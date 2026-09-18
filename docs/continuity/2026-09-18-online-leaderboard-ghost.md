# Online leaderboard + ghost — validated architecture (18/09/2026)

## Product decisions
Development stays on `main`; `beta-1.0` is frozen. Local replay/storage remains compatible and offline-first.
- Lazy Supabase anonymous Auth on first online action; identity is `auth.uid()`, nick is non-unique display data.
- Coarse continent/country/region only; no GPS.
- Rewarded gates: publish selected record, refresh online leaderboard, download a new rival ghost. Cached ghost can then be raced free/offline.
- One best published record per user+track. Faster publication replaces record+matching ghost atomically.
- Snapshot scopes: Global/Continent/Country/Region, Top 25 + nearby rank window, locally cached.
- Never expose `auth.uid()` as ghost selector; use an opaque record reference.
- Client laps are untrusted; RPC ownership checks are not anti-cheat proof.

## Supabase state
Applied/versioned migrations: `20260918_001` through `20260918_006` in `supabase/migrations`: base tables, RLS, submit record, profile upsert, leaderboard and Race Control snapshot. Auth-only negative SQL Editor tests passed. Client integration and final direct-write hardening remain pending until record+ghost publication is finalized.

## Replay investigation
Shared `TDRLAP1` is large because it uses verbose JSON, camera/viewport data and Base64. Online racing needs only real movement samples. Local Top-10 replay remains unchanged: real `{t,x,y,r}` samples plus presentation camera data. The online codec is additional and must not replace local persistence.

## Real-device fidelity experiments — DEV 1.0.193–1.0.197
Atlántico 0:09.198, original 14,781 B / 183 samples:
- 50 ms: 3,448 B; max position error 4.553; RMS 0.313.
- 20 ms: 8,407 B; max 0.686; RMS 0.111.
- Native JSON: 4,298 B; 183/183; max 0.155; RMS 0.081; max angle 0.00005 rad.
- Native delta-binary estimate: 1,139 B.

Tenerife long-lap test, original 48,061 B / 596 samples:
- 50 ms: 13,769 B; max 4.760; RMS 0.613.
- 20 ms: 34,167 B; max 1.683; RMS 0.169.
- Native JSON: 14,320 B; 596/596; max 0.173; RMS 0.085; max angle 0.00005 rad.
- Native delta-binary estimate: 3,594 B.
- Real encoded delta-varint movement stream: 3,475 B.

Native residual matches X/Y quantization at 0.25 world-unit precision (`XY_SCALE=4`), not curve simplification.

## Accepted online ghost format
**NATIVE recorded samples + delta/ZigZag/varint binary.** Do not use fixed-cadence resampling without new evidence.
- Preserve every original sample time and sample count.
- X/Y scale 4; rotation scale 10000.
- Quantized row: `[t,x,y,r]`.
- First row absolute; later rows signed deltas; ZigZag + varint.
- Omit camera samples/viewport/presentation-only data.

Real encoder/decoder live in `src/game/online/onlineGhostCodec.js`. DEV 1.0.197 verified Tenerife 596-sample encode -> binary -> decode as **ROUNDTRIP EXACT**, so binary compression adds zero loss beyond accepted quantization.

## Storage implication
Measured raw movement streams are ~1.1 KB (Atlántico) to ~3.5 KB (Tenerife), plus small metadata. DB-backed storage is practical enough to design before adding Supabase Storage. Prefer compact binary (`bytea` candidate) over JSON if RPC/client transport remains clean. Keep record+ghost consistent; worse/equal publication must never replace the best ghost. Cache downloaded ghosts by track + opaque record ref + time/format version.

## Next
1. DEV-only visual diagnostics removed after validation.
2. Keep validated codec/round-trip helpers.
3. Add a versioned migration for record+ghost metadata/payload and atomic authenticated publication.
4. Add opaque public record ref and controlled ghost download path without UUID exposure.
5. Then wire lazy Supabase client/auth and rewarded gates into RACE Control.
6. Before public Google Play release, update Data Safety for the data actually transmitted.
