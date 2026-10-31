import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {buildShadowPhysicsRegistry,shadowReviewCarMotion}
 from '../src/server/trustedVehiclePhysics.js';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';

const manifest=JSON.parse(readFileSync('config/online-trusted-physics.json','utf8'));
const registry=buildShadowPhysicsRegistry();
assert.equal(registry.status,'shadow');
assert.equal(registry.physicsRevision,null);
assert.equal(Object.keys(registry.cars).length,manifest.expectedCarCount);
assert.match(registry.baselineSha256,/^[0-9a-f]{64}$/);
assert.equal(registry.cars.avenir_gripline.factoryMaxFwdPxps,558);
assert.equal(registry.cars.helix_spark.factoryMaxFwdPxps,520);
assert.equal(registry.cars.crown_cuper.referenceMaxFwdPxps,
 Math.round(CAR_SPECS.crown_cuper.maxFwd*1.4*1.2*1000)/1000);
function ghost({carId='avenir_gripline',jump=0,jitter=false}={}){
 const samples=Array.from({length:160},(_,i)=>({
   t:i*50+(jitter&&i===21?-49:0),
   x:i*9+(i===150?jump:0),y:123,r:0
 }));
 return {carId,lapMs:samples.at(-1).t,samples};
}
const clean=ghost(),a=shadowReviewCarMotion({registry,ghost:clean});
assert.equal(a.status,'shadow-pending');
assert.deepEqual(a.reasons,['server_equipment_and_physics_provenance_missing']);
assert.deepEqual(
 shadowReviewCarMotion({registry,ghost:clean,claimedCarId:'veloce_photon',
  claimedTuning:{maxFwdAdd:999999,accelMult:999}}),a);
const jitter=shadowReviewCarMotion({registry,ghost:ghost({jitter:true})});
assert.equal(jitter.status,'shadow-pending');
assert.equal(jitter.diagnostics.shortTimestampGaps,1);
assert.deepEqual(jitter.reasons,a.reasons);
const teleport=shadowReviewCarMotion({registry,ghost:ghost({jump:1500})});
assert.equal(teleport.status,'shadow-pending');
assert.ok(teleport.reasons.includes('movement_needs_review_not_evidence_of_cheating'));
assert.ok(teleport.diagnostics.observed100msPeakPxps>2500);
assert.equal(shadowReviewCarMotion({registry,ghost:ghost({carId:'new_unapproved'})}).status,
 'unsupported');
const wrong=ghost();wrong.samples[3].t=wrong.samples[2].t;
assert.equal(shadowReviewCarMotion({registry,ghost:wrong}).status,'invalid-synthetic');

const overrides=readFileSync('public/assets/data/car_overrides.json');
const changed=Buffer.from(overrides.toString().replace('"maxFwd": 520.0','"maxFwd": 9999.0'));
assert.notDeepEqual(changed,overrides);
assert.throws(()=>buildShadowPhysicsRegistry({sourceOverrides:{
 'public/assets/data/car_overrides.json':changed
}}),/OFFICIAL PHYSICS DRIFT/);
assert.throws(()=>buildShadowPhysicsRegistry({sourceOverrides:{
 'src/game/cars/carSpecs.js':Buffer.concat([
  readFileSync('src/game/cars/carSpecs.js'),Buffer.from('\n// silent drift')])
}}),/OFFICIAL PHYSICS DRIFT/);
const fake=structuredClone(manifest);fake.serverEquipmentEvidence=true;
assert.throws(()=>buildShadowPhysicsRegistry({manifest:fake}),/Unapproved/);
console.log('PASS: '+manifest.expectedCarCount+' real factory car baselines + deployed official overrides pinned');
console.log('PASS: Cuper DEV power, forged client tuning, new car, jitter and teleport shadow tests');
console.log('PASS: source drift demands approval, no player positions can yield VERIFIED');
console.log('BASELINE '+registry.baselineSha256);
if(process.env.GITHUB_STEP_SUMMARY)
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,
 '\n## Car physics — shadow-only\n'+
 '- Factory specs, published overrides, resolver, Garage Fusion and Cuper are pinned.\n'+
 '- Valid-looking position ghosts remain unverified without trusted equipment and input replay.\n'+
 '- No player or production data, no additional dependencies, no ads.\n');
