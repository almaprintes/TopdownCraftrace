# DEV 1.1.176 — rewarded Android release bridge and consent gate

## Incident

The Google Play BETA 1.1.173 (`versionCode 4`) showed the post-race loot screen but did not render the rewarded x2 action. The web client intentionally exposes rewarded actions only when `window.__tdrRewardedAds.show` is a function.

The Android wrapper used to build that AAB was not present in `main`, `beta-1.0`, any repository ref, this workspace, or the accessible project files. Consequently the released native inputs were not reproducible or auditable from the source revision that labeled the beta. The original AAB was also unavailable, so this investigation cannot make a binary claim about precisely which native classes versionCode 4 contained. This missing source/build provenance is the demonstrated defect; the most specific runtime observation remains that the installed WebView did not expose the required global.

## Source-controlled replacement

DEV 1.1.176 versions the complete Capacitor Android wrapper. `MainActivity` registers `TdrRewardedAdsPlugin` before `super.onCreate`, so Capacitor knows the plugin before creating/loading the WebView. `src/main.js` awaits `installNativeRewardedBridge()` before constructing the first Phaser scene. The installer calls the native `getStatus` method and defines `window.__tdrRewardedAds` only after the native plugin answers. Every Activity/WebView recreation repeats both registration and installation.

`TdrAdsConsentManager` now owns Google UMP and Mobile Ads startup. The bridge remains available while consent is being resolved, but the native `show` route waits for UMP and cannot load an ad unless `canRequestAds()` is true and Mobile Ads initialization has completed. The in-game privacy action calls the native UMP privacy options form.

The native `show({ placement, claimId })` implementation:

- accepts only the six known placements and their claim-id forms;
- allows a single in-flight attempt and fails closed on lifecycle destruction, timeouts, load/show errors, dismissal before verification, or SSV failure;
- loads through RevenueCat's AdMob tracker, enables reward verification, and returns `completed=true` and `verified=true` only when RevenueCat supplies a non-null verified reward;
- logs only an attempt prefix, placement and a truncated SHA-256 claim hash, never app IDs, ad-unit IDs, RevenueCat keys or raw claim IDs.

Release builds enable R8/resource shrinking and include explicit Capacitor-plugin keep rules. Production public configuration is supplied through Gradle properties or environment variables. A production release task aborts if the AdMob app ID, rewarded unit ID, or RevenueCat public SDK key is absent/invalid, preventing another silently unconfigured AAB.

## Release-specific proof boundary

CI builds the production web payload, syncs it into Capacitor, compiles a minified `bridgeTestRelease`, launches that release variant in an Android emulator, and evaluates inside its real WebView:

```js
typeof window.__tdrRewardedAds === 'object'
typeof window.__tdrRewardedAds.show === 'function'
```

It then invokes a valid placement/claim pair and requires a native round trip returning `source=native`, `completed=false`, `verified=false`, and `reason=native_rewarded_not_configured`. This flavor deliberately uses Google's published test AdMob identifiers and has no RevenueCat key: it proves release WebView registration/injection/R8 survival and JS-to-native-to-JS dispatch without fabricating SSV or granting a reward.

The test does **not** prove a real production ad impression or SSV. Those require the missing production public configuration plus a physical/test device and live AdMob/RevenueCat services. None of the six placements has therefore been certified end to end by this repository-only run, and none has obtained real SSV verification.

## Publication boundary

Do not promote DEV 1.1.176 or upload an AAB based only on the bridge test. Before a Play upload, provide the three production public values, build the signed `productionRelease`, install it on a registered test device, confirm the bridge diagnostics, and exercise every placement through a real completed ad and RevenueCat verification. Preserve the existing web claim idempotency checks.
