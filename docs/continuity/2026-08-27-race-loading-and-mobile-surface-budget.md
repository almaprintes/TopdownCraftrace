# Race loading screen + mobile surface memory guard — 2026-08-27

## Context
During the CIRCUITO ATLÁNTICO Poly Haven material pilot, iPhone showed a long blank/navy interval before RaceScene became visible, followed by an unexpected WebKit reload shortly after the race began.

The runtime crash detector classified the event as `unexpected_reload`, not a JavaScript exception. The strongest technical suspect was GPU memory pressure from the initial Ultra implementation loading multiple 4K diffuse + 4K normal maps simultaneously. A single decompressed RGBA 4K texture is roughly 64 MB before considering the rest of the scene.

## Changes

### Race loading screen
`src/game/scenes/RaceRealSurfaceAssetsScene.js`

- Builds a visible loading screen during RaceScene preload.
- Uses the cached track centerline (track01 already loaded by BootScene) to draw a recognizable circuit silhouette.
- Shows the public name `CIRCUITO ATLÁNTICO` for track01.
- Displays the real Phaser loader progress percentage and a real progress bar.
- Keeps the screen alive through resource loading and removes it only after race creation finishes.

### Mobile-safe material budgets
`src/game/scenes/RaceRealSurfaceAssetsScene.js`

- PERFORMANCE: procedural/light fallback, no heavy material maps.
- MEDIUM: 1K diffuse + 1K normals.
- HIGH: 2K diffuse; normals are capped to 1K on mobile and remain 2K on desktop.
- ULTRA desktop: up to 4K diffuse + 4K normals.
- ULTRA mobile: 2K diffuse + 1K normals. Ultra still keeps the expensive visual effects/preset behavior, but no longer risks allocating multiple 4K normal maps in mobile WebKit.

The cap is intentional: from the top-down camera, 4K normal maps have very poor visual return relative to their decompressed GPU-memory cost.

### Settings UI
`src/game/scenes/SettingsGraphicsQualityScene.js`

- The player now sees only the four automatic presets: Rendimiento / Medio / Alta calidad / Ultra.
- Technical internals (AA, explicit texture resolution, lighting switches, etc.) are no longer shown as if the player had to interpret them.
- Ultra is described as device-adaptive maximum quality instead of promising literal 4K on every device.
- Performance HUD remains separate because it is diagnostic, not a quality choice.

## Commits
- `07a9a1815cdfc23c8d599a5917cfd069d3aeba3d` — race loading screen + mobile-safe surface budgets
- `a86c18cb6d3bc1e3730037f5acdfd264d21f2c01` — simplify preset UI and describe adaptive Ultra

## Next validation
Retest CIRCUITO ATLÁNTICO on iPhone with HIGH first, then ULTRA. Validate:
1. loading screen appears immediately instead of navy blank screen;
2. percentage moves while Poly Haven maps load;
3. race survives several laps without WebKit process restart;
4. FPS and thermal behavior remain acceptable;
5. compare visual difference HIGH vs ULTRA before increasing any mobile texture budget again.
