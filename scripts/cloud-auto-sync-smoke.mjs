// Node smoke for bounded autosync. No real Supabase calls or account mutations.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const policy=read('src/game/social/cloudAutoSync.js');
const progress=read('src/game/social/cloudProgress.js');
const startup=read('src/main.js');
const nav=read('src/game/game.js');
const account=read('src/game/social/cloudAccountUi.js');
assert.match(startup,/installCloudAutoSync\(\)/);
assert.match(nav,/tdr:cloud-checkpoint/);
assert.match(nav,/__tdrCloudRaceActive/);
assert.match(progress,/cloudConfirmedMarker/);
assert.match(progress,/cloudDataDigest/);
assert.match(progress,/updateCloudBackupAutomatically/);
assert.match(progress,/store\.save\(identity,snapshot,expectedRevision\)/);
assert.match(progress,/if\(!row\?\.saved\)/);
assert.match(progress,/saveBackup\(revision\)/,'manual backup preserves full readback');
assert.match(account,/Sincronización automática/);
assert.match(policy,/AUTO_CLOUD_MIN_WRITE_MS=5\*60\*1000/);
assert.match(policy,/cloudLoginPendingRestore/);
assert.match(policy,/document\.getElementById\('tdr-cloud-account-modal'\)/);

const listeners=new Map(),timers=[],intervals=[];
const realSetImmediate=globalThis.setImmediate;
globalThis.setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length;};
globalThis.setInterval=(fn,delay)=>{intervals.push({fn,delay});return intervals.length;};
globalThis.window={
  __tdrCloudRaceActive:false,
  addEventListener(name,fn){listeners.set(name,[...(listeners.get(name)||[]),fn]);},
  dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);},
};
globalThis.Event=class Event{constructor(type){this.type=type;}};
globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,args){super(type);this.detail=args?.detail;}};
globalThis.document={
  hidden:false,element:null,handlers:new Map(),
  addEventListener(type,fn){this.handlers.set(type,fn);},
  getElementById(){return this.element;}
};
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
const mock={
  id:'google-id',receipt:null,local:{amount:100},remote:{amount:100},rev:2,
  statuses:0,downloads:0,uploads:0,confirmations:0,conflict:false
};
globalThis.__cloudTest=mock;
const prefix=`
const googleWebAvailable=()=>true;
const savedGoogleWebIdentity=()=>globalThis.__cloudTest.id;
const cloudConfirmedMarker=id=>globalThis.__cloudTest.receipt?.id===id?globalThis.__cloudTest.receipt:null;
const cloudDataDigest=async data=>JSON.stringify(data);
const localProgressSnapshot=()=>({data:{...globalThis.__cloudTest.local}});
const cloudBackupStatus=async()=>{const m=globalThis.__cloudTest;m.statuses++;return {id:m.id,existing:true,revision:m.rev};};
const readCloudBackup=async()=>{const m=globalThis.__cloudTest;m.downloads++;return {id:m.id,revision:m.rev,snapshot:{data:{...m.remote}}};};
const markCloudConfirmed=async(id,revision,data)=>{
 const m=globalThis.__cloudTest;m.confirmations++;
 m.receipt={id,revision,digest:JSON.stringify(data)};
 window.dispatchEvent(new Event('tdr:cloudsave-confirmed'));return true;
};
const updateCloudBackupAutomatically=async expectedRevision=>{
 const m=globalThis.__cloudTest;m.uploads++;
 if(m.conflict){const err=new Error('La nube tiene otra revisión');err.code='TDR_CLOUD_CONFLICT';throw err;}
 if(expectedRevision!==m.rev)throw new Error('stale revision');
 m.rev++;m.remote={...m.local};await markCloudConfirmed(m.id,m.rev,m.remote);
 return {saved:true,revision:m.rev};
};
`;
const source=policy.replace(/^import[\s\S]*?from '\.[^']+';\n/gm,'');
const mod=await import('data:text/javascript;base64,'+Buffer.from(prefix+source).toString('base64'));
assert.equal(mod.installCloudAutoSync(),true);
assert.equal(mod.installCloudAutoSync(),false,'install once');
async function fire(){
  assert.ok(timers.length>0,'scheduled checkpoint');
  timers.shift().fn();
  for(let i=0;i<5;i++)await new Promise(resolve=>realSetImmediate(resolve));
}
await fire();
assert.equal(mock.statuses,1);
assert.equal(mock.downloads,1);
assert.equal(mock.uploads,0,'identical old cloud save never reuploaded');
assert.equal(mock.receipt.revision,2);
mock.local.amount=110;
await fire();
assert.equal(mock.uploads,0,'5-minute cooldown after first confirmation');
assert.ok(timers.some(t=>t.delay>250000),'future write coalesced');
const before=mock.statuses;
window.__tdrCloudRaceActive=true;
window.dispatchEvent(new Event('tdr:cloud-checkpoint'));
timers.splice(0,1);
assert.equal(mock.statuses,before,'no network during active race');
window.__tdrCloudRaceActive=false;
mock.id=null;
window.dispatchEvent(new Event('tdr:cloud-checkpoint'));
if(timers.length)await fire();
assert.equal(mock.uploads,0,'guests never write');
assert.equal(intervals.length,1,'only one low-rate idle poll');
console.log('PASS: confirmed backup bootstrap, no redundant upload, cooldown, no race network and guest isolation');
