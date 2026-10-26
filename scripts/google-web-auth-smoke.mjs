import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};};
globalThis.localStorage=memory();globalThis.sessionStorage=memory();
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
let target,existing=null,accepted=0,requests=0,googleKnown=true;
globalThis.location={origin:'https://almaprintes.github.io',pathname:'/TopdownCraftrace/dev/',assign:u=>target=new URL(u)};
globalThis.__googleMock={has:()=>!!existing,id:()=>existing,googleId:()=>googleKnown?existing:null,accept:async()=>{accepted++;}};
let source=read('src/game/online/googleWebAuth.js')
 .replace(/^import .*backendConfig.js';/m,"const playerBackendConfig=()=>({url:'https://backend.invalid',key:'public'});")
 .replace(/^import .*raceControlOnline.js';/m,'const hasSavedRaceControlSession=()=>__googleMock.has(),savedGoogleWebIdentity=()=>__googleMock.googleId(),savedRaceControlIdentity=()=>__googleMock.id(),activateRaceControlOnline=async()=>({session:{access_token:"old-token"}}),currentRaceControlAccount=async()=>({id:__googleMock.id(),socialProviders:[]}),acceptGoogleWebSession=(...args)=>__googleMock.accept(...args);');
const auth=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
globalThis.fetch=async(url,options)=>{
 requests++;assert.equal(url,'https://backend.invalid/auth/v1/token?grant_type=pkce');
 assert.equal(options.referrerPolicy,'no-referrer');
 const body=JSON.parse(options.body);assert.equal(body.code_verifier.length,64);
 return {ok:true,json:async()=>({})};
};
const pendingKey='tdr2:googlePkce:v1';
const start=async()=>{await auth.startGoogleWebSignIn();const p=JSON.parse(sessionStorage.getItem(pendingKey));return {code:'single-use-code',state:p.nonce};};
let callback=await start();
assert.equal(target.searchParams.get('provider'),'google');
assert.equal(target.searchParams.get('code_challenge_method'),'s256');
const pending=JSON.parse(sessionStorage.getItem(pendingKey));
assert.equal(target.searchParams.get('code_challenge'),Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(pending.verifier))).toString('base64url'));
assert.equal((await auth.completeGoogleWebSignIn(callback)).ok,true);
assert.equal(accepted,1);assert.equal(requests,1);assert.equal(sessionStorage.getItem(pendingKey),null);
assert.equal((await auth.completeGoogleWebSignIn(callback)).ok,false,'replay rejected');
for(const alter of [p=>p.state='wrong',p=>p.error='access_denied',p=>p.code='']){
 callback=await start();alter(callback);assert.equal((await auth.completeGoogleWebSignIn(callback)).ok,false);
}
callback=await start();const expired=JSON.parse(sessionStorage.getItem(pendingKey));expired.createdAt-=610000;sessionStorage.setItem(pendingKey,JSON.stringify(expired));
assert.equal((await auth.completeGoogleWebSignIn(callback)).ok,false);
assert.equal(requests,1,'bad callbacks never exchange');
callback=await start();existing='changed-account';assert.equal((await auth.completeGoogleWebSignIn(callback)).ok,false);existing=null;
const set=sessionStorage.setItem;sessionStorage.setItem=()=>{throw Error('quota');};await assert.rejects(start);sessionStorage.setItem=set;
location.pathname='/TopdownCraftrace/dev-live/';assert.equal(auth.googleWebAvailable(),false);await assert.rejects(start);location.pathname='/TopdownCraftrace/dev/';
// Existing anonymous identity uses authenticated manual linking, never signup.
existing='legacy-id';googleKnown=false;
globalThis.fetch=async(url,options)=>{
 assert.ok(url.startsWith('https://backend.invalid/auth/v1/user/identities/authorize?'));
 assert.equal(options.headers.Authorization,'Bearer old-token');
 assert.equal(new URL(url).searchParams.get('skip_http_redirect'),'true');
 return {ok:true,json:async()=>({url:'https://accounts.google.com/o/oauth2/v2/auth?state=server-state'})};
};
await start();assert.equal(target.hostname,'accounts.google.com');
assert.equal(JSON.parse(sessionStorage.getItem(pendingKey)).expectedId,'legacy-id');
assert.equal(JSON.parse(sessionStorage.getItem(pendingKey)).linking,true);
globalThis.fetch=async()=>({ok:false,json:async()=>({code:'manual_linking_disabled'})});
await assert.rejects(start,/Allow manual linking/);
assert.equal(sessionStorage.getItem(pendingKey),null);
existing=null;googleKnown=true;
// Verify URL scrubbing occurs in the HTML before any other scripts/resources.
const html=read('index.html');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
let replaced;const window={};
runInNewContext(script,{URL,URLSearchParams,window,location:{href:location.origin+location.pathname+'?code=private-code&tdr_state=nonce#access_token=secret'},history:{replaceState:(_a,_b,u)=>replaced=u}});
assert.equal(replaced,location.pathname);assert.equal(window.__tdrGoogleCallback.error,true);
assert.ok(html.indexOf('name="referrer"')<html.indexOf('tdr-startup-diagnostics'));
// Exercise the real session installer against mocked transport, not a mocked installer.
source=read('src/game/online/raceControlOnline.js')
 .replace(/^import .*;$/gm,'')
 .replace('let api=null;',"const playerBackendConfig=()=>({url:'https://backend.invalid',key:'public'});let api=null;");
