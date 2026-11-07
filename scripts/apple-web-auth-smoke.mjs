import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=read('src/game/online/appleWebAuth.js');
const main=read('src/main.js');
const ui=read('src/game/social/cloudAccountUi.js');
assert.match(main,/completeAppleWebSignIn/);
assert.match(main,/APPLE_PENDING/);
assert.match(main,/sessionStorage\.getItem\(APPLE_PENDING\)/);
assert.match(ui,/startAppleWebSignIn/);
assert.match(ui,/VINCULAR APPLE/);
assert.match(src,/acceptVerifiedSocialSession\(session,pending\.expectedId\|\|null,\{provider:'apple'/);
assert.match(src,/provider:'apple'/);
assert.match(src,/next\.hostname!=='appleid\.apple\.com'/);

const memory=()=>{const map=new Map();return{
 getItem:key=>map.get(key)??null,
 setItem:(key,value)=>map.set(key,String(value)),
 removeItem:key=>map.delete(key),map
}};
globalThis.localStorage=memory();
globalThis.sessionStorage=memory();
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
let target=null,existing=null,links=0,accepted=0,requests=0;
globalThis.location={
 origin:'https://almaprintes.github.io',pathname:'/TopdownCraftrace/dev/',
 assign:value=>target=new URL(value)
};
globalThis.__appleMock={
 id:()=>existing,
 has:()=>!!existing,
 current:async()=>({id:existing,socialProviders:[]}),
 activation:async()=>({session:{access_token:'verified-old-token'}}),
 accept:async(session,id,opts)=>{
  assert.equal(opts.provider,'apple');assert.equal(id,existing||null);
  accepted++;
 }
};
let testSource=src.replace(/^import .*backendConfig.js';/m,
 "const playerBackendConfig=()=>({url:'https://backend.invalid',key:'public'});")
 .replace(/^import .*raceControlOnline.js';/m,
 "const hasSavedRaceControlSession=()=>__appleMock.has(),savedRaceControlIdentity=()=>__appleMock.id(),activateRaceControlOnline=()=>__appleMock.activation(),currentRaceControlAccount=()=>__appleMock.current(),acceptVerifiedSocialSession=(...args)=>__appleMock.accept(...args);");
const apple=await import('data:text/javascript;base64,'+Buffer.from(testSource).toString('base64'));
const key=apple.APPLE_PENDING;
const start=async()=>{
 await apple.startAppleWebSignIn();
 const pending=JSON.parse(sessionStorage.getItem(key));
 return {code:'one-use-code',state:pending.nonce};
};
localStorage.setItem('tdr2:previousOnlineUserId:v1','stale-guest');
await assert.rejects(start,/identidad antigua/);
localStorage.removeItem('tdr2:previousOnlineUserId:v1');
let callback=await start();
assert.equal(target.searchParams.get('provider'),'apple');
assert.equal(target.searchParams.get('code_challenge_method'),'s256');
const redirect=new URL(target.searchParams.get('redirect_to'));
assert.equal(redirect.origin+redirect.pathname,apple.APPLE_REDIRECT);
assert.equal(new URLSearchParams(redirect.hash.slice(1)).get('tdr_state'),callback.state);
const pending=JSON.parse(sessionStorage.getItem(key));
assert.equal(target.searchParams.get('code_challenge'),
 Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(pending.verifier))).toString('base64url'));
globalThis.fetch=async(url,options)=>{
 requests++;
 assert.equal(url,'https://backend.invalid/auth/v1/token?grant_type=pkce');
 assert.equal(options.referrerPolicy,'no-referrer');
 assert.equal(JSON.parse(options.body).code_verifier,pending.verifier);
 return {ok:true,json:async()=>({user:{id:'test-id'}})};
};
assert.equal((await apple.completeAppleWebSignIn(callback)).ok,true);
assert.equal(accepted,1);assert.equal(requests,1);
assert.equal(sessionStorage.getItem(key),null);
assert.equal((await apple.completeAppleWebSignIn(callback)).ok,false,'Reject callback replay');
for(const change of [c=>c.state='other',c=>c.error='access_denied',c=>c.code='']){
 callback=await start();change(callback);
 assert.equal((await apple.completeAppleWebSignIn(callback)).ok,false);
}
assert.equal(requests,1,'Untrusted callbacks never exchange tokens');
existing='existing-google-uuid';
globalThis.fetch=async(url,options)=>{
 links++;
 assert.ok(url.startsWith('https://backend.invalid/auth/v1/user/identities/authorize?'));
 assert.equal(options.headers.Authorization,'Bearer verified-old-token');
 assert.equal(new URL(url).searchParams.get('provider'),'apple');
 return {ok:true,json:async()=>({url:'https://appleid.apple.com/auth/authorize?state=signed-by-apple'})};
};
await start();
assert.equal(target.hostname,'appleid.apple.com');
assert.equal(JSON.parse(sessionStorage.getItem(key)).expectedId,'existing-google-uuid');
assert.equal(JSON.parse(sessionStorage.getItem(key)).linking,true);
assert.equal(links,1);
const old=JSON.parse(sessionStorage.getItem(key));
old.createdAt-=610000;
sessionStorage.setItem(key,JSON.stringify(old));
assert.equal((await apple.completeAppleWebSignIn({code:'code',state:old.nonce})).ok,false);
globalThis.fetch=async()=>({ok:false,json:async()=>({code:'manual_linking_disabled'})});
await assert.rejects(start,/Allow manual linking/);
assert.equal(sessionStorage.getItem(key),null);
assert.equal(accepted,1);
assert.equal(localStorage.getItem('tdr2:onlineSession:v1'),null);
console.log('PASS TDR Apple web PKCE, one-use callback, nonce, no anonymous takeover, same-UUID linking; no live OAuth/network');
