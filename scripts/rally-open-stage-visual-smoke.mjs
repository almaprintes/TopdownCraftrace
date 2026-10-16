import assert from 'node:assert/strict';
import fs from 'node:fs';
import {trackPreviewSvgPath} from '../src/game/tracks/trackPreviewPath.js';
import {drawOpenStageRoad} from '../src/game/tracks/openStageRoadRenderer.js';
const read=p=>fs.readFileSync(p,'utf8');
const stage=JSON.parse(read('src/game/tracks/library/rally-arafo-los-loros/track.json'));
const pts=stage.centerline.map(p=>({x:Number(p.x),y:Number(p.y)}));
assert.equal(stage.closed,false);
assert.equal(stage.raceType,'stage');
assert.ok(pts.length>2400);
const gap=Math.hypot(pts[0].x-pts.at(-1).x,pts[0].y-pts.at(-1).y);
assert.ok(gap>3000,'The rally must have different start/finish endpoints');
assert.ok(pts.slice(1).every((p,i)=>Math.hypot(p.x-pts[i].x,p.y-pts[i].y)<50),'Centerline internal jump');
const open=trackPreviewSvgPath(pts,{closed:stage.closed,scale:.08});
assert.ok(open.startsWith('M '));
assert.ok(!open.endsWith(' Z'),'The rally SVG may not connect finish to start');
assert.equal((open.match(/ L /g)||[]).length,pts.length-1);
assert.ok(trackPreviewSvgPath(pts.slice(0,5),{closed:true}).endsWith(' Z'),'Closed circuits unchanged');
assert.equal(trackPreviewSvgPath([{x:1,y:1},{x:NaN,y:2},{x:3,y:3}],{closed:false}),'M 1.0 1.0 L 3.0 3.0');
for(const v of [2,3,5,6]){
 const code=read('src/game/ui/raceLoadingExperienceV'+v+'.js');
 assert.ok(code.includes('trackPreviewSvgPath'),'Loading V'+v+': missing open route');
 assert.ok(!code.includes("join(' ')+' Z'"),'Loading V'+v+': unconditional closure');
 assert.ok(code.includes('closed!==false'),'Loading V'+v+': stage flag ignored');
}
const code=read('src/game/scenes/EnvironmentBuilderRealTrackScene.js');
const a=code.indexOf('    if(isOpen){'),b=code.indexOf('    }else{',a);
assert.ok(a>=0&&b>a);
const branch=code.slice(a,b);
assert.ok(branch.includes('drawOpenStageRoad(g,t.centerline,t.trackWidth)'),'A→B editor must use explicit segments');
assert.ok(!branch.includes('g.strokePath()'),'The old unbounded WebGL stroke must not return');
assert.ok(!branch.includes('g.closePath()'),'Editor connected stage end to start');
assert.ok(!branch.includes('g.fillPath()'),'Editor filled stage as a closed ring');
assert.ok(branch.includes('m.fillCircle('),'Editor does not mark START');
assert.ok(code.slice(b).includes('closed:true'),'Closed ribbon renderer changed');

// Simulate the exact 2465-node official stage in the editor's graphics
// interface, and assert each emitted segment joins ONLY adjacent vertices.
// The 3955px META-to-SALIDA shortcut must be impossible by construction.
const commands=[],g={
  width:0,lineStyle(w){this.width=w;return this;},
  lineBetween(x1,y1,x2,y2){commands.push({x1,y1,x2,y2,w:this.width});return this;},
  closePath(){throw Error('Open stage may not call graphics.closePath');},
  strokePath(){throw Error('Open stage may not call a massive strokePath');}
};
const result=drawOpenStageRoad(g,stage.centerline,stage.trackWidth);
assert.equal(result.count,pts.length);
assert.equal(result.segments,pts.length-1);
assert.ok(result.maxSegment<50,'Official points must have short links');
assert.equal(commands.length,(pts.length-1)*3,'Separate road and both edges');
for(let i=0;i<pts.length-1;i++){
 const c=commands[i],a=pts[i],b=pts[i+1];
 assert.deepEqual([c.x1,c.y1,c.x2,c.y2],[a.x,a.y,b.x,b.y],
   'Segment '+i+' must connect consecutive points ONLY');
}
assert.ok(commands.every(c=>Math.hypot(c.x2-c.x1,c.y2-c.y1)<200),
 'An unintended giant shortcut appeared in the stage editor');
console.log('RALLY OPEN A->B OK: '+pts.length+' nodes, '+gap.toFixed(1)+'px between endpoints, no SVG closure in 4 loading views, editor draws 7392 bounded segments with START marker.');
