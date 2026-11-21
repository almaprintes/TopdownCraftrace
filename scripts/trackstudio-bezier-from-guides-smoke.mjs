import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAiBezierFromGuides} from '../src/game/studio/trackAiBezierGuideGenerator.js';
import {createAiBezierFromTrackNodes,sampleAiBezierLine}
 from '../src/game/studio/trackAiBezierLine.js';
import {makeAiLineGuide,normalizeAiLineGuides}
 from '../src/game/studio/trackAiLineGuides.js';

const R=320,N=32,C={x:650,y:650},step=2*Math.PI/N;
const arm=R*(4/3)*Math.tan(step/4);
const nodes=Array.from({length:N},(_,i)=>{
 const a=i*step,x=C.x+R*Math.cos(a),y=C.y+R*Math.sin(a);
 return{x,y,handleIn:{x:x+Math.sin(a)*arm,y:y-Math.cos(a)*arm},
  handleOut:{x:x-Math.sin(a)*arm,y:y+Math.cos(a)*arm}};
});
const pointAt=(i,delta=0)=>{
 const a=i*step;
 return{x:C.x+(R+delta)*Math.cos(a),y:C.y+(R+delta)*Math.sin(a)};
};
const guideIndices=[0,5,11,17,23,28];
const guides=guideIndices.map((j,i)=>{
 const p=pointAt(j,[18,-23,30,-18,25,-24][i]);
 return makeAiLineGuide([],p.x,p.y,170);
}).map((g,i)=>({...g,id:'apex-'+(i+1)}));
const original=JSON.stringify(nodes),oldGuides=JSON.stringify(guides);
const generated=createAiBezierFromGuides(nodes,guides,{trackWidth:170,maxNodes:76});
const line=generated.line;
assert.equal(generated.source,'guide-anchors');
assert.equal(generated.usedGuides.length,guides.length);
assert.ok(line.nodes.length<=76 && line.nodes.length>guides.length+10);
const sampled=sampleAiBezierLine(line,8);
for(const guide of guides){
 const exact=line.nodes.filter(p=>p.x===guide.x&&p.y===guide.y);
 assert.equal(exact.length,1,'Every guide must be a real Bezier anchor: '+guide.id);
 assert.ok(sampled.some(p=>Math.hypot(p.x-guide.x,p.y-guide.y)<1e-7),
  'Sampled trajectory must pass exactly through '+guide.id);
}
assert.equal(JSON.stringify(nodes),original,'Never edit the circuit centerline');
assert.equal(JSON.stringify(guides),oldGuides,'Never mutate saved guide points');
assert.equal(normalizeAiLineGuides(guides).points.length,6);
assert.ok(line.nodes.some(p=>Math.abs(Math.hypot(p.x-C.x,p.y-C.y)-R)>10),
 'The line must not be a copy of the central axis');
const axis=createAiBezierFromTrackNodes(nodes,32);
assert.equal(axis.nodes.length,32,'Legacy fallback must remain independent');
const impossible=guides.map(p=>({...p}));
impossible[0]={...impossible[0],x:1250,y:1200};
assert.throws(()=>createAiBezierFromGuides(nodes,impossible,{trackWidth:170}),
 /podría pertenecer a otro tramo/,'Never connect a far guide through an unrelated road');
assert.throws(()=>createAiBezierFromGuides(nodes,[],{trackWidth:170}),
 /No hay puntos guía/);
const repeated=guides.map(p=>({...p}));
repeated[1]={...repeated[1],x:repeated[0].x,y:repeated[0].y};
assert.throws(()=>createAiBezierFromGuides(nodes,repeated,{trackWidth:170}),
 /superponen/,'Do not overwrite or omit overlapping guide anchors');
const plugin=readFileSync('src/game/studio/installTrackAiBezier.js','utf8');
const ui=readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
assert.ok(plugin.includes('createAiBezierFromGuides('));
assert.ok(plugin.includes('const fromGuides=!forceAxis&&guideCount>0'));
assert.ok(ui.includes('GENERAR DESDE GUÍAS'));
assert.ok(ui.includes('DESDE EJE (SIN GUÍAS)'));
assert.ok(plugin.includes('scene._autosaveRecovery()'));
assert.ok(plugin.includes('scene._exportToGameTrack='));
assert.ok(ui.includes('✓ VALIDAR TRAZADA'));
console.log('PASS AI Bezier: exact authored apex anchors, continuous ordered route, 76-node limit, independent centerline fallback');
