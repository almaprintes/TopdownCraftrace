import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findBezierSelfIntersection,alignForwardRoadOrder}
 from '../src/game/ai/trackBezierGeometryAudit.js';

const rectangle=[
 {x:0,y:0},{x:200,y:0},{x:200,y:100},{x:0,y:100}
];
assert.equal(findBezierSelfIntersection(rectangle,1),null,
 'A simple closed line must not report a self crossing');

const bowtie=[
 {x:0,y:0},{x:200,y:100},{x:200,y:0},{x:0,y:100}
];
const crossing=findBezierSelfIntersection(bowtie,1);
assert.ok(crossing,'Nonadjacent line segments really intersect');
assert.equal(crossing.nodeA,0);
assert.equal(crossing.nodeB,2);
assert.ok(Math.abs(crossing.point.x-100)<1e-7);

const road=[];
for(let i=0;i<80;i++)road.push({x:i*10,y:-15});
for(let i=0;i<24;i++){
 const a=-Math.PI/2+(i/24)*Math.PI;
 road.push({x:790+15*Math.cos(a),y:15*Math.sin(a)});
}
for(let i=0;i<80;i++)road.push({x:790-i*10,y:15});
for(let i=0;i<24;i++){
 const a=Math.PI/2+(i/24)*Math.PI;
 road.push({x:15*Math.cos(a),y:15*Math.sin(a)});
}
const n=road.length;
// A realistic narrow hairpin with two parallel, nearby legs. The authored
// spline is smoothly reparameterized and approaches the opposite lane, yet
// remains non-self-intersecting and travels one entire lap in correct order.
const authored=road.map((_,i)=>{
 const phase=i/n;
 const at=(i+8*Math.sin(phase*Math.PI*2)+n)%n;
 const k=Math.floor(at),u=at-k;
 const a=road[k],b=road[(k+1)%n];
 return{x:a.x+(b.x-a.x)*u,
  y:a.y+(b.y-a.y)*u+(a.y<0?4:-4)};
});
assert.equal(findBezierSelfIntersection(authored,1),null,
 'Nearby hairpin legs are not a literal curve crossing');
const aligned=alignForwardRoadOrder(authored,road);
assert.ok(aligned,'Globally ordered matcher must follow the entire hairpin lap');
assert.ok(aligned.travel>n*.78&&aligned.travel<n*1.22,
 'Must complete one loop, not stick on a nearby straight');

const inverse=alignForwardRoadOrder(authored.slice().reverse(),road);
assert.equal(inverse,null,'A curve run against the road direction is not valid');

const editor=readFileSync('src/game/studio/installTrackAiBezier.js','utf8');
const preview=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const chrome=readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
const planner=readFileSync('src/game/ai/trackBezierAiRacingLinePlanner.js','utf8');
assert.ok(editor.includes("scene._catalogRaceDirection==='reverse'"),
 'The editor checker must respect reverse circuits');
assert.ok(preview.includes("s._catalogRaceDirection==='reverse'"),
 'The preview checker must respect the same reverse circuit direction');
assert.ok(preview.includes("'route-self-intersection'"),
 'A real crossing needs a distinct preview message');
assert.ok(planner.includes("findBezierSelfIntersection(dense,30)"));
assert.ok(planner.includes("alignForwardRoadOrder(path,first)"));
assert.ok(chrome.includes('LOCALIZAR ERROR'));
console.log('PASS spline crossings differ from narrow hairpin order; reverse preview aligned and error location exposed');
