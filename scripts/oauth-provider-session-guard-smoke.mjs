// Contract test for shared Apple/Google OAuth identity acceptance.
// Uses only synthetic Supabase responses: NEVER requests tokens or live users.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const original=readFileSync('src/game/online/raceControlOnline.js','utf8');
const source=original.replace(/^import .*;$/gm,'')
  .replace('let api=null;',
    "const playerBackendConfig=()=>({url:'https://mock.invalid',key:'public'});let api=null;");
assert.doesNotMatch(source,/^import /m);
const online=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function memory(){const map=new Map();return{
 map,getItem:k=>map.get(k)??null,
 setItem:(k,v)=>map.set(k,String(v)),
 removeItem:k=>map.delete(k)
};}
globalThis.localStorage=memory();
let userResponse=null;
globalThis.fetch=async (url,options)=>{
 assert.equal(url,'https://mock.invalid/auth/v1/user');
 assert.ok(options.headers.Authorization?.startsWith('Bearer '));
 return {ok:true,json:async()=>userResponse};
};
const session=(id)=>({
 access_token:'access-'+id,refresh_token:'refresh-'+id,
 expires_at:Math.floor(Date.now()/1000)+3600,
 provider_token:'MUST-NOT-SAVE',provider_refresh_token:'MUST-NOT-SAVE',
 user:{id}
});
const identities=(id,providers)=>providers.map(provider=>({provider,user_id:id}));
const key='tdr2:onlineSession:v1';
localStorage.setItem('tdr2:garageFusion:v1',JSON.stringify({coins:750}));
localStorage.setItem('tdr2:pilotProfile:v1',JSON.stringify({name:'JUANFRAN'}));
userResponse={id:'pilot-apple',is_anonymous:false,email:'hidden@example.invalid',
 identities:identities('pilot-apple',['apple','google'])};
await assert.rejects(
 online.acceptVerifiedSocialSession(session('pilot-apple'),null,{provider:'facebook'}),
 /Proveedor no autorizado/);
await online.acceptVerifiedSocialSession(session('pilot-apple'),null,{provider:'apple'});
const stored=JSON.parse(localStorage.getItem(key));
assert.equal(stored.user.id,'pilot-apple');
assert.deepEqual(stored.user.app_metadata.providers,['apple','google']);
assert.equal(online.savedGoogleWebIdentity(),'pilot-apple');
assert.equal(localStorage.getItem('tdr2:cloudLoginPendingRestore:v1'),'pilot-apple');
assert.equal(localStorage.getItem('tdr2:socialSavePending:v1'),'pilot-apple');
assert.equal(JSON.parse(localStorage.getItem('tdr2:garageFusion:v1')).coins,750);
assert.equal(JSON.parse(localStorage.getItem('tdr2:pilotProfile:v1')).name,'JUANFRAN');
assert.doesNotMatch(localStorage.getItem(key),/MUST-NOT-SAVE/);
// A new provider claiming another user can never steal the saved identity.
userResponse={id:'another-user',is_anonymous:false,
 identities:identities('another-user',['google'])};
await assert.rejects(online.acceptGoogleWebSession(session('another-user'),'pilot-apple',{linking:true}));
assert.equal(JSON.parse(localStorage.getItem(key)).user.id,'pilot-apple');
// Even if user ID is correct, a fake provider name is not proof.
userResponse={id:'pilot-apple',is_anonymous:false,
 identities:identities('pilot-apple',['google'])};
await assert.rejects(online.acceptVerifiedSocialSession(session('pilot-apple'),'pilot-apple',
 {provider:'apple',linking:true}));
assert.equal(JSON.parse(localStorage.getItem(key)).user.app_metadata.provider,'apple');
// An anonymous Auth identity cannot be promoted by a client-side assertion.
userResponse={id:'pilot-apple',is_anonymous:true,
 identities:identities('pilot-apple',['apple'])};
await assert.rejects(online.acceptVerifiedSocialSession(session('pilot-apple'),'pilot-apple',
 {provider:'apple',linking:true}));
assert.equal(JSON.parse(localStorage.getItem(key)).user.is_anonymous,false);
// A mismatched identity.user_id is rejected even if provider matches.
userResponse={id:'pilot-apple',is_anonymous:false,
 identities:identities('different-user',['apple'])};
await assert.rejects(online.acceptVerifiedSocialSession(session('pilot-apple'),'pilot-apple',
 {provider:'apple',linking:true}));
assert.equal(JSON.parse(localStorage.getItem(key)).user.id,'pilot-apple');
// Linking Apple on the SAME existing UUID must preserve it and the local save.
userResponse={id:'pilot-apple',is_anonymous:false,
 identities:identities('pilot-apple',['google','apple'])};
const linked=await online.acceptVerifiedSocialSession(session('pilot-apple'),
  'pilot-apple',{provider:'apple',linking:true});
assert.equal(linked.id,'pilot-apple');
assert.equal(JSON.parse(localStorage.getItem(key)).user.id,'pilot-apple');
assert.equal(JSON.parse(localStorage.getItem('tdr2:garageFusion:v1')).coins,750);
console.log('PASS OAuth provider gate: Google+Apple identity proof, no anonymous upgrade by assertion');
console.log('PASS UUID preservation, no silent account switch, no provider tokens stored, local progress preserved');
console.log('PASS no Apple native sign-in enabled: this tests only the protected session acceptance seam');
