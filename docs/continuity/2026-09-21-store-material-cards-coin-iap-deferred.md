# Store material cards + coin IAP deferred — 2026-09-21

## Decision
Real-money coin packs are intentionally not part of the current Google Play review build. They are deferred to a future update after the current production/review milestone. Do not reintroduce them accidentally during Store work.

## Removed from current runtime/source
- Store MONEDAS / COINS tab and real-money coin-pack carousel.
- Coin-pack definitions and simulated purchase helper from src/game/store/storeEconomy.js.
- Coin-pack preload/render hooks and descendant decoration code.
- Current Store remains: material packs bought with earned in-game coins, rewards, and material recycler.
- Rewarded ads are a separate system and are not removed by this decision.

## Material cards
The active material-card renderer is in MenuDuelModeScene.js, which overrides the inherited Store renderer. On 2026-09-21 this was redesigned to show total units plus explicit material rows (asset, material name, quantity), with dense packs using two columns. Earlier edits to the inherited renderer alone did not change the visible cards because this descendant owns the final material rendering.

## Horizontal scrolling / clipping
The Store content container already owns a Phaser geometry mask. Per-Text setCrop() was also being recalculated while dragging, producing text pop-in/loading artifacts and occasional side leakage on iOS/WebGL. DEV 1.1.96 makes the container geometry mask the clipping authority during movement; text visibility cleanup is deferred until motion settles so swiping stays visually continuous.

## Future reintroduction
When real-money coin purchases return, implement them as a fresh, review-ready IAP feature (Google Play Billing / RevenueCat as selected at that time), restore UI only together with the purchase provider and entitlement/delivery validation, and update Play Console declarations/testing. Do not revive the removed development simulator as production purchase logic.

## DEV 1.1.98 — root cause of lateral text overflow
The store scroll content contains nested card Containers. The viewport GeometryMask on the outer moving Container correctly clipped card Graphics/images, but Phaser Text inside nested Containers was not reliably inheriting that ancestor mask on the affected iOS/WebGL path. This is why screenshots showed card borders clipped at the viewport while their labels continued outside it. The fix is structural: the same viewport GeometryMask is propagated once, immediately after Store construction, to every nested renderable (including Text). Legacy per-Text crop/visibility code is retired. Do not reintroduce per-frame/per-drag text cropping.

## DEV 1.1.99 — abandon GeometryMask for store scrolling
1.1.98 proved that even explicitly propagating the same GeometryMask to nested Phaser Text does not clip those texts reliably on the affected iOS/WebGL renderer. The store viewport therefore no longer uses GeometryMask at all. It now uses a dedicated Phaser Camera viewport/scissor: the main camera ignores the moving store content, the store camera renders only that content, and the camera viewport provides the hard GPU scissor rectangle. This is a renderer-level clip and must be kept as the canonical architecture for store horizontal scrolling.
