import assert from 'node:assert/strict';
import fs from 'node:fs';
import {paintOpenStageRoad,stageRasterTilePlan} from '../src/game/tracks/stageRasterRoad.js';
const track=JSON.parse(fs.readFileSync('src/game/tracks/library/rally-arafo-los-loros/track.json','utf8'));
const pts=track.centerline,tiles=stageRasterTilePlan(pts,track.trackWidth);
assert.equal(track.closed,false);
assert.equal(tiles.length,2,'Open rally raster should fit in 2 mobile-safe canvases');
assert.ok(tiles.every(t=>t.width<=4096&&t.height<=2304));
const operations=[],ctx={beginPath(){operations.push(['begin']);},
 moveTo(x,y){operations.push(['move',x,y]);},
 lineTo(x,y){operations.push(['line',x,y]);},
 stroke(){operations.push(['stroke']);},
 closePath(){throw Error('Closed route diagonal in Canvas2D!');}
};
const report=paintOpenStageRoad(ctx,pts,track.trackWidth);
assert.equal(report.points,pts.length);assert.equal(report.segments,pts.length-1);
assert.equal(operations.filter(o=>o[0]==='stroke').length,3);
const center=operations.slice(0,operations.findIndex(op=>op[0]==='stroke'));
assert.deepEqual(center[1],['move',pts[0].x,pts[0].y]);
assert.deepEqual(center.at(-1),['line',pts.at(-1).x,pts.at(-1).y]);
assert.equal(center.filter(o=>o[0]==='line').length,pts.length-1);
for(let i=0;i<pts.length-1;i++)assert.deepEqual(center[i+2],['line',pts[i+1].x,pts[i+1].y],'Route out of order at '+i);
const layer=fs.readFileSync('src/game/scenes/EnvironmentBuilderAmericasImportScene.js','utf8');
assert.ok(!layer.includes("DEV 1.2.225 · A→B CANVAS 2D"),'Obsolete on-screen diagnostics must stay removed');
assert.ok(!layer.includes('node.textContent='),'No visual debug data overlay');
assert.ok(layer.includes('paintOpenStageRoad(ctx,t.centerline,t.trackWidth)'));
const a=layer.indexOf(' _drawRealTrack(){'),b=layer.indexOf(' _clearBeautyReference(){',a);
const body=layer.slice(a,b);
assert.ok(body.includes('if(open){'));
assert.ok(body.includes('this._realTrackG?.setVisible?.(false)'),'Old Phaser diagonal must be HIDDEN');
assert.ok(body.indexOf('this._renderStageRaster();')<body.indexOf('super._drawRealTrack?.();'),
 'Open route must RETURN before calling inherited procedural Graphics');
assert.ok(body.includes('return;'));
assert.ok(layer.includes("this.cameras.main.ignore(sprite)"));
assert.ok(layer.includes("this._clearStageRaster();"));
console.log('STAGE CANVAS 2D OK: '+pts.length+' source-derived points, 2 mobile texture tiles, 3 OPEN strokes, 0 closing paths, inherited Phaser road disabled.');
