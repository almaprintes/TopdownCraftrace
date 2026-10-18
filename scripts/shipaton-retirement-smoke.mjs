// DEV 1.2.269: no contest UI, access code, entitlement or bypass survives.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
assert.equal(existsSync('src/game/shipaton/ShipatonJudgeMode.js'),false,'retired runtime module must be removed');
const main=read('src/main.js'),car=read('src/game/cars/carUnlocks.js'),
  tracks=read('src/game/tracks/trackUnlocks.js'),
  selector=read('src/game/scenes/TrackGaragePlayerLightScene.js'),
  garage=read('src/game/garage/garageStore.js'),
  online=read('src/game/online/raceControlOnline.js'),
  settings=read('src/game/scenes/SettingsDomScene.js'),
  locale=read('src/game/i18n/playerUiExtra.js');
assert.match(main,/localStorage\.removeItem\('tdr2:shipatonJudgeMode:v2'\)/);
for(const [name,source] of Object.entries({car,tracks,selector,garage,online,settings,locale}))
  assert.doesNotMatch(source,/ShipatonJudgeMode|shipaton|ship-a-ton|evaluationAccessEnabled|judgeVisibleKey|JUDGE_GARAGE|judgeGarage/i,name+' contains an obsolete contest hook');
assert.match(car,/isCarUnlocked\(carId\)\{return loadCarUnlocks\(\)\.unlocked\.includes/);
assert.match(tracks,/PUBLISHED_TRACK_IDS\.includes\(id\)&&loadTrackUnlocks\(\)\.unlocked\.includes\(id\)/);
assert.match(selector,/function selectableKey\(key\)\{return key!=='karting-canarias-narrow70'&&isPublishedTrackId\(key\);\}/);
assert.match(garage,/export function loadGarage\(\)\{return loadStoredGarage\(\);\}/);
assert.match(garage,/export function saveGarage\(s\)\{localStorage\.setItem\(KEY,JSON\.stringify\(s\)\)/);
assert.doesNotMatch(settings,/data-shipaton-judge/);
assert.match(settings,/data-tab="legal"/);
assert.doesNotMatch(online,/get_my_shipaton_judge_access|activate_shipaton_judge_access/i);
const migration=read('supabase/migrations/20261018_016_retire_shipaton_judge_access.sql');
for(const object of ['public.activate_shipaton_judge_access','public.get_my_shipaton_judge_access','private.shipaton_judge_entitlements','private.shipaton_judge_codes'])
 assert.ok(migration.includes(object),object+' not retired');
assert.doesNotMatch(migration,/drop (?:table|function).*?(?:profiles|track_records|player_progress|wallets)/i);
console.log('Ship-a-ton retired: no UI, judge privileges, false garage economy, client RPC or contest locale.');
