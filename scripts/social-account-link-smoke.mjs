import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const raw=readFileSync(new URL('../src/game/social/socialAccountLink.js',import.meta.url),'utf8');
const events=[];
let account={id:'social-uuid',anonymous:false,socialProviders:['google']};
let backup={id:'social-uuid',existing:false};
let existingProfile=null;
let pilotName='JUANFRAN',snapshot={data:{'tdr2:garageFusion:v1':{coins:750}}};
const state=new Map([['tdr2:pilotRankingLocalLocation:v1',JSON.stringify({
  continentCode:'EU',countryCode:'ES',regionCode:'ES-CN'
})]]);
globalThis.localStorage={getItem:k=>state.get(k)||null};
const source=raw
 .replace(/^import \{currentRaceControlAccount,[\s\S]*?from '\.\.\/online\/raceControlOnline\.js';/m,
  'const currentRaceControlAccount=async()=>account;const getMyRaceControlProfile=async()=>existingProfile;const claimRaceControlPilotNick=async(n)=>{events.push("claim:"+n);};const syncRaceControlProfile=async(p)=>{events.push("geo:"+p.regionCode);};')
 .replace(/^import \{getPilotProfile\} from '\.\/pilotProfile\.js';/m,'const getPilotProfile=()=>({name:pilotName});')
 .replace(/^import \{localProgressSnapshot,cloudBackupStatus,createFirstCloudBackup\} from '\.\/cloudProgress\.js';/m,
  'const localProgressSnapshot=()=>snapshot;const cloudBackupStatus=async()=>backup;const createFirstCloudBackup=async()=>{events.push("backup");return {id:account.id,verified:true,revision:1,keys:1};};')
 .replace(/^import \{resolveRaceRankingLocation\} from '\.\/pilotRankingGeography\.js';/m,
  'const resolveRaceRankingLocation=x=>({continentCode:x.continentCode,countryCode:x.countryCode,regionCode:x.regionCode});');
assert.doesNotMatch(source,/^import /m,'mocks must remove all dependencies');
const {assessSocialLink,protectLocalSaveAfterSocialSignIn}=await import(
  'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
);
const args=()=>({account,backup,pilotName,onlineProfile:existingProfile});
assert.equal(assessSocialLink(args()).status,'ready');
await assert.rejects(protectLocalSaveAfterSocialSignIn(),/Confirma/);
assert.equal(events.length,0,'no implicit cloud mutations');
backup={...backup,existing:true};
assert.equal((await protectLocalSaveAfterSocialSignIn({playerConfirmed:true})).status,'existing-cloud-save');
assert.equal(events.length,0,'a pre-existing backup must not be overwritten');
backup={...backup,existing:false};
existingProfile={nick:'OTRO'};
assert.equal((await protectLocalSaveAfterSocialSignIn({playerConfirmed:true})).status,'pilot-mismatch');
assert.equal(events.length,0,'a different online nick is preserved');
existingProfile=null;account={...account,socialProviders:[],anonymous:false};
await assert.rejects(protectLocalSaveAfterSocialSignIn({playerConfirmed:true}),/Google o Apple/);
assert.equal(events.length,0,'legacy auth is not a social login');
account={...account,socialProviders:['apple']};
backup={...backup,id:'someone-else'};
await assert.rejects(protectLocalSaveAfterSocialSignIn({playerConfirmed:true}),/no coincide/);
backup={id:'social-uuid',existing:false};
state.set('tdr2:cloudLoginPendingRestore:v1','social-uuid');
assert.equal((await protectLocalSaveAfterSocialSignIn({playerConfirmed:true})).status,'pending-restore');
assert.equal(events.length,0,'never upload pending-restore local data');
state.delete('tdr2:cloudLoginPendingRestore:v1');
assert.deepEqual(await protectLocalSaveAfterSocialSignIn({playerConfirmed:true}),{
  status:'protected',accountId:'social-uuid',revision:1,keys:1
});
assert.deepEqual(events,['claim:JUANFRAN','geo:ES-CN','backup']);
assert.equal(snapshot.data['tdr2:garageFusion:v1'].coins,750);
console.log('PASS: social account link handoff checks 8 guards, conflicts and verified first backup (mocked; no live OAuth).');
