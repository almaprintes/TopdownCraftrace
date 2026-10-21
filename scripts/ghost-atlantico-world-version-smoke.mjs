import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ghostGeometryRevision,ghostReplayCompatibility} from '../src/game/tracks/ghostTrackCompatibility.js';
import {ATLANTICO_WORLD_SCALE} from '../src/game/tracks/atlanticoWorldScale.js';

assert.equal(ATLANTICO_WORLD_SCALE,.70);
const track=()=>({worldW:1450,worldH:900,trackWidth:80,
 raceCenterline:Array.from({length:61},(_,i)=>({x:200+i*18,y:310,width:80})),
 finishLine:{a:{x:200,y:250},b:{x:200,y:370}},
 meta:{imageNative:{worldScale:.70}}});
const current=track();
const samples=Array.from({length:32},(_,i)=>({t:i*55,x:220+i*31,y:310,r:0}));
const good={trackKey:'circuito-atlantico',carId:'spark',lapMs:1760,samples};
const old={...good,samples:samples.map(p=>({...p,x:p.x/.70,y:p.y/.70}))};
assert.equal(ghostReplayCompatibility(good,'circuito-atlantico',current).compatible,true);
assert.equal(ghostReplayCompatibility(old,'circuito-atlantico',current).compatible,false);
assert.equal(ghostReplayCompatibility(old,'circuito-atlantico',current).reason,'legacy-100-percent');
for(const id of ['circuito-atlantico','circuito-atlantico-inverso']){
  assert.equal(ghostReplayCompatibility({...old,trackKey:id},id,current).compatible,false,
    id+' pre-70% ghost must not show on the current track');
  assert.equal(ghostReplayCompatibility({...good,trackKey:id},id,current).compatible,true,
    id+' should preserve a legacy ghost recorded after the resize');
}
const rev=ghostGeometryRevision('circuito-atlantico',current);
assert.equal(ghostReplayCompatibility({...good,geometryRevision:rev},'circuito-atlantico',current).compatible,true);
assert.notEqual(rev,ghostGeometryRevision('circuito-atlantico-inverso',current));
assert.equal(ghostReplayCompatibility({...good,geometryRevision:rev},'circuito-atlantico',{...current,worldW:1500}).compatible,false);
assert.equal(ghostReplayCompatibility(good,'karting-tenerife',current).compatible,false);
assert.equal(ghostReplayCompatibility({...good,trackKey:'karting-tenerife'},'karting-tenerife',{...current,meta:{}}).compatible,true);

const status=readFileSync('src/game/scenes/RaceStaticGhostStatusScene.js','utf8');
const visual=readFileSync('src/game/scenes/RaceGhostModeScene.js','utf8');
const publish=readFileSync('src/game/ui/sessionRecordPublishOffer.js','utf8');
assert.match(status,/ghostReplayCompatibility\(onlineGhost,key,this\.track\)/);
assert.match(status,/ghostReplayCompatibility\(oldPb,key,this\.track\)/);
assert.match(status,/GEOMETRY_GHOST_PREFIX = 'tdr2:ghostGeometry:'/);
assert.match(status,/kind:isOfficialNewPb\?'circuit-personal-best':'circuit-geometry-best'/);
assert.match(status,/if\(isOfficialNewPb\)\{[\s\S]*?localStorage\.setItem\(this\.ttKey/);
assert.match(status,/_isGhostCurrentGeometryReplay\(\)/);
assert.match(status,/VUELTA ACTUAL/);
assert.match(status,/PB ANTIGUO/);
assert.match(status,/_onlineGhostChallenge=\{\.\.\.this\._onlineGhostChallenge,invalid:true\}/);
assert.match(publish,/ghostReplayCompatibility\(ghost,trackId,scene\?\.track\)\.compatible/);
assert.ok(publish.indexOf('ghostReplayCompatibility(ghost,trackId')<publish.indexOf('await showRewardedAd(scene'),
  'Stale replay rejection MUST happen before rewarded advertisement');
assert.match(visual,/g\.setDisplaySize\(footprintW,footprintH\)/);
assert.match(visual,/this\._ghostSprite\.setDisplaySize\(w,h\)/);
assert.ok(!status.includes('localStorage.removeItem('),'Historic player records must not be deleted');
assert.match(readFileSync('index.html','utf8'),/content="DEV 1\.2\.335"/);
console.log('PASS: Atlantic legacy 100% ghosts blocked (normal + inverse); 70% accepted; separate current replay; PB preserved; no invalid online ads or giant sprites');
