import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildOwnerKartingCanarias} from './install-karting-canarias-source.mjs';
import {narrowCanariasTrack,NARROW_ID,NARROW_RATIO} from '../src/game/tracks/kartingCanariasNarrow70.js';
import {shapeIsValid,sampleShapeEdge} from '../src/game/studio/trackShapeGeometry.js';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';
const project=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json','utf8'));
const canonical=buildOwnerKartingCanarias(),narrow=narrowCanariasTrack(canonical,project.editor);
assert.equal(narrow.meta.id,NARROW_ID);
assert.equal(narrow.trackWidth,175);
assert.equal(narrow.meta.imageNative.worldScale,2.5);
assert.equal(narrow.centerline.length,canonical.centerline.length);
assert.ok(shapeIsValid(narrow.trackShape));
assert.ok(narrow.meta.devOnly&&narrow.meta.variantOf==='karting-canarias');
assert.deepEqual([narrow.worldW,narrow.worldH],[canonical.worldW,canonical.worldH]);
assert.deepEqual([narrow.start,narrow.finishAnchor],[canonical.start,canonical.finishAnchor]);
for(let i=0;i<canonical.centerline.length;i++){
  assert.equal(narrow.centerline[i].x,canonical.centerline[i].x);
  assert.equal(narrow.centerline[i].y,canonical.centerline[i].y);
  assert.ok(Math.abs(narrow.centerline[i].width-canonical.centerline[i].width*NARROW_RATIO)<1e-9);
}
for(const key of ['leftEdge','rightEdge'])
  for(const [i,node] of narrow.trackShape[key].entries()){
    assert.equal(node.sourceNodeIndex,i);
    const base=canonical.trackShape[key][i],anchor=project.editor.nodes[i],s=2.5;
    assert.ok(Math.abs(node.x-(anchor.x*s+(base.x-anchor.x*s)*NARROW_RATIO))<1e-9);
  }
function crossings(edge){
  const pts=sampleShapeEdge(edge,true,14),len=pts.length;
  const side=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for(let i=0;i<len;i++)for(let j=i+2;j<len;j++){
    if(i===0&&j===len-1)continue;
    if(side(pts[i],pts[(i+1)%len],pts[j])*side(pts[i],pts[(i+1)%len],pts[(j+1)%len])<0&&
       side(pts[j],pts[(j+1)%len],pts[i])*side(pts[j],pts[(j+1)%len],pts[(i+1)%len])<0)
      throw Error('Narrow Bezier self-crossing at '+i+','+j);
  }
}
crossings(narrow.trackShape.leftEdge);
crossings(narrow.trackShape.rightEdge);
const mask=makeKartingShapeMask(narrow.trackShape,narrow.worldW,narrow.worldH);
for(const [i,p] of narrow.centerline.entries())
  assert.ok(mask.isOnTrack(p.x,p.y),'Narrow shape loses centerline at '+i);
for(const g of [narrow.finishLine,...narrow.checkpoints]){
  const orig=[canonical.finishLine,...canonical.checkpoints].find((v,i)=>
    i===[narrow.finishLine,...narrow.checkpoints].indexOf(g));
  assert.ok(Math.abs((g.a.x+g.b.x)-(orig.a.x+orig.b.x))<1e-7,'gate midpoint modified');
}
console.log('NARROW70_OK: 175px nominal, original lap/centerline intact, noncrossing both Bezier edges and all 506 centerline points on asphalt.');
