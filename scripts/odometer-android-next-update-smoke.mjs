import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatOdometerKm,ODOMETER_STEP_METERS} from '../src/game/stats/odometerFormat.js';
import {addCarDistance,carMileageKm,loadPlayerStatsPersisted,PLAYER_STATS_KEY} from '../src/game/stats/playerStats.js';

assert.equal(ODOMETER_STEP_METERS,10);
assert.equal(formatOdometerKm(9.99),'0,00','Less than 10m must not tick');
assert.equal(formatOdometerKm(10),'0,01');
assert.equal(formatOdometerKm(19.99),'0,01');
assert.equal(formatOdometerKm(20),'0,02');
assert.equal(formatOdometerKm(128470),'128,47');
assert.equal(formatOdometerKm(128470,'en'),'128.47');
assert.equal(formatOdometerKm(0),'0,00');
assert.equal(formatOdometerKm(-33),'0,00');
const map=new Map();
globalThis.localStorage={
 getItem:k=>map.get(k)??null,
 setItem:(k,v)=>map.set(k,v),
 removeItem:k=>map.delete(k)
};
addCarDistance('juanicar',104.35,'karting-americas');
addCarDistance('gripline',30.70,'karting-tenerife');
assert.equal(formatOdometerKm(loadPlayerStatsPersisted().cars.juanicar.meters),'0,10');
assert.equal(formatOdometerKm(loadPlayerStatsPersisted().cars.gripline.meters),'0,03');
addCarDistance('juanicar',5.65,'karting-americas');
assert.equal(formatOdometerKm(carMileageKm('juanicar')*1000),'0,11');
assert.equal(formatOdometerKm(loadPlayerStatsPersisted().cars.gripline.meters),'0,03',
 'Switching cars must never bleed into another odometer');
assert.equal(loadPlayerStatsPersisted().cars.juanicar.tracks['karting-americas'].meters,110);
assert.ok(map.has(PLAYER_STATS_KEY),'Persist existing Statistics key');
assert.ok(readFileSync('src/game/social/cloudProgress.js','utf8').includes("'tdr2:playerStats:v1'"),'Existing mileage remains in cloud backups');

const hud=readFileSync('src/game/ui/raceInstrumentHud.js','utf8');
assert.ok(hud.includes('data-odometer'),'Digital readout under car name');
assert.ok(hud.indexOf('tdr-race-car-model')<hud.indexOf('tdr-race-odometer'),'Odometer below car title');
assert.ok(hud.includes('loadPlayerStatsPersisted().cars?.[id]?.meters'),'Use actual Statistics odometer');
assert.ok(hud.includes('scene?._mileagePendingMeters'),'Include in-progress unflushed race metres');
assert.ok(hud.includes('pending+0.00001<(scene._hudOdometerPending||0)'),'Refresh after 12s flush');
const stats=readFileSync('src/game/scenes/StatsScene.js','utf8');
assert.ok(stats.includes('const fmtKm=(meters,lang)=>formatOdometerKm(meters,lang)'));
const native=readFileSync('src/game/monetization/installNativeRewardedBridge.js','utf8');
assert.ok(native.includes("diagnostics(){return RewardedAdsPlugin.getStatus();}"));
assert.ok(!native.includes('mountRewardedDiagnosticPanel('),'AD LOG must not mount on Android');
assert.ok(!native.includes('mountAndroidPerformancePanel('),'PERF must not mount its own RAF loop');
const lift=readFileSync('src/game/ui/LobbyGarageLiftTransition.js','utf8');
assert.ok(lift.includes("Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'"),'Android native must enable elevator');
assert.ok(lift.includes('if(prod&&!nativeAndroid)return false;'),'Public browser unchanged');
console.log('DEV 1.2.220: odometer 10m ticks from persistent per-car Statistics + pending race distance; Android AD LOG/PERF removed; native Android elevator enabled: OK');
