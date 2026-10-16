// Lossless owner TrackStudio source archive: NOT yet a playable replacement.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {shapeIsValid,sampleShapeEdge} from '../src/game/studio/trackShapeGeometry.js';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';
const source='src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json';
const master='public/assets/tracks/karting-canarias/karting-canarias-new.webp';
const raw=readFileSync(source);
const project=JSON.parse(raw.toString('utf8'));
const t=project.gameTrack;
assert.equal(raw.length,39115,'TrackStudio project JSON must remain byte-identical to owner export');
assert.deepEqual([t.worldW,t.worldH],[2048,3072]);
assert.equal(t.centerline.length,506);
assert.equal(project.editor.nodes.length,18);
assert.equal(t.trackWidth,105);
assert.ok(t.closed&&t.trackShape?.closed&&shapeIsValid(t.trackShape));
assert.deepEqual([project.imageAsset.width,project.imageAsset.height],[2048,3072]);
const image=readFileSync(master);
assert.equal(image.length,project.imageAsset.size);
const sha256=x=>createHash('sha256').update(x).digest('hex');
assert.equal(sha256(image),'4472ddf772300318555aad8814ff47da70a759879cca68e66a9f0ca72cac72d2',
  'Game image must match the exact WebP embedded in the owner source');
const original=Buffer.concat([Buffer.from('TDR-IMAGE-PROJECT-V1\\n'+raw.length+'\\n'),raw,image]);
assert.equal(sha256(original),'b7635ba709e8af0f4634ad5b54374ba064bd620c585cf0499a4223381878d297',
  'Archive metadata and published image must reconstruct the exact uploaded .tdrtrack');
const mask=makeKartingShapeMask(t.trackShape,t.worldW,t.worldH);
assert.ok(t.centerline.every(p=>mask.isOnTrack(p.x,p.y)),
  'Authored centerline must stay within the two painted-road boundaries');
function crossing(a,b,c,d){
  const side=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
}
function selfCross(edge){
  const points=sampleShapeEdge(edge,true,12),n=points.length;
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1)continue;
    if(crossing(points[i],points[(i+1)%n],points[j],points[(j+1)%n]))return true;
  }
  return false;
}
const blockers={
  missingFinish:!t.finishLine?.a||!t.finishLine?.b,
  missingCheckpoints:!Array.isArray(t.checkpoints)||t.checkpoints.length!==2,
  selfCrossingRoadEdge:selfCross(t.trackShape.leftEdge)||selfCross(t.trackShape.rightEdge)
};
assert.deepEqual(blockers,{missingFinish:true,missingCheckpoints:true,selfCrossingRoadEdge:true},
  'If the owner finishes the draft, update this test and rerun all geometry validations');
const live=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias/track.json','utf8'));
assert.notEqual(live.meta?.renderMode,'image-native',
  'Do not put the incomplete TrackStudio geometry into the playable circuit');
assert.deepEqual([live.worldW,live.worldH],[2000,4300]);
console.log('Karting Canarias owner source archived losslessly: 506 route points, 18 Bezier controls, exact 2048x3072 WebP. Activation blocked: missing finish, 2 checkpoints, one self-crossing edge.');
