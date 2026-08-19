# Topdown Craftrace — Physics Base 1.0

Frozen: 2026-08-19

Reference chassis commit: `433651cf043c9f2312fdc8cd264948c9645608a7`
Reference car: `veloce_flash` — VELOCE Flash

## Rule

The shared vehicle physics established at this point is the publication baseline. Individual vehicle identity must be created through car specs, handling profiles and terrain setup, not by changing the shared chassis/controller merely to make one car feel different.

Change the shared physics only to correct an objective system-wide bug that affects the base model itself.

## Validated base behavior

- speed-dependent steering authority
- steering input re-engagement smoothing
- neutral tyre self-alignment
- progressive tyre saturation and grip loss
- progressive brake pressure and braking turn-in saturation
- progressive throttle load transfer
- continuous brake ↔ neutral ↔ throttle chassis load transition
- low-speed lateral tyre scrub
- stronger low-speed engine braking / natural coast-down

## Reference benchmark

VELOCE Flash was validated by the player on Karting Tenerife after the final chassis refinements. It is the zero point for comparing all other cars. Do not assign a new handling profile to `veloce_flash` during first-pass family balancing.
