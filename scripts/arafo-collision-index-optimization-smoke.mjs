// Arafo iPhone regression: preserve authored Bézier geometry, optimize only
// spatial candidate selection and unnecessary physics-body writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';
import {buildColliderSpatialIndex,nearbyColliders} from '../src/game/performance/colliderSpatialIndex.js';

const json=JSON.parse(readFileSync('src/game/tracks/library/rally-arafo-los-loros/rally-arafo-los-loros.environment.json','utf8'));
assert.equal(json.trackId,'rally-arafo-los-loros');
assert.equal(json.collisionLines.length,1);
assert.deepEqual(json.collisionZones,[]);
const line=json.collisionLines[0];
assert.equal(line.nodes.length,190,'Do not simplify or replace the owner-authored barrier');
const points=sampleCollisionLine(line,18);
const colliders=[];
for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if(Math.hypot(b.x-a.x,b.y-a.y)<1)continue;
  colliders.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,halfThickness:9,kind:'collision'});
}
assert.ok(colliders.length>1000,'Rally regression depends on dense Bézier samples');

const baseline=buildColliderSpatialIndex(colliders);
const compact=buildColliderSpatialIndex(colliders,128,40);
assert.equal(baseline.cellSize,256);assert.equal(baseline.margin,96);
assert.equal(compact.cellSize,128);assert.equal(compact.margin,40);
assert.equal(compact.count,colliders.length);
assert.ok(compact.cells.size>0);
const runtime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.match(runtime,/rallyDenseWall=normalizeTrackKey\(env\.trackId\)==='rally-arafo-los-loros'/);
assert.match(runtime,/buildColliderSpatialIndex\(colliders,128,40\)/);
assert.match(runtime,/:\s*buildColliderSpatialIndex\(colliders\)/,
  'Other circuits must retain the old collision index');
const runtimeSection=runtime.slice(runtime.indexOf('function resolveBodyAgainstColliders('),
  runtime.indexOf('function resolveBodyAgainstSolidZones('));
assert.match(runtimeSection,/hadContact=false/);
assert.ok((runtimeSection.match(/hadContact=true/g)||[]).length>=2,
  'Both circle and line contact must mark actual collision');
assert.match(runtimeSection,/if\(!hadContact\)return;body\.setPosition/,
  'Do not rewrite car position/velocity when no contact occurred');

let oldCandidates=0,newCandidates=0,probes=0;
const r=14; // >= current Arafo vehicle radius, including safety allowance
for(let i=0;i<colliders.length;i+=2){
  const c=colliders[i],x=(c.ax+c.bx)/2,y=(c.ay+c.by)/2;
  for(const [ox,oy] of [[7,5],[-12,8],[0,0]]){
    const px=x+ox,py=y+oy;
    const nearby=nearbyColliders(compact,px,py,colliders,r);
    const existing=nearbyColliders(baseline,px,py,colliders,r);
    assert.ok(nearby.length<=colliders.length);
    oldCandidates+=existing.length;newCandidates+=nearby.length;probes++;
    const selected=new Set(nearby);
    // Geometric equivalence: every segment capable of touching the car must
    // still be considered even if it crosses a cell boundary.
    for(const other of colliders){
      const minX=Math.min(other.ax,other.bx)-other.halfThickness-r;
      const maxX=Math.max(other.ax,other.bx)+other.halfThickness+r;
      const minY=Math.min(other.ay,other.by)-other.halfThickness-r;
      const maxY=Math.max(other.ay,other.by)+other.halfThickness+r;
      if(px<minX||px>maxX||py<minY||py>maxY)continue;
      assert.ok(selected.has(other),'A possible contact segment was missed by the compact index');
    }
  }
}
const oldMean=oldCandidates/probes,newMean=newCandidates/probes;
assert.ok(newMean<oldMean*.75,
  'Compact Arafo index must reduce candidates substantially: '+newMean+'/'+oldMean);
assert.strictEqual(nearbyColliders(compact,500,500,colliders,40),colliders,
  'Large physics radius must fall back to full scan, not miss a wall');
console.log('Arafo index smoke OK: '+colliders.length+' colliders, '+probes+
  ' geometric probes, avg candidates '+oldMean.toFixed(1)+' → '+newMean.toFixed(1)+
  ' ('+((1-newMean/oldMean)*100).toFixed(0)+'% fewer); all potential contacts preserved; no idle body.setPosition.');
