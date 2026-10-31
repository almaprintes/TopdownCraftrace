// CI contract: sample-ad SDK reliability must never block DEV deployment.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=readFileSync('.github/workflows/pages.yml','utf8');
const diagnostic=readFileSync('.github/workflows/android-rewarded-emulator-diagnostic.yml','utf8');
assert.match(pages,/name: Android release build and native unit tests/);
assert.match(pages,/:app:testBridgeTestReleaseUnitTest :app:assembleBridgeTestRelease/);
assert.match(pages,/upload-artifact@v4/);
assert.match(pages,/needs: build/,'PWA deploy must require a green web build');
assert.doesNotMatch(pages,/run:\s*cd android && \.\/gradlew :app:connectedBridgeTestReleaseAndroidTest/,
 'A demo ad must not mark PWA main red when its emulator times out');
assert.match(diagnostic,/workflow_dispatch/);
assert.doesNotMatch(diagnostic,/^  push:/m,'Rewarded QA must be opt-in during ad suspension');
assert.match(diagnostic,/TDR_CI_BRIDGE_TEST: '1'/);
assert.match(diagnostic,/reactivecircus\/android-emulator-runner@v2/);
assert.match(diagnostic,/:app:connectedBridgeTestReleaseAndroidTest --stacktrace/);
assert.match(diagnostic,/if: always\(\)/,'Keep logs on failures');
assert.doesNotMatch(diagnostic,/continue-on-error:\s*true/,
 'Do not label an actual emulator failure successful');
assert.doesNotMatch(diagnostic,/ca-app-pub-\d+\/\d+/,'No paid AdMob IDs in emulator diagnostic');
assert.doesNotMatch(diagnostic,/TDR_REVENUECAT_(?:API|SECRET|PUBLIC)/,
 'No RevenueCat credentials used for sample-ad diagnostics');
console.log('PASS: PWA/Android native build remains mandatory, emulator rewarded tests are explicit manual QA');
console.log('PASS: manual ad bridge remains strict and can fail, preserving error reports');
