import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const original=await readFile(new URL('../src/game/online/raceControlOnline.js',import.meta.url),'utf8');
const source=original
  .replace(/^import \{ recordOnlineCuperPublish \} from .*;\s*$/m,'const recordOnlineCuperPublish=()=>{};')
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
  return {activate:module.activateRaceControlOnline,calls,data};
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
  const s=await scenario({stored:{...expired,expires_at:Math.floor(Date.now()/1000)+3600},signup:false});
  assert.equal((await s.activate()).session.user.id,'player-a');
  assert.equal(s.calls.length,0);
}
{
  const s=await scenario();
  assert.equal((await s.activate()).session.user.id,'new-player');
  assert.equal(s.calls.filter(x=>x.includes('/auth/v1/signup')).length,1);
}
{
  const s=await scenario({stored:expired,refresh:'wrong-id',signup:false});
  await assert.rejects(s.activate(),/No se pudo recuperar tu sesión/);
  assert.equal(s.calls.filter(x=>x.includes('/auth/v1/signup')).length,0);
}
console.log('Anonymous auth identity regression smoke: OK (5 scenarios, zero real requests)');
