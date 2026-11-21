import assert from 'node:assert/strict';
import {AI_ELO_PILOTS} from '../src/game/ai/craftraceAiEloLeague.js';
import {seedAiWeekendChampionship,submitAiWeekendRaceResult,
 aiWeekendStandings} from '../src/game/ai/craftraceAiWeekendChampionship.js';

const event=seedAiWeekendChampionship(AI_ELO_PILOTS,'weekend-demo');
assert.equal(event.seedSnapshot.length,16);
assert.equal(event.races.length,7);
assert.deepEqual(event.races.map(x=>x.stage),
 ['qualifying','qualifying','qualifying','qualifying','semifinal','semifinal','final']);
assert.deepEqual(event.races.map(x=>x.day),
 ['saturday','saturday','saturday','saturday','sunday','sunday','sunday']);
const all=event.races.slice(0,4).flatMap(x=>x.pilots);
assert.equal(new Set(all).size,16,'Each AI must play exactly one qualifying');
assert.deepEqual(event.races.slice(0,4).map(x=>x.seedRanks),
 [[1,8,9,16],[2,7,10,15],[3,6,11,14],[4,5,12,13]]);
assert.equal(event.stage,'qualifying');
assert.equal(aiWeekendStandings(event).completedRaces,0);
assert.throws(()=>submitAiWeekendRaceResult(event,'S-1',[]),/habilitada/);
assert.throws(()=>submitAiWeekendRaceResult(event,'Q-A',
 event.races[0].pilots.map(id=>({id,elapsedMs:45000}))),/Empate/);
assert.throws(()=>seedAiWeekendChampionship(AI_ELO_PILOTS.slice(0,15),'bad'),/16 IA/);
let state=event;
for(const [index,race] of event.races.slice(0,4).entries()){
 state=submitAiWeekendRaceResult(state,race.id,
  race.pilots.map((id,i)=>({id,elapsedMs:45000+i*1000+index})));
}
assert.equal(state.stage,'semifinals');
const semi=state.races.slice(4,6);
assert.equal(semi[0].pilots.length,4);
assert.equal(semi[1].pilots.length,4);
assert.equal(new Set([...semi[0].pilots,...semi[1].pilots]).size,8);
const q=state.races.slice(0,4);
assert.deepEqual(semi[0].pilots,[q[0].results[0].id,q[1].results[1].id,
 q[2].results[0].id,q[3].results[1].id]);
assert.deepEqual(semi[1].pilots,[q[1].results[0].id,q[0].results[1].id,
 q[3].results[0].id,q[2].results[1].id]);
assert.ok(semi.every(s=>s.pilots.every(id=>q.filter(r=>r.pilots.includes(id)).length===1)));
assert.throws(()=>submitAiWeekendRaceResult(state,'Q-A',q[0].results),/ya tiene/);
const snapshot=JSON.stringify(state.seedSnapshot);
for(const race of semi){
 state=submitAiWeekendRaceResult(state,race.id,
  race.pilots.map((id,i)=>({id,elapsedMs:55000+i*1200})));
}
assert.equal(state.stage,'final');
const f=state.races[6];
assert.equal(f.pilots.length,4);
assert.equal(new Set(f.pilots).size,4);
assert.ok(f.pilots.every(id=>semi.some(r=>r.pilots.includes(id))));
state=submitAiWeekendRaceResult(state,'F',
 f.pilots.map((id,i)=>({id,elapsedMs:64000+i*1000})));
assert.equal(state.stage,'finished');
assert.equal(state.championId,f.pilots[0]);
assert.equal(aiWeekendStandings(state).completedRaces,7);
assert.deepEqual(aiWeekendStandings(state).remainingRaces,[]);
assert.equal(JSON.stringify(state.seedSnapshot),snapshot);
assert.equal(event.championId,null);
assert.equal(state.homologated,false,
 'Local results cannot trigger official rating changes');
assert.throws(()=>submitAiWeekendRaceResult(state,'F',f.results),/ya tiene/);
console.log('PASS weekend 16 AI -> 4 x 4 -> 2 x 4 -> 1 x 4, seed isolation and seven-race progression');
