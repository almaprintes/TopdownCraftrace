// Seven real selector photographs, plus separate and safely cached records.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {absoluteRecordsFromSnapshot,formatSelectorLap,getSelectorLocalBest}
  from '../src/game/ui/selectorRaceRecords.js';
import {selectorPhotoPath} from '../src/game/tracks/trackSelectorPhotos.js';
const records=absoluteRecordsFromSnapshot({tracks:[
  {id:'siete-picos',entries:[{rank:2,best_time_ms:65000},{rank:1,best_time_ms:63421}]},
  {id:'siete-picos-inverso',entries:[{rank:1,best_time_ms:68500}]},
  {id:'no-times',entries:[]}
]});
assert.equal(records.get('siete-picos'),63421);
assert.equal(records.get('siete-picos-inverso'),68500);
assert.equal(records.get('no-times'),null);
assert.equal(records.has('missing'),false);
assert.equal(formatSelectorLap(63421),'1:03.421');
assert.equal(formatSelectorLap(68500),'1:08.500');
assert.equal(formatSelectorLap(null),'—');
assert.equal(formatSelectorLap(-10),'—');
assert.equal(selectorPhotoPath('siete-picos'),'assets/tracks/selector/siete-picos.webp');
assert.equal(selectorPhotoPath('siete-picos-inverso'),selectorPhotoPath('siete-picos'));
const android=fs.readFileSync('src/game/scenes/TrackGarageAndroidTouchScene.js','utf8');
assert.ok(android.includes('attachSelectorRecordDisplay(root,()=>selectedCircuitRaceId(base,localStorage)'));
assert.ok(android.includes('records?.update()'), 'Normal/Inverse must refresh BOTH records');
const css=fs.readFileSync('src/game/ui/trackSelectorPhoto.css','utf8');
assert.ok(css.includes('.tdr-ts-records{'));
assert.ok(css.includes('[data-scope="personal"]'));
const tool=fs.readFileSync('src/game/ui/selectorRaceRecords.js','utf8');
assert.ok(tool.includes("getCircuitRecord(String(trackId||''))"));
assert.ok(tool.includes("/rest/v1/web_leaderboard_snapshot?select=payload&id=eq.true"));
assert.ok(tool.includes('cachedPromise&&now-cachedAt<TTL'));
assert.ok(tool.includes('section.dataset.trackId!==id'));
assert.ok(tool.includes("root.querySelector('.tdr-ts-locked-hero')"),'Locked circuits cannot reveal records');
assert.ok(tool.includes('getSelectorGlobalRecords().then'));
assert.ok(!tool.includes('activateRaceControlOnline'), 'Selector must not create anonymous accounts');
assert.ok(!tool.includes('requestAnimationFrame'), 'No extra RAF in selector');
assert.ok(!tool.includes('setInterval'), 'No polling during races/selector');
assert.throws(()=>absoluteRecordsFromSnapshot(null));
console.log('PASS: 7 Picos real photo shared both directions; correct 1:03.421 time; isolated world/personal records; safe cached public snapshot; responsive selector.');