const online=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const session={access_token:'access',refresh_token:'refresh',expires_in:3600,user:{id:'google-id'},provider_token:'DO-NOT-SAVE',provider_refresh_token:'DO-NOT-SAVE'};
let user={id:'google-id',is_anonymous:false,identities:[{provider:'google'}],email:'test@example.invalid'};
globalThis.fetch=async()=>({ok:true,json:async()=>user});
localStorage.setItem('tdr2:garageFusion:v1','{"coins":750}');localStorage.setItem('tdr2:pilotProfile:v1','{"name":"JUANFRAN"}');
await online.acceptGoogleWebSession(session);
assert.equal(localStorage.getItem('tdr2:garageFusion:v1'),'{"coins":750}');
assert.equal(localStorage.getItem('tdr2:pilotProfile:v1'),'{"name":"JUANFRAN"}');
assert.equal(localStorage.getItem('tdr2:cloudLoginPendingRestore:v1'),'google-id');
assert.doesNotMatch(localStorage.getItem('tdr2:onlineSession:v1'),/DO-NOT-SAVE/);
await assert.rejects(online.acceptGoogleWebSession(session),'cannot replace an existing identity');
user={...user,id:'another-id'};await assert.rejects(online.acceptGoogleWebSession({...session,user:{id:'another-id'}},'google-id'));
user={...user,id:'google-id',is_anonymous:true};await assert.rejects(online.acceptGoogleWebSession(session,'google-id'));
assert.equal(JSON.parse(localStorage.getItem('tdr2:onlineSession:v1')).user.id,'google-id');
console.log('PASS Google web: S256, nonce, replay, expiry, cancellation, changed account, storage failure, URL/token privacy, verified UUID and JUANFRAN preservation. Mocked transport; no live Google consent.');
// Test the real cloud write guard: only the confirmed first-copy path may
// bypass its matching social marker; updates and another UUID cannot.
let savedSnapshot=null,writeCount=0;
Object.defineProperty(localStorage,'length',{get(){return this.map.size;}});
localStorage.key=i=>[...localStorage.map.keys()][i];
globalThis.__cloudMock={
 save:async(_identity,snapshot,revision)=>{assert.equal(revision,0);writeCount++;savedSnapshot=snapshot;return {saved:true,revision:1};},
 read:async()=>({revision:1,snapshot:savedSnapshot})
};
source=read('src/game/social/cloudProgress.js').replace(/^import .*;$/gm,'');
source="const registerPlugin=()=>({});const activateRaceControlOnline=async()=>({session:{user:{id:'google-id'},access_token:'access'}});const createPlayerProgressRepository=()=>globalThis.__cloudMock;\n"+source;
const cloud=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
await assert.rejects(cloud.createFirstCloudBackup());
await assert.rejects(cloud.updateCloudBackup(1));
await assert.rejects(cloud.createFirstCloudBackup({socialAccountId:'wrong'}));
assert.equal(writeCount,0);
assert.equal((await cloud.createFirstCloudBackup({socialAccountId:'google-id'})).verified,true);
assert.equal(writeCount,1);
assert.ok(!Object.keys(savedSnapshot.data).some(k=>/Session|Pending|Pkce/.test(k)));
assert.equal(savedSnapshot.data['tdr2:garageFusion:v1'].coins,750);
console.log('PASS cloud guard: pending Google login blocks updates and wrong UUID; explicit revision-zero backup verifies readback without exporting tokens.');
