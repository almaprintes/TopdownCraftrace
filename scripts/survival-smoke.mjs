import assert from 'node:assert/strict';
import { buildSurvivalRoster, getOfficialSurvivalCars } from '../src/game/modes/survival/survivalRoster.js';
import { buildSurvivalGrid } from '../src/game/modes/survival/survivalGrid.js';
import {
  createSurvivalRaceState,
  getSurvivalStandings,
  recordSurvivalFinishCross,
  resolveSurvivalRound,
  updateSurvivalProgress
} from '../src/game/modes/survival/survivalRaceState.js';

const official=getOfficialSurvivalCars();
assert.ok(official.length>=6,'Survival needs at least six official cars');

for(const player of official){
  const roster=buildSurvivalRoster(player.id,5);
  assert.equal(roster.length,6,`${player.id}: roster must contain six racers`);
  assert.equal(new Set(roster.map(r=>r.carId)).size,6,`${player.id}: every racer must use a different car`);
  assert.equal(roster.filter(r=>r.type==='player').length,1,`${player.id}: exactly one player`);

  for(let i=1;i<roster.length;i++){
    assert.ok(roster[i].carScore>=roster[i-1].carScore,`${player.id}: grid must be slowest to fastest`);
  }

  const cpu=roster.filter(r=>r.type==='cpu').sort((a,b)=>a.targetPace-b.targetPace);
  assert.equal(cpu.length,5,`${player.id}: five CPU rivals required`);
  for(let i=1;i<cpu.length;i++){
    assert.ok(cpu[i].targetPace>cpu[i-1].targetPace,`${player.id}: CPU pace must strictly increase`);
  }
  assert.ok(cpu.at(-1).targetPace<=1.0300001,`${player.id}: fastest CPU must stay within beatable +3% cap`);
  assert.ok(cpu[0].targetPace>=0.899999,`${player.id}: slowest CPU pace floor`);
}

const centerline=[
  {x:100,y:100},{x:260,y:100},{x:360,y:180},{x:360,y:340},
  {x:250,y:430},{x:90,y:400},{x:20,y:270},{x:35,y:155}
];
const roster=buildSurvivalRoster(official[0].id,5);
const spacing=60;
const grid=buildSurvivalGrid({centerline,roster,startPoint:{x:100,y:100},frontOffset:20,spacing});
assert.equal(grid.length,6,'Grid must contain six slots');
for(const slot of grid){
  assert.ok(Number.isFinite(slot.x)&&Number.isFinite(slot.y)&&Number.isFinite(slot.rotation),'Every grid pose must be finite');
}
for(let i=1;i<grid.length;i++){
  const delta=Math.abs(grid[i].gridDistance-grid[i-1].gridDistance);
  assert.ok(Math.abs(delta-spacing)<1e-6,'Grid slots must be stretched by fixed centerline arc distance');
}
assert.deepEqual(grid.map(x=>x.carId),roster.map(x=>x.carId),'Grid must preserve slowest-to-fastest roster order');

const raceEntries=()=>Array.from({length:6},(_,index)=>({
  id:index===0?'TÚ':`CPU ${index}`,player:index===0,gridIndex:index,raceDistance:-index*.1
}));
const armAll=(state,at=1000)=>{
  for(const racer of getSurvivalStandings(state)){
    const arm=recordSurvivalFinishCross(state,racer.id,{distanceSinceFinish:1,now:at});
    assert.equal(arm.accepted,false,`${racer.id}: first line pass only arms the lap gate`);
    assert.equal(arm.armed,true,`${racer.id}: first line pass must arm`);
  }
};

{
  const state=createSurvivalRaceState(raceEntries());
  armAll(state);
  const ids=['TÚ','CPU 1','CPU 2','CPU 3','CPU 4'];
  for(const id of ids){
    assert.equal(recordSurvivalFinishCross(state,id,{distanceSinceFinish:1,now:3000}).accepted,true,`${id}: lap 1 credit`);
  }
  const duplicate=recordSurvivalFinishCross(state,'CPU 1',{distanceSinceFinish:1,now:3100});
  assert.equal(duplicate.accepted,false,'A second crossing in the same elimination lap must not add another lap');
  assert.equal(duplicate.reason,'already-credited','Duplicate crossing must be rejected by round credit');

  updateSurvivalProgress(state,[
    {id:'TÚ',raceDistance:1.20},{id:'CPU 1',raceDistance:1.10},{id:'CPU 2',raceDistance:1.00},
    {id:'CPU 3',raceDistance:.90},{id:'CPU 4',raceDistance:.60},{id:'CPU 5',raceDistance:.95}
  ]);
  const event=resolveSurvivalRound(state);
  assert.equal(event.eliminated.id,'CPU 4','Actual last by race progress must be eliminated even when another trigger is missing');
  assert.equal(state.round,1,'Exactly one elimination closes lap 1');
  assert.equal(getSurvivalStandings(state).length,5,'Lap 1 leaves five cars');
}

{
  const state=createSurvivalRaceState(raceEntries(),{maxRounds:5});
  armAll(state);
  for(let round=1;round<=5;round++){
    const active=getSurvivalStandings(state);
    assert.equal(active.length,7-round,`Lap ${round} starts with expected active count`);
    updateSurvivalProgress(state,active.map((r,index)=>({id:r.id,raceDistance:round+1-index*.05})));
    const ranked=getSurvivalStandings(state);
    for(const racer of ranked.slice(0,-1)){
      const cross=recordSurvivalFinishCross(state,racer.id,{distanceSinceFinish:1,now:1000+round*5000});
      assert.equal(cross.accepted,true,`${racer.id}: exactly one valid credit on lap ${round}`);
    }
    const event=resolveSurvivalRound(state);
    assert.ok(event,`Lap ${round} must close`);
    assert.equal(event.round,round,`Lap ${round} closes once`);
    assert.equal(getSurvivalStandings(state).length,6-round,`Lap ${round} eliminates exactly one car`);
  }
  assert.equal(state.round,5,'Survival is capped at five elimination laps');
  assert.equal(state.finished,true,'Lap 5 must finish the competition');
  assert.equal(getSurvivalStandings(state).length,1,'Lap 5 leaves one winner');
  assert.equal(state.winnerId,'TÚ','Player wins the deterministic five-lap smoke scenario');
}

{
  const state=createSurvivalRaceState(raceEntries());
  armAll(state);
  updateSurvivalProgress(state,raceEntries().map((r,index)=>({id:r.id,raceDistance:index===0?.2:1.4-index*.03})));
  for(const id of ['CPU 1','CPU 2','CPU 3','CPU 4','CPU 5']){
    recordSurvivalFinishCross(state,id,{distanceSinceFinish:1,now:4000});
  }
  const event=resolveSurvivalRound(state);
  assert.equal(event.eliminated.id,'TÚ','Player must be eliminated when actually last');
  assert.equal(event.playerEliminated,true,'Player elimination flag');
  assert.equal(state.finished,true,'Player elimination ends the player session');
  assert.equal(state.finishReason,'player-eliminated','Player elimination finish reason');
}

console.log(`Survival smoke OK: ${official.length} matchups, unique cars, +3% cap, centerline grid, authoritative 5-lap elimination state.`);
