import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const gradle = read('android/app/build.gradle');
const native = read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrRewardedAdsPlugin.kt');
const workflow = read('.github/workflows/android-revenuecat-qa-apk.yml');
const googleApp = 'ca-app-pub-3940256099942544~3347511713';
const googleRewarded = 'ca-app-pub-3940256099942544/5224354917';

function flavor(name) {
  const block = gradle.split(`        ${name} {`)[1]?.split('\n        }')[0];
  assert.ok(block, `Android flavor ${name} is missing`);
  return block;
}

const prod = flavor('production');
assert.match(prod, /ADMOB_APP_ID: admobAppId/);
assert.match(prod, /quoted\(rewardedAdUnitId\)/);
assert.match(prod, /quoted\(revenueCatPublicKey\)/);
assert.match(prod, /String.valueOf\(productionConfigured\)/);
assert.match(prod, /TDR_ADMOB_TEST_DEVICE_IDS', quoted\(''\)/,
  'Play production test-device behavior must not be silently changed');

for (const name of ['bridgeTest', 'deviceTest', 'cloudTest']) {
  const qa = flavor(name);
  assert.ok(qa.includes(googleApp), `${name} must use the Google demo app ID`);
  assert.ok(qa.includes(googleRewarded), `${name} must use the Google demo rewarded unit`);
  assert.match(qa, /TDR_REVENUECAT_PUBLIC_SDK_KEY', quoted\(''\)/,
    `${name} cannot use a RevenueCat production verification key`);
  assert.match(qa, /TDR_REWARDED_CONFIGURED', 'false'/,
    `${name} cannot advertise production ad readiness`);
  assert.doesNotMatch(qa, /admobAppId|rewardedAdUnitId|revenueCatPublicKey|productionConfigured/,
    `${name} must not inherit live ad credentials from CI environment`);
}

const device = flavor('deviceTest');
assert.match(device, /versionCode 1000336/);
assert.match(device, /applicationIdSuffix '\.rewardedtest'/);

const qaGate = native.indexOf('if (BuildConfig.FLAVOR != "production")');
const liveGate = native.indexOf('if (!BuildConfig.TDR_REWARDED_CONFIGURED)');
assert.ok(qaGate >= 0 && liveGate > qaGate,
  'QA sample-only guard must precede native live-ad flow');
assert.ok(native.includes('BuildConfig.TDR_REWARDED_AD_UNIT_ID != GOOGLE_DEMO_REWARDED_UNIT_ID'),
  'native bridge must fail closed if a QA build has a non-demo ad unit');
assert.ok(native.includes('resolveFailure(call, "qa_ad_config_unsafe")'));
assert.ok(native.includes(`GOOGLE_DEMO_REWARDED_UNIT_ID = "${googleRewarded}"`));
assert.ok(native.includes('showGoogleSampleAd(call, placement!!, claimId!!)'));
assert.ok(native.includes('google_sample_ad_no_revenuecat_verification'),
  'QA demo ads must not create verified rewards');

for (const envName of ['TDR_ADMOB_APP_ID', 'TDR_ADMOB_REWARDED_UNIT_ID', 'TDR_REVENUECAT_PUBLIC_SDK_KEY']) {
  assert.ok(!workflow.includes(`${envName}:`),
    `QA CI must not inject paid ad configuration: ${envName}`);
}
assert.match(workflow, /node scripts\/android-test-ads-safety-smoke\.mjs/,
  'CI must always run this regression guard before building QA');
assert.match(workflow, /ANUNCIOS-DE-PRUEBA\.apk/,
  'QA file should explicitly identify test inventory');

console.log('PASS: every non-production Android flavor uses Google demo IDs only; native runtime fails closed; Play IDs remain distinct.');
