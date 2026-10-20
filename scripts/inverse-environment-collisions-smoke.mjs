// Integration regression: every racing direction must install the ORIGINAL
// Environment Studio obstacles in the real race runtime, not just in the registry.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';
import {compileCollisionZone} from '../src/game/environment/FreehandCollisionZones.js';
import {CLOSED_CIRCUIT_VARIANTS} from '../src/game/tracks/trackReverseVariant.js';

const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
  const [{createTrack,TRACK_REGISTRY},environment,runtime]=await Promise.all([
    vite.ssrLoadModule('/src/game/tracks/trackRegistry.js'),
    vite.ssrLoadModule('/src/game/tracks/environmentRegistry.js'),
    vite.ssrLoadModule('/src/game/scenes/raceEnvironmentRuntime.js')
  ]);
  const {resolveTrackEnvironmentId,createTrackEnvironment,getTrackEnvironmentKeys}=environment;
  const {envFor}=runtime;
  const scenes=(id)=>({trackKey:id,track:createTrack(id),_imageNativePrepared:{}});
  let pairs=0;
  for(const {base,alternate} of CLOSED_CIRCUIT_VARIANTS){
    if(!TRACK_REGISTRY[base])continue;
    assert.ok(TRACK_REGISTRY[alternate],alternate+' should have a playable reverse circuit');
    const baseId=resolveTrackEnvironmentId(base);
    const reversedId=resolveTrackEnvironmentId(alternate);
    assert.equal(reversedId,baseId,alternate+' must resolve the SAME authored environment');
    assert.ok(!getTrackEnvironmentKeys().includes(alternate),'do not duplicate Environment Studio projects');
    const original=createTrackEnvironment(base),reverse=createTrackEnvironment(alternate);
    assert.ok(original&&reverse,base+' original owner file missing');
    assert.deepEqual(reverse,original,alternate+' must copy original environment without modifications');
    assert.notStrictEqual(reverse,original,'registry must clone objects so race can mutate safely');
    const normalRuntime=envFor(scenes(base)),reverseRuntime=envFor(scenes(alternate));
    assert.ok(normalRuntime&&reverseRuntime,alternate+' did not load collisions into the race');
    assert.deepEqual(reverseRuntime,normalRuntime,alternate+' race runtime must keep every collider, solid zone, advertisement and decal');
    assert.ok((reverseRuntime.collisionLines?.length||0)+(reverseRuntime.collisionZones?.length||0)>0,
      alternate+' loaded an empty collision environment');
    const normalSegmentCount=(normalRuntime.collisionLines||[]).reduce((sum,line)=>sum+Math.max(0,sampleCollisionLine(line,18).length-1),0);
    const inverseSegmentCount=(reverseRuntime.collisionLines||[]).reduce((sum,line)=>sum+Math.max(0,sampleCollisionLine(line,18).length-1),0);
    assert.ok(normalSegmentCount>0,base+' lacks sampled owner barriers');
    assert.equal(inverseSegmentCount,normalSegmentCount,'actual collider segment count differs');
    assert.equal((reverseRuntime.collisionZones||[]).filter(z=>!!compileCollisionZone(z)).length,
      (normalRuntime.collisionZones||[]).filter(z=>!!compileCollisionZone(z)).length);
    if(base.includes('canarias-4096'))assert.equal(reverseRuntime.trackId,'karting-canarias-4096','no legacy x2.5 projection for native 4096');
    if(base==='circuito-atlantico')assert.equal(reverseRuntime.coordinateSpace,'race-world','keep already scaled Atlantic owner geometry');
    if(base==='karting-tenerife')assert.deepEqual(reverseRuntime.advertising,normalRuntime.advertising,'same sponsor slots in both directions');
    pairs++;
  }
  assert.ok(pairs>=5,'expected all five closed circuits to be verified');
  const noPreview=envFor({trackKey:'karting-tenerife-studio',_imageNativePrepared:{},track:{meta:{id:'karting-tenerife-studio',localPreview:true,source:'trackstudio-image-native'}}});
  assert.equal(noPreview,null,'local TrackStudio previews MUST remain isolated');
  assert.equal(envFor({trackKey:'photo-user-import',_imageNativePrepared:{},track:{meta:{id:'photo-user-import'}}}),null,
    'unknown photo imports must not inherit official collisions');
  assert.equal(resolveTrackEnvironmentId('rally-arafo-los-loros'),'rally-arafo-los-loros','RALLY 1.0 unchanged');
  console.log('PASS: '+pairs+' original/reverse pairs load the SAME owner-authored colliders, solid zones, sponsor assets and photos without duplicates or changed map scaling.');
}finally{
  await vite.close();
}
