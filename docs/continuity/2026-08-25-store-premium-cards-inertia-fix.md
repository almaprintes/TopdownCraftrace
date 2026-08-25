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

## Safety
No economy values, pack contents, reward amounts, car physics, controls, race logic or persistence were intentionally changed.

## Validation
This direct-renderer version has not yet been confirmed on iPhone. Do not state that the visual redesign or inertia works correctly on iPhone until the user confirms it.
