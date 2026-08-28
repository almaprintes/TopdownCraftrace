# iOS render stutter investigation — 2026-08-28

## Scope

Primary test track: Atlantico (`track01`). Android is the reference platform because it remains fluid even on older hardware. iOS reproduces the same progressive/irregular stutter on two equivalent iPhones, so the issue is not specific to one device.

## Confirmed observations

- Android sustained `update` times after lap 1 were roughly 1.4–1.5 ms on Atlantico.
- iOS can begin reasonably and then become progressively irregular from around lap 2 onward.
- The player car can remain comparatively smooth while the scenery presents in jumps.
- Input was checked directly: examples showed `THR 1.00`, so the gas pedal was not simply dropping touch input.
- When the slowdown is visible, Phaser delta smoothing can diverge from wall time. Examples observed included SIM/WALL ratios around 0.75, 0.60 and 0.66.
- A browser-level rAF diagnostic proved the visual symptom is real scheduling/presentation loss rather than only a camera illusion. Observed rAF maxima included ~90, 112, 130, 157, 210 ms and one user-observed peak of 643 ms that was not captured.
- A lightweight 50 ms main-thread watchdog also showed real stalls, including >100–200 ms episodes. Some rAF spikes did not have an equally large MAIN spike, so both main-thread blocking and WebKit scheduling/composition may be involved.
- Safari/iOS does not expose the `longtask` PerformanceObserver entry type here (`TASK API unavailable`).
- Notifications and screenshots can create additional spikes and contaminate measurements, but they are not accepted as an excuse or user requirement: the final game must tolerate normal iOS usage.

## Renderer/platform facts measured

- Phaser version: 3.90.0.
- iOS and Android both use WebGL1 in the tested build.
- iOS: Apple GPU, `MAX_TEXTURE_SIZE 16384`.
- Android reference: ANGLE / Qualcomm Adreno 610, `MAX_TEXTURE_SIZE 4096`.
- Canvas backing store is 1:1 with CSS size on both devices. iOS was approximately 956x440 and Android 792x359 in the test captures.
- Therefore this is not an accidental Retina DPR x3 framebuffer problem.

## A/B experiments and conclusions

### `smoothStep` off on iOS

Commit: `ea8e47ea1d9b7c0cf873bf4e8e9bdd6a75e24185`.

Result: simulation felt more continuous in time but the car felt slow and the scenery still jumped. Reverted by `2a38ffe57704cded163abb651c016fdad3ab8360`.

Conclusion: smoothing was hiding some long frames but was not the root cause.

### invasive LAP CPU profiler removal

Commit: `8bf1a8933c355002e18d35eb5aa8a060bc22a91f`.

Continuous `performance.now()` wrappers were removed because they could themselves be expensive on Safari/WebKit. Do not reintroduce this style of profiler.

### iOS antialias/MSAA off

Initial A/B commit: `f87b34ab281a0f35cac9eb88d4c00a817830031b`.

Result: no decisive cure. iOS still degraded and the scenery still jumped.

### viewport / visualViewport scroll settle

Disabling the `visualViewport.scroll` reaction in the orientation settle path did not materially improve the problem. It was restored.

### camera / follow experiments

Attempts to force a different camera ownership/follow path could make the player car itself shake. Camera experiments did not solve the root issue and should not be repeated casually.

### static framebuffer / renderer diagnostics

Confirmed backing store 1:1 and WebGL1 on both platforms; no Retina multiplier or WebGL2 mismatch was found.

### RAF + MAIN diagnostics

These are the most useful diagnostics from the session. They showed irregular browser scheduling with long gaps. The pattern can move from regular -> good -> very bad inside the same race.

### `desynchronized: true` on iOS

Commit: `56ddd7edf5fa014a0cf24a4f046f0744982c971e`.

