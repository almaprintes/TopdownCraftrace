import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const original=await readFile(new URL('../src/game/online/raceControlOnline.js',import.meta.url),'utf8');
const source=original
  .replace(/^import \{ recordOnlineCuperPublish \} from .*;\s*$/m,'const recordOnlineCuperPublish=()=>{};')
  .replace(/^import \{raceControlServerTrackId,decodeRaceControlServerTrackId\} from .*;\s*$/m,
    'const raceControlServerTrackId=id=>id;const decodeRaceControlServerTrackId=id=>({trackId:id});')
  .replace(/^import \{ playerBackendConfig \} from .*;\s*$/m,"const playerBackendConfig=()=>({url:'https://mock.invalid',key:'test-public-key'});");
assert.doesNotMatch(source,/^import /m,'all dependencies mocked');

async function scenario({stored=null,refresh='fail',signup=true}={}){
  const data=new Map();
  if(stored)data.set('tdr2:onlineSession:v1',JSON.stringify(stored));
  globalThis.localStorage={
    getItem:k=>data.get(k)??null,
    setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)
  };
  const calls=[];
  const valid=(id='player-a')=>({access_token:'access-'+id,refresh_token:'refresh-'+id,user:{id,is_anonymous:true},expires_in:3600});
  globalThis.fetch=async(url)=>{
    const path=String(url);calls.push(path);
    if(path.includes('/auth/v1/token?')){
      if(refresh==='fail')return {ok:false,status:401,json:async()=>({message:'invalid refresh token'})};
      if(refresh==='revoked')return {ok:false,status:400,json:async()=>({code:'refresh_token_not_found',message:'Invalid Refresh Token: Refresh Token Not Found'})};
      if(refresh==='success')return {ok:true,status:200,json:async()=>valid(stored.user.id)};
      return {ok:true,status:200,json:async()=>valid('other-id')};
    }
    if(path.includes('/auth/v1/signup')){
      assert.ok(signup,'unexpected anonymous signup');
      return {ok:true,status:200,json:async()=>valid('new-player')};
    }
    throw Error('Unexpected endpoint: '+path);
  };
  const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+Math.random());
  return {activate:module.activateRaceControlOnline,leave:module.continueRejectedAnonymousSessionLocally,calls,data};
}
const expired={access_token:'old',refresh_token:'refresh-player-a',user:{id:'player-a',is_anonymous:true},expires_at:1};
{
  const s=await scenario({stored:expired,refresh:'fail',signup:false});
  await assert.rejects(s.activate(),/No se pudo recuperar tu sesión/);
  assert.equal(s.calls.filter(x=>x.includes('/auth/v1/signup')).length,0);
  assert.deepEqual(JSON.parse(s.data.get('tdr2:onlineSession:v1')),expired);
}
{
  const s=await scenario({stored:expired,refresh:'success',signup:false});
  assert.equal((await s.activate()).session.user.id,'player-a');
  assert.equal(s.calls.filter(x=>x.includes('/auth/v1/signup')).length,0);
}
{
  const s=await scenario({stored:expired,refresh:'success',signup:false});
  const [a,b,c]=await Promise.all([s.activate(),s.activate(),s.activate()]);
  assert.equal(a.session.user.id,'player-a');
  assert.equal(b.session.user.id,a.session.user.id);
  assert.equal(c.session.user.id,a.session.user.id);
  assert.equal(s.calls.filter(x=>x.includes('/auth/v1/token?')).length,1,'single-flight refresh');
}
{
  const s=await scenario({stored:{...expired,expires_at:Math.floor(Date.now()/1000)+3600},signup:false});
  assert.equal((await s.activate()).session.user.id,'player-a');
  assert.equal(s.calls.length,0);
}
{
  const s=await scenario({signup:false});
  await assert.rejects(s.activate(),/PARTIDA_LOCAL_SIN_CUENTA/);
  assert.equal(s.calls.length,0,'opening Race Control cannot create an anonymous user');
}
{
  const s=await scenario({stored:expired,refresh:'wrong-id',signup:false});
  await assert.rejects(s.activate(),/No se pudo recuperar tu sesión/);
  assert.equal(s.calls.filter(x=>x.includes('/auth/v1/signup')).length,0);
}
{
  const s=await scenario({stored:expired,refresh:'revoked',signup:false});
  s.data.set('tdr2:garageFusion:v1',JSON.stringify({coins:750}));
  const err=await s.activate().then(()=>null,e=>e);
  assert.equal(err.code,'TDR_AUTH_REFRESH_REJECTED');
  assert.equal(err.userId,'player-a');
  assert.deepEqual(JSON.parse(s.data.get('tdr2:onlineSession:v1')),expired,'no silent detachment');
  assert.throws(()=>s.leave('wrong-user'),/identidad ha cambiado/i);
  assert.deepEqual(JSON.parse(s.data.get('tdr2:onlineSession:v1')),expired);
  assert.deepEqual(s.leave('player-a'),{id:'player-a',mode:'local'});
  assert.equal(s.data.has('tdr2:onlineSession:v1'),false);
  assert.equal(s.data.get('tdr2:previousOnlineUserId:v1'),'player-a');
  assert.deepEqual(JSON.parse(s.data.get('tdr2:garageFusion:v1')),{coins:750});
  await assert.rejects(s.activate(),/PARTIDA_LOCAL_SIN_CUENTA/);
  assert.equal(s.calls.filter(x=>x.includes('/auth/v1/signup')).length,0);
}
{
  const permanent={...expired,user:{id:'player-b',email:'user@example.test',is_anonymous:false}};
  const s=await scenario({stored:permanent,refresh:'revoked',signup:false});
  const err=await s.activate().then(()=>null,e=>e);
  assert.notEqual(err?.code,'TDR_AUTH_REFRESH_REJECTED','never offer guest detachment to a permanent account');
  assert.throws(()=>s.leave('player-b'),/identidad ha cambiado/);
  assert.ok(s.data.has('tdr2:onlineSession:v1'));
}
console.log('Auth local-first regression smoke: OK (8 scenarios, no real requests)');
