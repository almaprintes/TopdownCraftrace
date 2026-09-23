import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [activity,plugin,policy,application,gradle,manifest,installer,instrumentation]=await Promise.all([
  read('android/app/src/main/java/com/craftracestudio/topdownrace/MainActivity.java'),
  read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrRewardedAdsPlugin.kt'),
  read('android/app/src/main/java/com/craftracestudio/topdownrace/RewardedRequestPolicy.kt'),
  read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrApplication.kt'),
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
assert.match(application,/Purchases\.configure/);
assert.match(manifest,/com\.google\.android\.gms\.ads\.APPLICATION_ID/);
assert.match(gradle,/minifyEnabled true/);
assert.match(gradle,/versionCode 5/);
assert.match(gradle,/versionName "1\.1\.175"/);
assert.match(gradle,/Production Android build requires TDR_ADMOB_APP_ID/);
assert.match(installer,/Object\.defineProperty\(window,'__tdrRewardedAds'/);
assert.match(installer,/show\(options=\{\}\)/);
assert.match(instrumentation,/typeof window\.__tdrRewardedAds/);
assert.match(instrumentation,/native_rewarded_not_configured/);
assert.doesNotMatch(`${activity}\n${plugin}`,/addJavascriptInterface|evaluateJavascript/,'rewarded bridge must use Capacitor lifecycle registration, not late WebView injection');

console.log('android rewarded bridge smoke: verified');
