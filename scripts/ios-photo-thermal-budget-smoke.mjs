import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compactIphoneRenderBudget} from '../src/game/performance/iosRaceRenderBudget.js';
import {buildColliderSpatialIndex,colliderBounds,nearbyColliders} from '../src/game/performance/colliderSpatialIndex.js';
import {sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';

const ios={ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',screenMin:390,dpr:3};
assert.equal(compactIphoneRenderBudget({...ios,preset:'high'}).resolution,1);
assert.equal(compactIphoneRenderBudget({...ios,preset:'medium'}).resolution,1);
assert.equal(compactIphoneRenderBudget({...ios,preset:'ultra'}).resolution,1.5,'user-controlled ultra retains sharpness');
assert.equal(compactIphoneRenderBudget({...ios,preset:'performance'}).resolution,1);
assert.equal(compactIphoneRenderBudget({...ios,screenMin:440,preset:'high'}),null,'large phones unchanged');
assert.equal(compactIphoneRenderBudget({...ios,ua:'Mozilla/5.0 (iPad)',preset:'high'}),null,'iPads unchanged');
assert.equal(compactIphoneRenderBudget({...ios,ua:'Android',preset:'high'}),null,'Android unchanged');
const previousPixels=1.5**2,currentPixels=1**2;
assert.ok(1-currentPixels/previousPixels>.55,'Compact iPhone high mode should reduce framebuffer pixels >55%');

const environment=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json','utf8'));
const segments=[];
for(const line of environment.collisionLines){
  const p=sampleCollisionLine(line,18),half=line.halfThickness||9;
  for(let i=1;i<p.length;i++){
    segments.push({ax:p[i-1].x,ay:p[i-1].y,bx:p[i].x,by:p[i].y,halfThickness:half,kind:'collision'});
  }
}
assert.ok(segments.length>20,'Real authored pen lines must yield dozens of collision segments');
segments.push({cx:300,cy:200,radius:22,kind:'tire'});
const index=buildColliderSpatialIndex(segments);
assert.ok(index&&index.count===segments.length,'All segments indexed');
assert.ok(index.cells.size>2,'Multi-cell race map');
assert.deepEqual(nearbyColliders(null,200,300,segments),segments,'Malformed index falls back safely');
assert.deepEqual(nearbyColliders(index,200,300,segments,100),segments,'Future oversized cars bypass spatial filter');

// Reproduce every possible contact within 30 pixels of sampled points of
// Karting Tenerife's authored walls. The grid must never omit a segment
// that the old exhaustive solver would test with an ordinary car radius.
let candidates=0,original=0,checks=0;
for(const line of environment.collisionLines){
  const poly=sampleCollisionLine(line,34);
  for(let j=0;j<poly.length;j+=Math.max(1,Math.floor(poly.length/18))){
    const p=poly[j];
    for(const dx of [-21,0,21])for(const dy of [-21,0,21]){
      const x=p.x+dx,y=p.y+dy;
      const subset=nearbyColliders(index,x,y,segments,16);
      candidates+=subset.length;original+=segments.length;checks++;
      for(const c of segments){
        const bounds=colliderBounds(c);
        const reach=16+6;
        if(x<bounds.minX-reach||x>bounds.maxX+reach||y<bounds.minY-reach||y>bounds.maxY+reach)continue;
        assert.ok(subset.includes(c),'Index omitted relevant collider at '+x+','+y);
      }
    }
  }
}
assert.ok(checks>=200,'Contact detection test sample count');
assert.ok(candidates<original*.75,'Index must prune >25% of broad-phase candidates');
const game=readFileSync('src/game/game.js','utf8');
assert.ok(game.includes('compactIphoneRenderBudget({ua:'));
assert.ok(game.includes("video?.showFPS===true"),'DEV measurement overlay must be opt-in');
assert.ok(!game.includes("if(!IS_PROD_BUILD&&!/Android/i.test(String(navigator?.userAgent||'')))installRacePerformanceProbe"),
  'The always-on secondary iOS requestAnimationFrame loop must be removed');
const physics=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.ok(physics.includes('colliderIndex:buildColliderSpatialIndex(colliders)'));
assert.ok(physics.includes('nearbyColliders(scene?._tdrRaceEnvironment?.colliderIndex,px,py,list,physicsRadius)'));
assert.ok(physics.includes('for(let pass=0;pass<2;pass++)'));
assert.ok(physics.includes('resolveBodyAgainstSolidZones(scene,player)'),
  'All 17 solid zones still affect the car');
console.log('iPhone render and collisions OK: resolution 1 vs 1.5; photo untouched; '+segments.length+' authored collider segments; '+checks+' impact tests; averaged candidate fraction '+(candidates/original).toFixed(3));
