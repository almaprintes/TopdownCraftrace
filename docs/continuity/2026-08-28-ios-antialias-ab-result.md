# iOS Atlántico antialias A/B — 2026-08-28

## Device result

Tested on iOS after commit `f87b34ab281a0f35cac9eb88d4c00a817830031b`, which disables WebGL antialias / antialiasGL only on iOS.

Observed result:
- the car itself still moves smoothly;
- the world/scenario still advances in visible small jumps;
- the stutter is less obvious than in the previous raw-delta (`smoothStep: false`) experiment, but remains clearly noticeable;
- therefore disabling WebGL antialias improves the symptom at most partially and is not sufficient as a fix.

## Interpretation

The result keeps render cost / frame pacing on iOS under suspicion, but does not establish MSAA as the root cause.

Do not mark the issue solved and do not combine this result with unrelated physics, timing, Tenerife, checkpoint or Android changes.

## Next diagnostic rule

Continue with one isolated graphics variable at a time. A suitable next A/B is to isolate one complete world-render family (for example authored Environment Studio decoration) while leaving geometry, physics, Beauty Layer, timing and controls unchanged. If the stutter disappears, investigate that family in depth; if it remains, restore it and move to the next renderer family.
