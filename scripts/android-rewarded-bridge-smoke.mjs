import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [activity,plugin,policy,application,consent,gradle,manifest,installer,instrumentation]=await Promise.all([
  read('android/app/src/main/java/com/craftracestudio/topdownrace/MainActivity.java'),
  read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrRewardedAdsPlugin.kt'),
  read('android/app/src/main/java/com/craftracestudio/topdownrace/RewardedRequestPolicy.kt'),
  read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrApplication.kt'),
  read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrAdsConsentManager.kt'),
  read('android/app/build.gradle'),
  read('android/app/src/main/AndroidManifest.xml'),
  read('src/game/monetization/installNativeRewardedBridge.js'),
  read('android/app/src/androidTest/java/com/craftracestudio/topdownrace/RewardedBridgeReleaseTest.kt')
]);

assert(activity.indexOf('registerPlugin(TdrRewardedAdsPlugin.class)')<activity.indexOf('super.onCreate(savedInstanceState)'), 'native plugin must be registered before Capacitor creates the WebView');
for(const placement of [
  'post_race_double_loot','race_control_publish_record','race_control_ghost_download',
  'recycler_exchange_2','recycler_exchange_3','store_coins_100_4h'
])assert.match(policy,new RegExp(`"${placement}"`));

assert.match(plugin,/loadAndTrackRewardedAd/);
assert.match(plugin,/enableRewardVerification\(\)/);
assert.match(plugin,/verification\.verifiedReward != null/);
assert.match(plugin,/result\.put\("completed", completed && verified\)/);
assert.match(plugin,/result\.put\("verified", verified\)/);
assert.match(plugin,/native_watchdog_timeout/);
assert.match(plugin,/bridge_status ready=true/);
assert.match(application,/Purchases\.configure/);
assert.doesNotMatch(application,/override fun onCreate/);
assert.doesNotMatch(activity,/TdrAdsConsentManager.*prepare/);
assert.doesNotMatch(application,/MobileAds\.initialize/);
assert.match(consent,/requestConsentInfoUpdate/);
assert.match(consent,/loadAndShowConsentFormIfRequired/);
assert.match(consent,/consentInformation\.canRequestAds\(\)/);
assert.match(consent,/MobileAds\.initialize/);
assert.match(consent,/setTestDeviceIds/);
assert(plugin.indexOf('consentManager().prepare(activity)')<plugin.indexOf('loadAndShow(attempt)'), 'UMP gate must run before the rewarded ad request');
assert.match(manifest,/com\.google\.android\.gms\.ads\.APPLICATION_ID/);
assert.match(gradle,/minifyEnabled true/);
assert.match(gradle,/versionCode 8/);
assert.match(gradle,/versionName "1\.1\.179"/);
assert.match(gradle,/Production Android build requires TDR_ADMOB_APP_ID/);
assert.match(gradle,/applicationIdSuffix '\.rewardedtest'/);
assert.match(gradle,/TDR_ADMOB_TEST_DEVICE_IDS/);
assert.match(gradle,/com\.revenuecat\.purchases:purchases:10\.19\.0/);
assert.match(gradle,/com\.revenuecat\.purchases:purchases-admob:10\.19\.0/);
assert.match(gradle,/com\.google\.android\.gms:play-services-ads:23\.6\.0/);
assert.match(gradle,/com\.google\.android\.ump:user-messaging-platform:3\.2\.0/);
assert.match(installer,/Object\.defineProperty\(window,'__tdrRewardedAds'/);
assert.match(installer,/show\(options=\{\}\)/);
assert.match(installer,/showPrivacyOptions/);
assert.match(instrumentation,/typeof window\.__tdrRewardedAds/);
assert.match(instrumentation,/native_rewarded_not_configured/);
assert.match(instrumentation,/scenario\.recreate\(\)/);
assert.match(instrumentation,/physicalDeviceCompletesAndVerifiesEveryPlacement/);
assert.match(instrumentation,/physicalDeviceLoadsWithoutShowingForRegistration/);
assert.match(instrumentation,/RewardedAd\.load/);
assert.match(instrumentation,/result\.contains\("\\\"completed\\\":true"\)/);
assert.match(instrumentation,/result\.contains\("\\\"verified\\\":true"\)/);
assert.doesNotMatch(`${activity}\n${plugin}`,/addJavascriptInterface|evaluateJavascript/,'rewarded bridge must use Capacitor lifecycle registration, not late WebView injection');

console.log('android rewarded bridge smoke: verified');
