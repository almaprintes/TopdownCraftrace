// Santa Cruz source-install contract. Preserves legacy until source arrives.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {loopPathMetrics,gateOnLoop,sampleLoopAt,crossesDirectedFinishGate} from '../src/game/tracks/closedCircuitGateOrder.js';
const src='src/game/tracks/library/santa-cruz/source/Santa-Cruz-x3-nitido.tdrtrack';
const track=JSON.parse(fs.readFileSync('src/game/tracks/library/santa-cruz/track.json','utf8'));
if(!fs.existsSync(src)){
  assert.notEqual(track.meta?.renderMode,'image-native','Without source, legacy Santa Cruz must be unchanged');
  console.log('[santa-cruz] source pending; legacy retained');
}else{
  assert.equal(track.meta.renderMode,'image-native');
  assert.equal(track.worldW,3072);assert.equal(track.worldH,4608);
  assert.equal(track.meta.imageNative.availability,'published');
  assert.equal(track.meta.imageNative.tiles.length,6);
  assert.equal(track.checkpointMode,'authored');
  assert.equal(track.checkpoints.length,2);
  assert.equal(track.startLine,null,'Closed circuit must not activate a separate rally start gate');
  const metrics=loopPathMetrics(track.centerline);
  const f=gateOnLoop(metrics,track.finishLine);
  assert.ok(f?.hit,'META has to cross the actual centerline');
  const distances=[];
  for(let i=0;i<2;i++){
    const gate=track.checkpoints[i],m=gateOnLoop(metrics,gate);
    assert.ok(m?.hit,'CP'+(i+1)+' must cross the centerline');
    const forward=m.tangent.x*gate.normal.x+m.tangent.y*gate.normal.y;
    assert.ok(forward>.95,'CP'+(i+1)+' facing backwards: '+forward);
    const relative=((m.routeDistance-f.routeDistance+metrics.total)%metrics.total)/metrics.total;
    distances.push(relative);
  }
  assert.ok(distances[0]>.055&&distances[1]<.945&&distances[1]-distances[0]>.10,
    'CP1 -> CP2 -> META must occur in driving order: '+JSON.stringify(distances));
  const finishDot=f.tangent.x*track.finishLine.normal.x+f.tangent.y*track.finishLine.normal.y;
  assert.ok(finishDot>.95,'META normal must agree with the actual route');
  // Drive two synthetic complete laps using the SAME directed swept gate
  // intersection as the race engine, including CP1/CP2 and finish order.
  const pass=(gate)=>{
    const m=gateOnLoop(metrics,gate);
    const a=sampleLoopAt(metrics,m.routeDistance-10);
    const b=sampleLoopAt(metrics,m.routeDistance+10);
    return crossesDirectedFinishGate(gate,a,b,{x:b.x-a.x,y:b.y-a.y});
  };
  let lapCount=0;
  for(let lap=0;lap<2;lap++){
    let cpState=0;
    if(pass(track.checkpoints[0]))cpState=1;
    if(cpState===1&&pass(track.checkpoints[1]))cpState=2;
    if(cpState===2&&pass(track.finishLine)){lapCount++;cpState=0;}
  }
  assert.equal(lapCount,2,'Two clean simulated laps must count at Santa Cruz');
  assert.equal(track.meta.gateOrder.crossed.length,2,'Gate-order diagnostics archived');
  console.log('SANTA CRUZ LAP ORDER OK',JSON.stringify({
    fractions:distances.map(x=>+x.toFixed(4)),finishDirection:+finishDot.toFixed(3),cleanLaps:lapCount,
    authoredPreserved:track.meta.gateOrder.authoredPreserved
  }));
  assert.equal(track.start.r,Math.atan2(track.centerline[6].y-track.centerline[0].y,
                                        track.centerline[6].x-track.centerline[0].x));
  for(const tile of track.meta.imageNative.tiles){
    assert.ok(fs.existsSync(path.join('public',tile.assetPath)),tile.assetPath);
    assert.equal(tile.width,1536);assert.equal(tile.height,1536);
  }
  const env=JSON.parse(fs.readFileSync('src/game/tracks/library/santa-cruz/santa-cruz.environment.json','utf8'));
  assert.equal(env.trackId,'santa-cruz');
  assert.ok(Array.isArray(env.collisionLines));assert.ok(Array.isArray(env.collisionZones));
  assert.equal(env.environment.length,1,'Only the new checkered finish line may overlay the photograph');
  assert.equal(env.environment[0].asset,'finish_line_checkered');
  // Colliders are exported in photo-pixel coordinates; no old 1900×2900
  // geometry or visual assets may leak into the new Santa Cruz.
  const authored=JSON.parse(fs.readFileSync('src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json','utf8'));
  assert.deepEqual(env.collisionLines,authored.collisionLines,
    'Every authored Bézier handle and position must survive installation unchanged');
  assert.deepEqual(env.collisionZones,authored.collisionZones);
  assert.deepEqual(env.canopyZones,authored.canopyZones,
    'All foreground Copas survive the authoritative photo source installation');
  assert.equal(env.canopyZones.length,13,'Keep all 13 authored Copas');
  assert.equal(env.collisionZones.length,3,'Keep 3 new owner-drawn solid collision polygons');
  assert.deepEqual(env.collisionZones.map(z=>z.points.length),[21,17,26]);
  const {validCollisionZone,compileCollisionZone}=await import('../src/game/environment/FreehandCollisionZones.js');
  for(const zone of env.collisionZones){
    assert.ok(zone.solid&&validCollisionZone(zone)&&compileCollisionZone(zone),
      'Solid polygon must compile to the actual race collision runtime: '+zone.id);
  }
  assert.equal(env.collisionLines.length,4,'Four authored wall boundaries expected');
  assert.equal(env.collisionLines.reduce((n,l)=>n+l.nodes.length,0),55,'All 55 newly exported owner nodes preserved');
  const {validCollisionLine,sampleCollisionLine}=await import('../src/game/environment/CollisionPenGeometry.js');
  for(const line of env.collisionLines){
    assert.ok(validCollisionLine(line),line.id);
    assert.equal(line.halfThickness,9,'Authored wall thickness preserved');
    const samples=sampleCollisionLine(line);
    assert.ok(samples.length>line.nodes.length,'Bézier wall must be sampled to collision segments');
    for(const p of samples){
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=3072&&p.y>=0&&p.y<=4608,
        'Wall curve must remain within photographic world bounds');
    }
  }
  console.log('[santa-cruz] source, tiles, native metadata and collision project OK');
}
