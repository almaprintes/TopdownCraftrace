import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CUPER_EVENT_DEFS,CUPER_MILEAGE_GATE_METERS,CUPER_STATE_KEY} from '../src/game/seasons/cuperCampaign.js';
const file=p=>readFileSync(p,'utf8');
assert.equal(CUPER_MILEAGE_GATE_METERS,500000,'Gripline drives 500km total, not post-season delta');
assert.equal(CUPER_STATE_KEY,'tdr2:seasonCuper:v1','induction store remains independent');
assert.equal(CUPER_EVENT_DEFS.length,14,'exactly fourteen missions');
assert.equal(new Set(CUPER_EVENT_DEFS.map(x=>x.id)).size,14);
assert.equal(CUPER_EVENT_DEFS[1].reward.car.id,'crown_cuper','Cuper Original at mission 2');
assert.equal(CUPER_EVENT_DEFS[13].reward.skin.skinId,'gold','Cuper Gold at mission 14');
assert.equal(CUPER_EVENT_DEFS[13].reward.skin.carId,'crown_cuper','Gold is NOT another car');
assert.equal(CUPER_EVENT_DEFS[9].objective.type,'recyclerOperations','recycler tutorial');
assert.equal(CUPER_EVENT_DEFS[11].objective.type,'onlinePublishedCuper','no local PB fallback');
assert.match(CUPER_EVENT_DEFS[11].help.es,/PUBLICAR/);
assert.match(CUPER_EVENT_DEFS[11].help.es,/anuncio/i);
for(const def of CUPER_EVENT_DEFS){
 assert.ok(def.title.es&&def.title.en&&def.help.es&&def.help.en,'localized description & help');
 assert.ok(def.reward.coins||def.reward.items||def.reward.car||def.reward.skin,'real single reward');
}
const events=file('src/game/events/raceEvents.js');
assert.ok(events.includes("carMileageKm('avenir_gripline')*1000"),'use existing REAL odometer');
assert.match(events,/mileageMeters<CUPER_MILEAGE_GATE_METERS/,'gate exactly at 500km');
assert.ok(events.includes('cuperTrackMeters:deltaMap(now.cuperTrackMeters,base.cuperTrackMeters)'), 'track variety from Cuper-only telemetry');
assert.ok(events.includes('onlinePublishedCuper')&&events.includes('recyclerOperations'),'mission telemetry');
assert.ok(events.includes('grantSeasonSkin(event.reward.skin.carId,event.reward.skin.skinId)'), 'Gold reward independent');
const online=file('src/game/online/raceControlOnline.js');
assert.ok(online.includes("record?.record_ref&&String(carId||'')==='crown_cuper'"),'server ACK and Cuper identity required');
const recycler=file('src/game/store/materialExchange.js'),parts=file('src/game/store/partDismantle.js');
assert.ok(recycler.includes('saveGarage(s);\n  recordRecyclerOperation()'));
assert.ok(parts.includes('saveGarage(s);recordRecyclerOperation();'));
const skin=file('src/game/skins/carSkins.js');
assert.ok(skin.includes('seasonSkinUnlocks().includes'), 'Gold cannot be equipped before unlock');
const ui=file('src/game/scenes/SeasonScene.js');
assert.ok(ui.includes('data.gated')&&ui.includes('CUPER_SEASON'), 'Cuper road and 500km gate');
assert.ok(ui.includes('s-help-overlay'), 'each stage has how-to help');
assert.ok(file('src/game/social/cloudProgress.js').includes('tdr2:seasonSkinUnlocks:v1'));
for(const path of ['src/game/events/raceEvents.js','src/game/scenes/SeasonScene.js','src/game/ui/LobbyDomUi.js',
'src/game/online/raceControlOnline.js','src/game/seasons/cuperCampaign.js','src/game/skins/carSkins.js']){
 execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
}
console.log('CROWN CUPER: 14 stages, 500km gate, salvage & server-only online, skins, help, cloud save OK');
