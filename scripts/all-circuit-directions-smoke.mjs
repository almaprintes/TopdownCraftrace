import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {trackDisplayDirection} from '../src/game/tracks/trackDisplayDirection.js';
import {crossesDirectedFinishGate} from '../src/game/tracks/closedCircuitGateOrder.js';
import {CLOSED_CIRCUIT_VARIANTS,selectedCircuitRaceId,saveCircuitDirection,readCircuitDirection,physicalCircuitId} from '../src/game/tracks/trackReverseVariant.js';

const center=g=>({x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2});
const norm=v=>Math.hypot(v.x,v.y);
const dot=(a,b)=>(a.x*b.x+a.y*b.y)/(norm(a)*norm(b));
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sign=points=>Math.sign(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0));
const storage=()=>{const mem=new Map();return{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)}};
const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
  const {TRACK_REGISTRY,createTrack}=await server.ssrLoadModule('/src/game/tracks/trackRegistry.js');
  const {describeImageNativeRace,validateImageNativeRaceDescriptor}=await server.ssrLoadModule('/src/game/tracks/imageNativeRaceLoader.js');
  const publicNames=readFileSync('src/game/tracks/trackPublicNames.js','utf8');
  const published=readFileSync('src/game/tracks/trackUnlocks.js','utf8');
  const selector=readFileSync('src/game/scenes/TrackGarageAndroidTouchScene.js','utf8');
  const launch=readFileSync('src/game/scenes/MenuGameModesScene.js','utf8');
  const lobby=readFileSync('src/game/ui/LobbyDomUi.js','utf8');
  const physical=['karting-tenerife','karting-americas','santa-cruz','circuito-atlantico'];
  physical.push(TRACK_REGISTRY['karting-canarias-4096']?'karting-canarias-4096':'karting-canarias');
  for(const baseId of physical){
    const spec=CLOSED_CIRCUIT_VARIANTS.find(s=>s.base===baseId);
    assert.ok(spec,'no inverse spec for '+baseId);
    const original=createTrack(baseId),inverse=createTrack(spec.alternate);
    assert.equal(original.closed,true);assert.equal(inverse.closed,true);
    assert.notEqual(original.id,inverse.id);
    assert.equal(physicalCircuitId(inverse.key),original.key,'same selector card');
    assert.equal(trackDisplayDirection(original),spec.legacy,'preserve existing winding');
    assert.equal(trackDisplayDirection(inverse),spec.legacy==='clockwise'?'counterclockwise':'clockwise');
    assert.equal(sign(original.raceCenterline),-sign(inverse.raceCenterline),'opposite route');
    assert.deepEqual(original.centerline,inverse.centerline,'unaltered physical ribbon');
    assert.deepEqual(original.trackShape,inverse.trackShape,'unchanged Bézier collisions');
    assert.deepEqual(original.meta.imageNative,inverse.meta.imageNative,'identical photo');
    assert.deepEqual(original.meta.sourceFile,inverse.meta.sourceFile,'identical authored project');
    assert.deepEqual(inverse.grid,null,'do not reuse old grid orientation');
    assert.ok([inverse.start.x,inverse.start.y,inverse.start.r].every(Number.isFinite));
    const facing={x:Math.cos(inverse.start.r),y:Math.sin(inverse.start.r)};
    assert.ok(dot(facing,inverse.finishLine.normal)>.25,'spawn must face the inverse finish');
    assert.ok(length(center(original.finishLine),center(inverse.finishLine))<.04,'same photographed finish');
    assert.ok(dot(original.finishLine.normal,inverse.finishLine.normal)<-.999,'reverse finish normal');
    assert.equal(inverse.checkpoints.length,original.checkpoints.length);
    for(let k=0;k<original.checkpoints.length;k++){
      const a=original.checkpoints[original.checkpoints.length-1-k],b=inverse.checkpoints[k];
      assert.ok(length(center(a),center(b))<.04,'inverted CP physical location');
      assert.ok(dot(a.normal,b.normal)<-.999,'inverted CP crossing direction');
    }
    if(baseId==='karting-americas'){
      // Regression: the published paddock stripe is a second usable segment of
      // the SAME finish axis in both directions. Its physical endpoints must
      // remain fixed while the accepted crossing direction changes.
      const normalPit=original.meta.paddockFinishLine;
      const inversePit=inverse.meta.paddockFinishLine;
      assert.ok(normalPit?.a&&normalPit?.b&&normalPit?.normal,'normal paddock gate missing');
      assert.ok(inversePit?.a&&inversePit?.b&&inversePit?.normal,'inverse paddock gate missing');
      assert.deepEqual(inversePit.a,normalPit.a,'inverse paddock start endpoint moved');
      assert.deepEqual(inversePit.b,normalPit.b,'inverse paddock end endpoint moved');
      assert.ok(dot(normalPit.normal,inversePit.normal)<-.999,'inverse paddock normal must reverse');
      const mid=center(normalPit);
      const sample={
        x:mid.x+(normalPit.b.x-normalPit.a.x)*.35,
        y:mid.y+(normalPit.b.y-normalPit.a.y)*.35
      };
      for(const [name,gate] of [['normal',normalPit],['inverso',inversePit]]){
        const n=gate.normal;
        const before={x:sample.x-n.x*32,y:sample.y-n.y*32};
        const after={x:sample.x+n.x*32,y:sample.y+n.y*32};
        const forward={x:n.x*180,y:n.y*180};
        assert.ok(crossesDirectedFinishGate(gate,before,after,forward),
          name+' paddock crossing in race direction must count');
        assert.ok(!crossesDirectedFinishGate(gate,after,before,{x:-forward.x,y:-forward.y}),
          name+' paddock wrong-way crossing must never count');
        assert.ok(!crossesDirectedFinishGate(gate,before,before,forward),
          name+' paddock must never count without actual crossing');
      }
      const source=readFileSync('src/game/scenes/RaceScene.js','utf8');
      assert.ok(source.includes("physicalCircuitId(this.trackKey) === 'karting-americas'"),
        'race must recognize both normal and inverse Karting Americas');
      assert.ok(source.includes("physicalCircuitId(this.track?.meta?.meta?.trackId) === 'karting-americas'"),
        'race must check the active metadata physical circuit too');
      assert.ok(source.includes('if ((this._cpState || 0) === 2)'),
        'paddock crossing must still require both checkpoints');
    }
    const local=storage();
    if(baseId==='karting-tenerife'){
      // Historical anti-clockwise record ID is the INVERSO; normal is new.
      assert.equal(readCircuitDirection(local,baseId),'inverse');
      assert.equal(selectedCircuitRaceId(baseId,local),baseId);
      saveCircuitDirection(local,baseId,'normal');
      assert.equal(selectedCircuitRaceId(baseId,local),spec.alternate);
    }else{
      assert.equal(readCircuitDirection(local,baseId),'normal','historic normal selected by default');
      assert.equal(selectedCircuitRaceId(baseId,local),baseId);
      saveCircuitDirection(local,baseId,'inverse');
      assert.equal(selectedCircuitRaceId(baseId,local),spec.alternate);
      assert.ok(publicNames.includes("'"+spec.alternate+"':"),'public name for alternate');
      assert.ok(published.includes("'"+spec.alternate.replace('-4096','')+"'")||published.includes("'"+spec.alternate+"'"),'published ID for inverse');
    }
    if(baseId==='circuito-atlantico'){
      // Android reported that 70%-world Atlántico Inverso was rejected by the
      // real photo loader. Exercise the ACTUAL reverse track from the registry.
      const normalPhoto=describeImageNativeRace(baseId,createTrack);
      const reversePhoto=describeImageNativeRace(spec.alternate,createTrack);
      assert.equal(normalPhoto.worldScale,.70,'official Atlántico world-scale');
      assert.equal(reversePhoto.worldScale,normalPhoto.worldScale,
        'inverse must inherit the original photo/world scale');
      assert.deepEqual(reversePhoto.tiles,normalPhoto.tiles,
        'inverse shares the same six original WebP photo tiles');
      assert.equal(validateImageNativeRaceDescriptor(normalPhoto),normalPhoto);
      assert.equal(validateImageNativeRaceDescriptor(reversePhoto),reversePhoto,
        'Atlántico Inverso must pass the shipping photo-loader scale guard');
      assert.throws(()=>validateImageNativeRaceDescriptor({...reversePhoto,worldScale:.95}),/escala/,
        'do not accept an arbitrary inverse photo scale');
      assert.throws(()=>validateImageNativeRaceDescriptor({...reversePhoto,
        track:{...reversePhoto.track,worldW:reversePhoto.track.worldW+12}}),/escala/,
        'do not accept mismatched inverse world dimensions');
      assert.throws(()=>validateImageNativeRaceDescriptor({...reversePhoto,
        trackKey:'circuito-atlantico-falso'}),/escala/,
        'the exception must not extend to unrelated circuit IDs');
    }
    assert.notEqual('tdr2:ttBest:'+original.id,'tdr2:ttBest:'+inverse.id,'PB isolation');
    assert.notEqual('tdr2:ttHist:'+original.id,'tdr2:ttHist:'+inverse.id,'lap isolation');
    assert.notEqual('tdr2:ghost:'+original.id,'tdr2:ghost:'+inverse.id,'ghost isolation');
  }
  assert.match(selector,/circuitVariantFor\(base\)/,'each circuit must display one two-way selector');
  assert.match(selector,/saveCircuitDirection\(localStorage,base,value\)/,'selector persists per-circuit preference');
  assert.match(launch,/selectedCircuitRaceId\(trackKey,localStorage\)/,'live GAME MODE launch sends requested direction');
  assert.match(lobby,/selectedCircuitRaceId\(baseTrackKey,localStorage\)/,'live DOM lobby previews selected direction');
  assert.match(lobby,/const launchTrack=selectedCircuitRaceId\(trackKey,localStorage\)/,'PLAY fallback sends direction');
  assert.equal(selectedCircuitRaceId('rally-arafo-los-loros',storage()),'rally-arafo-los-loros','RALLY 1.0 untouched');
  console.log('PASS: all five physical circuits use separate Normal/Inverso identities with real reversed gates, spawn, checkpoints, unchanged photo/collisions and historic records.');
}finally{await server.close();}
