# Launch progression locks + real clean laps — 2026-08-29

## Rollback
Pre-change rollback branch:
`backup/pre-launch-progression-locks-2026-08-29`

Baseline SHA:
`53a321cc2413a425c6c379c7c58fadfdf1f43f87`

## Cars
Player garage now keeps the complete 16-car collection visible.
- Starter: `helix_spark`.
- Already unlocked cars remain usable (e.g. `avenir_gripline` after Induction).
- Locked cars render as `???`, black silhouette, lock messaging and hidden stats.
- Locked cars cannot be selected for play.
- Admin/dev full-car access remains unrestricted.
- `crown_axis` remains reserved for Season 1 final reward.

## Tracks
Three launch tracks are immediately available:
- `track01` — Circuito Atlántico
- `karting-tenerife`
- `karting-canarias`

All other player-visible official tracks remain in the selector but are presented as mystery locked circuits. They cannot be launched until unlocked. No track geometry, Beauty Layer, AI or surface physics data is removed or modified.

Admin mode bypasses track locks. Track unlock persistence is in `src/game/tracks/trackUnlocks.js`.

## Clean-lap definition
A valid lap remains a lap that completes the checkpoint sequence correctly.
A clean lap is now a valid completed lap during which the player never leaves the track ribbon.

Detection uses the runtime `_isOnTrack(x,y)` geometry check. Existing kerb bridging remains respected, so valid kerbs/pianos count as track. This is independent from speed/grip penalties and therefore does not rewrite Raven Hollow's differentiated surface physics.

Clean laps are persisted separately in `tdr2:cleanLapTelemetry:v1`; Season 0 clean-lap objectives now read this telemetry instead of assuming `penaltyMs === 0` means clean.

## Files
- `src/game/tracks/trackUnlocks.js`
- `src/game/scenes/TrackGarageProgressionScene.js`
- `src/game/scenes/GarageLazyCardsScene.js`
- `src/game/seasons/cleanLapTelemetry.js`
- `src/game/scenes/RaceCleanLapScene.js`
- `src/game/events/raceEvents.js`
- `src/game/game.js`

## Next
Season 1 mission data should be built on the three launch circuits and the new genuine clean-lap metric, with staged weekly availability so the CROWN Axis cannot be earned in the opening days.
