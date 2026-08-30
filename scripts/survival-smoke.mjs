import assert from 'node:assert/strict';
import { buildSurvivalRoster, getOfficialSurvivalCars } from '../src/game/modes/survival/survivalRoster.js';
import { buildSurvivalGrid } from '../src/game/modes/survival/survivalGrid.js';

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

// Deliberately curved closed line: grid must follow arc length/tangent rather
// than subtracting a fixed world-axis vector from the start position.
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

console.log(`Survival smoke OK: ${official.length} player matchups, unique cars, beatable pace cap, centerline grid.`);