Result: this is the most promising renderer change so far. In follow-up captures the worst observed spikes were materially lower for long stretches, with many RAF maxima in the ~35–62 ms range instead of repeated 100–200+ ms episodes. It is not a complete fix, but the user explicitly prefers keeping this improvement for now.

Do not revert this unless a later controlled test proves it harmful.

### iOS WebGL batch size 4096 -> 1024

Commit: `d667e99ee9dfc379954e28deb0d4768989d3c854`.

Result: no clear enough improvement to call it a solution. It remains in the current experimental baseline while the next A/B is tested; reassess before shipping.

### GRASS penalty hypothesis

The user observed larger spikes while driving on GRASS. A controlled A/B temporarily neutralized the standard surface penalty only on iOS + Atlantico while preserving the visual grass surface.

Result: the car kept asphalt-like speed on grass, but the progressive stutter and high RAF/MAIN spikes remained. Therefore the GRASS physics penalty is not the root cause. The experiment was fully reverted.

Important design rule: Raven Hollow is the special circuit with different surface behavior. Other normal circuits should share the standard penalties.

### minimap / centerline allocation cleanup

Commit: `1be27460edae87fc7ccef5778274de4b837d7426`.

The local-search projection was already optimized versus a full centerline scan, but it still allocated temporary arrays/objects in the hot loop. The implementation was rewritten to use scalar values and avoid those transient allocations without removing the minimap, checkpoints or HUD.

Result at time of this handoff: no miracle; evaluation is partially contaminated by screenshots/notifications, so keep the optimization but do not claim it solved the iOS issue.

## Current retained iOS diagnostics

- RAF cadence line: average, max and counts above 20/33/50 ms.
- MAIN watchdog line: target 50 ms timer and max/counts above 70/100/150 ms.
- TASK line reports API unavailable on current iOS WebKit.
- Static BUF/CSS/DPR and renderer/GPU lines.
- OBJ/TWN/TMR growth line showed stable object counts (about 66–68 objects) rather than obvious scene-object growth.

These diagnostics are temporary and must be removed/hidden before shipping.

## Physics/timestep clarification before final experiment

Official Phaser 3.90 documentation states Arcade Physics defaults to `fixedStep: true` and `fps: 60`. The current game config does not override these defaults. Therefore writing a second custom fixed-timestep accumulator around the existing physics would duplicate Phaser behavior and risk breaking controls, checkpoints and future multiplayer.

The safer final architectural A/B is to keep Phaser's fixed-step Arcade simulation and change only the iOS game-loop driver away from `requestAnimationFrame`.

## FINAL A/B PLAN — last iOS cartridge

Single variable:

- Android: keep current `forceSetTimeOut: false` / rAF loop exactly unchanged.
- iOS: set Phaser FPS config `forceSetTimeOut: true` while retaining target 60 and existing fixed-step Arcade Physics.

Rationale:

- We have directly measured pathological iOS rAF gaps, including captured 100–210 ms and a user-observed 643 ms maximum.
- Phaser officially supports a setTimeout-driven game loop.
- This does not add an intentional gameplay buffer and does not require different vehicle physics by platform.
- It may keep game simulation/presentation scheduling moving when WebKit's rAF path is the bottleneck.
- It cannot guarantee that the iOS compositor will present during a 600 ms OS-level stall, so this is a go/no-go experiment, not a promised cure.

Success criterion:

- Clearly improved sustained visual smoothness in normal iOS play, without requiring Do Not Disturb or special user behavior.
- RAF/MAIN extreme spikes should become much less frequent/severe, and the scenery should no longer degrade to the perceived ~10 fps / slow-motion behavior.

Failure criterion:

- Frequent freezes/tirones of hundreds of ms remain, or controls/gameplay become worse.

If this final A/B fails, stop spending project time on iOS performance for now. Revert experimental diagnostics/A-B changes as appropriate, preserve the known-good Android gameplay, and prioritize Android publication. The repository history allows exact rollback; do not reconstruct from memory.
