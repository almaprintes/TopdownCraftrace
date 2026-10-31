import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {buildTrustedEditionRegistry,shadowReviewOfficialRace}
 from '../src/server/raceEditionRegistry.js';
import {sampleLoopAt} from '../src/game/tracks/closedCircuitGateOrder.js';
import {encodeOnlineGhostNative,decodeOnlineGhostNative}
 from '../src/game/online/onlineGhostCodec.js';
const manifest=JSON.parse(readFileSync('config/online-trusted-editions.json','utf8'));
const source=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/track.json','utf8'));
const registry=buildTrustedEditionRegistry();
assert.deepEqual(Object.keys(registry).sort(),Object.keys(manifest.editions).sort());
for(const [id,entry] of Object.entries(registry)){
  assert.equal(entry.geometrySha256,manifest.editions[id].geometrySha256);
  assert.equal(entry.physicsRevision,null);
  assert.equal(entry.status,'shadow');
  assert.match(entry.edition,/^tenerife-/);
}
function syntheticGhost(entry){
 const clockwise=entry.id==='karting-tenerife-horario';
 const {metrics,anchorDistance}=entry.judgeGeometry;
 const number=750;
 const samples=Array.from({length:number},(_,i)=>{
   const turn=.008+i/(number-1),d=(clockwise?-turn:turn);
   const point=sampleLoopAt(metrics,anchorDistance+metrics.total*d);
   return {t:i*60,x:point.x,y:point.y,r:Math.atan2(
     clockwise?-point.tangent.y:point.tangent.y,
     clockwise?-point.tangent.x:point.tangent.x)};
 });
 return decodeOnlineGhostNative(encodeOnlineGhostNative({
  lapMs:samples.at(-1).t,trackKey:entry.id,carId:'avenir_gripline',samples
 }));
}
for(const entry of Object.values(registry)){
 const ghost=syntheticGhost(entry);
 const base={registry,trackId:entry.id,ghost};
 const verdict=shadowReviewOfficialRace(base);
 assert.equal(verdict.status,'shadow-pass',
   'Valid synthetic lap must be diagnosed, never certified: '+JSON.stringify(verdict));
 assert.equal(verdict.diagnostics.coverageBins,12);
 assert.equal(verdict.diagnostics.finishSeen,true);
 assert.equal(verdict.diagnostics.gateSequenceReached,2);
 const fakeHash=shadowReviewOfficialRace({...base,claimedGeometrySha256:'f'.repeat(64)});
 assert.deepEqual(fakeHash,verdict,'Client-supplied geometry hash cannot influence the judge');
 const historical=shadowReviewOfficialRace({...base,historical:true,
   claimedGeometrySha256:entry.geometrySha256});
 assert.equal(historical.status,'historical-unversioned',
   'Historical ghosts cannot claim server-provenance by knowing the public hash');
 assert.equal(shadowReviewOfficialRace({registry,trackId:entry.id}).status,
   'unverified-no-ghost');
 const invalid=structuredClone(ghost);
 invalid.lapMs-=1;
 assert.equal(shadowReviewOfficialRace({...base,ghost:invalid}).status,'invalid');
}
assert.equal(shadowReviewOfficialRace({registry,trackId:'karting-americas'}).status,'unsupported');
const altered=structuredClone(source);
altered.centerline[0].x+=2;
assert.throws(()=>buildTrustedEditionRegistry({trackJson:altered,manifest}),
 /OFFICIAL GEOMETRY DRIFT/,'Every official geometry edit must require manual version approval');
const forgedManifest=structuredClone(manifest);
forgedManifest.editions['karting-tenerife'].physicsRevision='v1';
assert.throws(()=>buildTrustedEditionRegistry({trackJson:source,manifest:forgedManifest}),
 /not approved/,'No automatic upgrade to physics-verified state');
console.log('PASS: trusted geometry editions frozen to 2 official Tenerife directions');
console.log('PASS: 2 valid synthetic laps remain shadow-only, not verified');
console.log('PASS: incorrect track, forged ghost, unproven historic edition, fake hashes, no-ghost PB');
console.log('PASS: any track geometry change demands explicit new edition; no player data used');
if(process.env.GITHUB_STEP_SUMMARY)
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '\n## Official geometry revision contract (SHADOW)\n'+
  '- SHA-256 frozen for Tenerife original + clockwise; edited roads fail CI.\n'+
  '- Existing unversioned ghosts are NEVER retroactively certified.\n'+
  '- Client hash ignored, time-only records not certified, no data accessed.\n'+
  '- No Supabase migrations/deploys, no player data or new dependencies.\n');
