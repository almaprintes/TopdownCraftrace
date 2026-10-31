// SERVER / GitHub Actions ONLY: real factory physics without trusting client overrides.
// No storage, auth, leaderboard or production side effects. NOT an anticheat verdict.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CAR_SPECS} from '../game/cars/carSpecs.js';

const filePath=path=>new URL('../../'+path,import.meta.url);
const readSource=(p,overrides)=>overrides?.[p]??readFileSync(filePath(p));
function gitBlobSha(src){
 const body=Buffer.isBuffer(src)?src:Buffer.from(src);
 return createHash('sha1').update(Buffer.from('blob '+body.length+'\0')).update(body).digest('hex');
}
const round=n=>Math.round(n*1000)/1000;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function buildShadowPhysicsRegistry({
 manifest=JSON.parse(readFileSync(filePath('config/online-trusted-physics.json'),'utf8')),
 sourceOverrides=null,catalog=CAR_SPECS
}={}){
 if(manifest?.schema!==1||manifest.authority!=='trusted-repository-physics-sources'||
    manifest.scope!=='SHADOW_ONLY_NO_PRODUCTION_PHYSICS_VERIFICATION'||
    manifest.physicsRevision!==null||manifest.serverEquipmentEvidence!==false||
    manifest.factorMaxFwdFromResolver!==1.4||
    manifest.cuperDevMaxFwdFactor!==1.2)
   throw Error('Unapproved trusted physics manifest');
 const pins=manifest.sourceGitBlobSha1;
 if(!pins||Object.keys(pins).length!==5)
   throw Error('Missing pinned official physics sources');
 for(const [name,sha] of Object.entries(pins)){
   if(!/^[0-9a-f]{40}$/.test(sha)||gitBlobSha(readSource(name,sourceOverrides))!==sha)
     throw Error('OFFICIAL PHYSICS DRIFT '+name+': create new approved edition');
 }
 const overrides=JSON.parse(readSource('public/assets/data/car_overrides.json',sourceOverrides).toString());
 if(overrides.schema_version!==1||!overrides.cars||typeof overrides.cars!=='object')
   throw Error('Unrecognized official car overrides');
 const ids=Object.keys(catalog).sort();
 if(ids.length!==manifest.expectedCarCount)
   throw Error('Official car roster changed: edition approval required');
 for(const id of Object.keys(overrides.cars))
   if(!Object.prototype.hasOwnProperty.call(catalog,id))
     throw Error('Unexpected published car override '+id);
 const cars={};
 for(const id of ids){
   const src=catalog[id];
   if(src?.id!==id)throw Error('Invalid factory identity '+id);
   const spec={...src,...(overrides.cars[id]||{})};
   for(const name of ['maxFwd','maxRev','accel','brakeForce','linearDrag','turnRate'])
     if(!finite(spec[name]))throw Error('Invalid official '+id+'.'+name);
   cars[id]=Object.freeze({
     id, factoryMaxFwdPxps:round(spec.maxFwd),
     factoryAccelPxps2:round(spec.accel),
     referenceMaxFwdPxps:round(spec.maxFwd*manifest.factorMaxFwdFromResolver*
       (id==='crown_cuper'?manifest.cuperDevMaxFwdFactor:1)),
     profile:spec.handlingProfile||spec.steeringProfile||'ARCADE'
   });
 }
 return Object.freeze({
  status:'shadow',physicsRevision:null,cars:Object.freeze(cars),
  baselineSha256:createHash('sha256').update(JSON.stringify(cars)).digest('hex'),
  sourcePins:Object.freeze({...pins})
 });
}

/**
 * A diagnostic only: the positions, car ID and garage tuning can all be
 * forged. Never issue verified, accepted, rejected, bans or mutations here.
 * Factory values are a comparison baseline, NOT player-specific limits.
 */
export function shadowReviewCarMotion({registry,ghost,claimedTuning=null,claimedCarId=null}={}){
 if(registry?.status!=='shadow'||registry?.physicsRevision!==null||!registry.cars)
   return {status:'unsupported',reasons:['trusted_physics_missing']};
 const id=String(ghost?.carId||'');
 if(!Object.prototype.hasOwnProperty.call(registry.cars,id))
   return {status:'unsupported',reasons:['unknown_or_unproven_car_identity']};
 const samples=ghost?.samples;
 if(!Array.isArray(samples)||samples.length<2||samples.length>20000||
    !Number.isInteger(ghost?.lapMs)||ghost.lapMs<1001||
    samples.some((s,i)=>!Number.isFinite(s?.t)||!Number.isFinite(s?.x)||
       !Number.isFinite(s?.y)||s.t<0||s.t>ghost.lapMs||
       (i>0&&s.t<=samples[i-1].t))||samples.at(-1).t!==ghost.lapMs)
   return {status:'invalid-synthetic',reasons:['malformed_recording']};
 let rawPeak=0,windowPeak=0,shortGaps=0,start=0;
 for(let i=1;i<samples.length;i++){
   const a=samples[i-1],b=samples[i],dt=b.t-a.t;
   rawPeak=Math.max(rawPeak,1000*distance(a,b)/dt);
   if(dt<8)shortGaps++;
   while(start+1<i&&b.t-samples[start+1].t>=100)start++;
   const wdt=b.t-samples[start].t;
   if(wdt>=100)windowPeak=Math.max(windowPeak,1000*distance(b,samples[start])/wdt);
 }
 const baseline=registry.cars[id].referenceMaxFwdPxps;
 const reasons=['server_equipment_and_physics_provenance_missing'];
 if(windowPeak>Math.max(2500,baseline*4))
   reasons.push('movement_needs_review_not_evidence_of_cheating');
 void claimedTuning;
 void claimedCarId;
 return {
   status:'shadow-pending',reasons,
   diagnostics:{
     carId:id,sampleCount:samples.length,baselineSha256:registry.baselineSha256,
     source:'trusted_repository_factory_reference_only',
     referenceMaxFwdPxps:baseline,
     observedInstantPeakPxps:Math.round(rawPeak),
     observed100msPeakPxps:Math.round(windowPeak),
     shortTimestampGaps:shortGaps,
     ratioVsFactory:Math.round(100*windowPeak/Math.max(1,baseline))/100
   }
 };
}
