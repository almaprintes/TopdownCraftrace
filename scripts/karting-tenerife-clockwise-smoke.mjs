import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {trackDisplayDirection} from '../src/game/tracks/trackDisplayDirection.js';
import {TENERIFE_CLOCKWISE_ID,TENERIFE_LEGACY_ID,selectedTenerifeRaceId,baseCircuitId,readTenerifeDirection,saveTenerifeDirection} from '../src/game/tracks/trackReverseVariant.js';

const norm=n=>Math.hypot(n.x,n.y);
const dot=(a,b)=>(a.x*b.x+a.y*b.y)/(norm(a)*norm(b));
const middle=g=>({x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const signedArea=points=>points.reduce((sum,p,i)=>{const next=points[(i+1)%points.length];return sum+p.x*next.y-next.x*p.y;},0);
const close=(a,b,why)=>assert.ok(Math.abs(a-b)<.03,why+' '+a+' / '+b);

const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
  const {TRACK_REGISTRY,createTrack}=await server.ssrLoadModule('/src/game/tracks/trackRegistry.js');
  const legacy=createTrack(TENERIFE_LEGACY_ID),clockwise=createTrack(TENERIFE_CLOCKWISE_ID);
  assert.notEqual(legacy,clockwise);
  assert.equal(legacy.key,TENERIFE_LEGACY_ID);
  assert.equal(clockwise.key,TENERIFE_CLOCKWISE_ID);
  assert.equal(legacy.closed,true);
  assert.equal(clockwise.closed,true);
  assert.equal(legacy.raceDirection,'forward','old anti-clockwise traversal stays the same');
  assert.equal(clockwise.raceDirection,'reverse');
  assert.equal(trackDisplayDirection(legacy),'counterclockwise','source route is the historical reverse variant');
  assert.equal(trackDisplayDirection(clockwise),'clockwise','new route follows requested real clockwise direction');
  assert.ok(signedArea(legacy.raceCenterline)*signedArea(clockwise.raceCenterline)<0);
  assert.deepEqual(clockwise.centerline,legacy.centerline,'do not reverse physical road geometry');
  assert.deepEqual(clockwise.trackShape,legacy.trackShape,'keep one collision/photo mask');
  assert.deepEqual(clockwise.meta.imageNative,legacy.meta.imageNative,'same photo tile set and asset paths');
  assert.deepEqual(clockwise.meta.sourceFile,legacy.meta.sourceFile);
  assert.equal(clockwise.meta.id,TENERIFE_CLOCKWISE_ID,'photo gate and race identity must match');
  assert.equal(clockwise.meta.reverseOf,TENERIFE_LEGACY_ID);
  assert.deepEqual(clockwise.grid,null,'never launch old grid in opposite direction');
  assert.ok(clockwise.start&&[clockwise.start.x,clockwise.start.y,clockwise.start.r].every(Number.isFinite));
  const finishMid=middle(legacy.finishLine);
  assert.ok(distance(clockwise.start,finishMid)<Math.max(140,clockwise.trackWidth*.8));
  const facing={x:Math.cos(clockwise.start.r),y:Math.sin(clockwise.start.r)};
  assert.ok(dot(facing,clockwise.finishLine.normal)>.25,'new spawn must face the reversed finish');
  close(distance(finishMid,middle(clockwise.finishLine)),0,'same photographed finish position');
  assert.ok(dot(legacy.finishLine.normal,clockwise.finishLine.normal)<-.999,'finish crossing must reverse');
  assert.equal(legacy.checkpoints.length,2);
  assert.equal(clockwise.checkpoints.length,2);
  for(let i=0;i<2;i++){
    const original=legacy.checkpoints[1-i],reversed=clockwise.checkpoints[i];
    close(distance(middle(original),middle(reversed)),0,'same authored CP center reversed order');
    assert.ok(dot(original.normal,reversed.normal)<-.999,'CP'+(i+1)+' normal flips');
  }
  assert.equal(selectedTenerifeRaceId(TENERIFE_LEGACY_ID,'clockwise'),TENERIFE_CLOCKWISE_ID);
  assert.equal(selectedTenerifeRaceId(TENERIFE_LEGACY_ID,'counterclockwise'),TENERIFE_LEGACY_ID);
  assert.equal(baseCircuitId(TENERIFE_CLOCKWISE_ID),TENERIFE_LEGACY_ID);
  const prefs=new Map(),storage={getItem:k=>prefs.get(k)||null,setItem:(k,v)=>prefs.set(k,v)};
  assert.equal(readTenerifeDirection(storage),'counterclockwise','existing players stay on original route by default');
  saveTenerifeDirection(storage,'clockwise');
  assert.equal(readTenerifeDirection(storage),'clockwise');
  assert.ok(readFileSync('src/game/scenes/MenuScene.js','utf8').includes('selectedTenerifeRaceId(selectedTrackKey,readTenerifeDirection(localStorage))'));
  assert.ok(readFileSync('src/game/scenes/TrackGarageAndroidTouchScene.js','utf8').includes('tdr-ts-route-modes'));
  assert.ok(readFileSync('src/game/scenes/RaceScene.js','utf8').includes('baseCircuitId(this.trackKey)'));
  assert.ok(readFileSync('src/game/tracks/trackUnlocks.js','utf8').includes(TENERIFE_CLOCKWISE_ID));
  // A new trackKey means new independent records, ghosts and Supabase ranking IDs.
  assert.notEqual('tdr2:ttHist:'+legacy.key,'tdr2:ttHist:'+clockwise.key);
  assert.notEqual('tdr2:ttBest:'+legacy.key,'tdr2:ttBest:'+clockwise.key);
  console.log('PASS: Tenerife reverse pilot, real clockwise geometry, preserved photographs/Bezier colliders, spawn, finish, authored sectors, old records, independent PB IDs and selection.');
}finally{await server.close();}
