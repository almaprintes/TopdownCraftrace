// 7 Picos inverse: independent lap/ranking identity over exact physical world.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeInvertedClosedTrack,circuitVariantFor,circuitVariantParent,
  selectedCircuitRaceId,physicalCircuitId,isCircuitAlternate}
  from '../src/game/tracks/trackReverseVariant.js';
const ID='siete-picos',INVERSE='siete-picos-inverso';
const path='src/game/tracks/library/siete-picos/track.json';
const authored=JSON.parse(fs.readFileSync(path,'utf8'));
assert.equal(circuitVariantFor(ID).alternate,INVERSE);
assert.equal(circuitVariantParent(INVERSE),ID);
assert.equal(physicalCircuitId(INVERSE),ID);
assert.equal(isCircuitAlternate(INVERSE),true);
const storage={getItem:(key)=>key==='tdr2:siete-picos:direction:v1'?'inverse':null};
assert.equal(selectedCircuitRaceId(ID,storage),INVERSE);
assert.equal(selectedCircuitRaceId(ID,{getItem:()=>null}),ID);
assert.equal(authored.meta.hiddenFromTrackSelect,false);
const base={...authored,id:ID,key:ID,
 raceCenterline:authored.centerline,
 finishLine:authored.finishLine,checkpoints:authored.checkpoints};
const reverse=makeInvertedClosedTrack(base,INVERSE);
assert.equal(reverse.id,INVERSE);
assert.equal(reverse.key,INVERSE);
assert.equal(reverse.name,'7 PICOS INVERSO');
assert.equal(reverse.meta.reverseOf,ID);
assert.equal(reverse.meta.trackId,INVERSE);
assert.equal(reverse.meta.imageNative,base.meta.imageNative);
assert.equal(reverse.trackShape,base.trackShape);
assert.equal(reverse.worldW,4344);
assert.equal(reverse.worldH,3258);
assert.equal(reverse.raceCenterline.length,base.raceCenterline.length);
assert.deepEqual(reverse.raceCenterline[0],base.raceCenterline.at(-1));
assert.deepEqual(reverse.raceCenterline.at(-1),base.raceCenterline[0]);
assert.equal(reverse.checkpoints.length,2);
for(let i=0;i<2;i++){
 const a=base.checkpoints[1-i],b=reverse.checkpoints[i];
 assert.deepEqual(b.a,a.a);
 assert.deepEqual(b.b,a.b);
 assert.equal(b.normal.x,-a.normal.x);
 assert.equal(b.normal.y,-a.normal.y);
}
assert.deepEqual(reverse.finishLine.a,base.finishLine.a);
assert.deepEqual(reverse.finishLine.b,base.finishLine.b);
assert.equal(reverse.finishLine.normal.x,-base.finishLine.normal.x);
assert.equal(reverse.finishLine.normal.y,-base.finishLine.normal.y);
assert.equal(reverse.startLine,null);
assert.equal(reverse.grid,null);
assert.ok([reverse.start.x,reverse.start.y,reverse.start.r].every(Number.isFinite));
assert.ok(Math.abs(reverse.start.r-base.start.r)>0.3);
const env=JSON.parse(fs.readFileSync('src/game/tracks/library/siete-picos/siete-picos.environment.json','utf8'));
assert.deepEqual(env.collisionLines.map(l=>l.nodes.length),[45,42]);
const registry=fs.readFileSync('src/game/tracks/environmentRegistry.js','utf8');
assert.ok(registry.includes('physicalCircuitId(id)'));
const publicIds=fs.readFileSync('src/game/tracks/trackUnlocks.js','utf8');
assert.ok(publicIds.includes("'siete-picos','siete-picos-inverso'"));
assert.ok(!publicIds.includes('DEV_SEVEN_PEAKS_ID'));
const rankings=fs.readFileSync('src/game/stats/playableStatisticsTracks.js','utf8');
assert.ok(rankings.includes('publishedIds'));
const ui=fs.readFileSync('src/game/scenes/StatsBroadcastScene.js','utf8');
assert.ok(ui.includes('const playable=this._playableTracks()'));
assert.ok(ui.includes('getRaceControlSnapshot(selected.trackId)'));
assert.ok(ui.includes('submitRaceControlRecordWithGhost'));
const sql=fs.readFileSync('supabase/migrations/20261025_019_siete_picos_rankings.sql','utf8');
assert.ok(sql.includes("('siete-picos'),('siete-picos-inverso')"));
assert.ok(sql.includes('union select distinct track_id from public.track_records'));
assert.ok(sql.includes('select tdr_web_private.refresh_leaderboards();'));
console.log('PASS: 7 Picos Inverso reverse geometry, shared environment/photo, separate PB/online IDs, both ranking tabs and public guest boards.');
