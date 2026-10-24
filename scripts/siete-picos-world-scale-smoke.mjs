import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {installSietePicos} from './install-siete-picos-source.mjs';
import {SIETE_PICOS_WORLD_SCALE as SCALE} from '../src/game/tracks/sietePicosWorldScale.js';
const root='src/game/tracks/library/siete-picos/';
const bytes=fs.readFileSync(root+'source/7-picos.tdrtrack');
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
  '270261f98c716a4c1b55a4e6184527c4347f140fc40f2d4af0c262f356f794cb');
const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
assert.ok(bytes.subarray(0,magic.length).equals(magic));
const e=bytes.indexOf(10,magic.length),len=Number(bytes.toString('ascii',magic.length,e));
const original=JSON.parse(bytes.subarray(e+1,e+1+len).toString('utf8')).gameTrack;
const installed=await installSietePicos({withAssets:false});
assert.equal(installed.installed,true);
assert.equal(installed.worldScale,SCALE);
const t=JSON.parse(fs.readFileSync(root+'track.json','utf8'));
const env=JSON.parse(fs.readFileSync(root+'siete-picos.environment.json','utf8'));
assert.deepEqual([t.worldW,t.worldH],[3620,2715]);
assert.deepEqual([t.meta.imageNative.width,t.meta.imageNative.height],[1448,1086]);
assert.equal(t.meta.imageNative.worldScale,2.5);
assert.equal(t.meta.imageNative.tiles.length,1);
assert.equal(t.meta.imageNative.tiles[0].assetPath,'assets/tracks/siete-picos/7-picos.webp');
assert.equal(t.meta.hiddenFromTrackSelect,true);
assert.equal(t.carScale,1);
assert.equal(t.trackWidth,original.trackWidth*SCALE);
assert.equal(t.centerline.length,730);
assert.equal(t.trackShape.sourceNodeCount,26);
assert.equal(t.centerline[0].x,original.centerline[0].x*SCALE);
assert.equal(t.centerline[0].width,original.centerline[0].width*SCALE);
for(const edge of ['leftEdge','rightEdge'])
 for(let i=0;i<original.trackShape[edge].length;i++)
  for(const key of ['x','y'])
   assert.ok(Math.abs(t.trackShape[edge][i][key]-original.trackShape[edge][i][key]*SCALE)<1e-8);
for(const f of ['handleIn','handleOut'])
 assert.equal(t.trackShape.leftEdge[0][f].x,original.trackShape.leftEdge[0][f].x*SCALE);
assert.equal(t.checkpoints.length,2);
assert.equal(t.startLine,null);
assert.ok(t.finishLine.a&&t.finishLine.b);
assert.equal(env.version,7);
assert.equal(env.coordinateSpace,'race-world');
assert.equal(env.trackId,'siete-picos');
assert.equal(env.environment.length,1);
assert.equal(env.environment[0].displayWidth,37.97*SCALE);
assert.deepEqual(env.collisionLines.map(l=>l.nodes.length),[38,35]);
assert.deepEqual(env.collisionLines.map(l=>l.halfThickness),[22.5,22.5]);
assert.equal(env.collisionLines[0].nodes[0].x,1241.3760387519435*SCALE);
assert.ok(env.collisionLines.every(l=>l.nodes.every(n=>
 [n.x,n.y,n.in.x,n.in.y,n.out.x,n.out.y].every(Number.isFinite))));
for(const file of ['src/game/scenes/raceEnvironmentRuntime.js',
 'src/game/tracks/imageNativeRaceLoader.js',
 'src/game/scenes/EnvironmentBuilderRealTrackCleanScene.js'])
 assert.ok(fs.readFileSync(file,'utf8').includes('siete-picos'));
console.log('7 Picos x2.5 OK: source unchanged, 26 Bezier nodes, 2 CP, 73 collision anchors, 1 finish decal, 1448x1086 texture.');
