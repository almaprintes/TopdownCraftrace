# Store premium cards + inertia — direct renderer fix

Date: 2026-08-25
Branch: `main`

## Context
The first attempt at visually decorating Store material-pack cards (`248d70c57a6801a488dad94f1491ea20d7268216`) deployed successfully but produced no visible change on iPhone. The reason was architectural: it called the inherited card renderer first and then tried to discover/decorate the newly-created card indirectly from the parent container. That lookup was not reliably addressing the rendered material card.

## Fix
Commit:
`e69b4685698c82b196a7c7f01787503d546a939e` — `Render premium store pack cards directly`

The active runtime descendant now overrides `_storeCard()` and directly owns rendering for `type === 'mat'` instead of decorating an inherited card after creation. Other Store card types still delegate to the inherited renderer.

### Material-pack visual design
- Full premium card frame drawn directly in Phaser.
- Large hero area occupying roughly the upper half of the card.
- Collage made only from official material textures already preloaded by the Store; no generated replacement images.
- Up to four representative assets with different scale, position and rotation.
- Strong pack title and short ES/EN live copy.
- Small exact-content line below the hero area using the real quantities from the pack data.
- Existing purchase flow, price and material quantities remain unchanged.

### Store inertia
The inertia hook was also made more explicit: it identifies the masked horizontal content container and the Store drag hit area, samples recent drag velocity and applies a short clamped `Cubic.easeOut` tween after release. A new drag cancels any active inertia tween.

## Narrower card pass
Commit:
`2a7665a1234aae6fc13c0fb373df10dc8698eb24` — `Narrow store cards`

After the direct premium material-card design was confirmed visually by the user, all Store cards were made narrower to fit more naturally in the horizontal carousel:
- material-pack width calculation reduced substantially while still allowing wider mixed packs;
- coin and reward cards reduced from the previous ~294 px maximum to a responsive 220–250 px range;
- card gap reduced from 18 px to 16 px;
- section separation reduced from 70 px to 56 px.

The new premium renderer remains unchanged; this pass only changes carousel density/width. No product contents, prices, rewards or economy behavior were changed.

## Store polish + direct ES/EN copy
Commit:
`b65e93a6f6aac817157762966513610a50f492e1` — `Polish store cards and localize store copy`

Following the iPhone review:
- `PACK TECNOLOGÍA / TECH PACK` is about 12% narrower than the other three-item material packs;
- coin cards now use a premium hero treatment with the official coin artwork, accent wedge, compact badge, large coin amount and cleaner pricing/action hierarchy;
- rewarded-video and daily-gift cards now use the same premium visual language, with larger official assets and clearer reward amounts/actions;
- Store header, tabs, section titles, section descriptions, reward names, action labels, availability messages and coin terminology now resolve directly in ES/EN inside `MenuStoreScene.js` rather than relying on the legacy runtime bridge;
- numeric formatting follows the active language locale.

No new image assets were generated and no Store economy values or reward quantities were changed.

## Safety
No economy values, pack contents, reward amounts, car physics, controls, race logic or persistence were intentionally changed.

## Validation
The premium material-card redesign and the narrower-card direction were confirmed positively by the user on iPhone. The latest technology-width adjustment, coin/reward visual polish and direct Store ES/EN copy have not yet been confirmed on iPhone; do not state that those latest changes are final until the user confirms them.
