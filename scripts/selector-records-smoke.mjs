// Seven real selector photographs, plus separate and safely cached records.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {absoluteRecordsFromSnapshot,formatSelectorLap,formatSelectorGap,getSelectorLocalBest}
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
// Real captured case: personal 0:27.096 vs published 0:29.388 = -2.292 s.
assert.deepEqual(formatSelectorGap(27096,29388),{text:'−2.292 s',tone:'ahead'});
assert.deepEqual(formatSelectorGap(31096,29388),{text:'+1.708 s',tone:'behind'});
assert.deepEqual(formatSelectorGap(29388,29388),{text:'0.000 s',tone:'equal'});
assert.deepEqual(formatSelectorGap(29387,29388),{text:'−0.001 s',tone:'ahead'});
assert.deepEqual(formatSelectorGap(29389,29388),{text:'+0.001 s',tone:'behind'});
assert.deepEqual(formatSelectorGap(null,29388),{text:'—',tone:'unavailable'});
assert.deepEqual(formatSelectorGap(27096,null),{text:'—',tone:'unavailable'});
assert.deepEqual(formatSelectorGap(27096,NaN),{text:'—',tone:'unavailable'});
assert.equal(selectorPhotoPath('siete-picos'),'assets/tracks/selector/siete-picos.webp');
assert.equal(selectorPhotoPath('siete-picos-inverso'),selectorPhotoPath('siete-picos'));
const android=fs.readFileSync('src/game/scenes/TrackGarageAndroidTouchScene.js','utf8');
assert.ok(android.includes('attachSelectorRecordDisplay(root,()=>selectedCircuitRaceId(base,localStorage)'));
assert.ok(android.includes('records?.update()'), 'Normal/Inverse must refresh BOTH records');
const css=fs.readFileSync('src/game/ui/trackSelectorPhoto.css','utf8');
assert.ok(css.includes('.tdr-ts-records{'));
assert.ok(css.includes('[data-scope="personal"]'));
assert.ok(css.includes('[data-scope="difference"]'));
assert.ok(css.includes('[data-tone="ahead"]'));
assert.ok(css.includes('[data-tone="behind"]'));
const tool=fs.readFileSync('src/game/ui/selectorRaceRecords.js','utf8');
assert.ok(tool.includes("getCircuitRecord(String(trackId||''))"));
assert.ok(tool.includes("/rest/v1/web_leaderboard_snapshot?select=payload&id=eq.true"));
assert.ok(tool.includes('cachedPromise&&now-cachedAt<TTL'));
assert.ok(tool.includes('section.dataset.trackId!==id'));
assert.ok(tool.includes("root.querySelector('.tdr-ts-locked-hero')"),'Locked circuits cannot reveal records');
assert.ok(tool.includes('getSelectorGlobalRecords().then'));
assert.ok(tool.includes("labels[2].textContent=english?'DIFFERENCE':'DIFERENCIA'"));
assert.ok(tool.includes('setDifference(own,hasBoard?value:null)'));
assert.ok(tool.includes('setDifference(null,null)'));
assert.ok(tool.includes("difference.dataset.tone=gap.tone"));
assert.ok(!tool.includes('activateRaceControlOnline'), 'Selector must not create anonymous accounts');
assert.ok(!tool.includes('requestAnimationFrame'), 'No extra RAF in selector');
assert.ok(!tool.includes('setInterval'), 'No polling during races/selector');
assert.throws(()=>absoluteRecordsFromSnapshot(null));
console.log('PASS: photo + isolated world/personal records and 3rd-row signed difference; −2.292 s faster, +1.708 s slower; no fabricated differences or extra requests.');
