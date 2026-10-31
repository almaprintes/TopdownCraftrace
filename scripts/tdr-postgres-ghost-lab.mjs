// Hosted PostgreSQL lab: no player data, no real Supabase, no local Mac files.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {encodeOnlineGhostNative,encodeOnlineGhostNativeBinary} from '../src/game/online/onlineGhostCodec.js';

const migration=readFileSync('supabase/migrations/20261030_033_online_ghost_structural_validation.sql','utf8');
const match=migration.match(/create or replace function tdr_web_private\.valid_online_ghost_v1\([\s\S]*?\$verify\$;/i);
assert.ok(match,'Missing production structural validator');
const samples=Array.from({length:650},(_,i)=>({
  t:i*50,x:700+i*0.5,y:400+Math.sin(i/18)*75,
  r:Math.atan2(Math.cos(i/18)*75/18,0.5)
}));
const packet=encodeOnlineGhostNative({
  lapMs:samples.at(-1).t,trackKey:'karting-tenerife',
  carId:'avenir_gripline',samples
});
const bytes=encodeOnlineGhostNativeBinary(packet);
const hex=x=>Buffer.from(x).toString('hex');
const byteSql=x=>"decode('"+hex(x)+"','hex')";
const call=(src,count,ms)=>'tdr_web_private.valid_online_ghost_v1('+src+','+count+','+ms+')';
const original=byteSql(bytes),n=packet.p.length,ms=packet.ms;
const corrupted=structuredClone(packet);
corrupted.p[1][0]=corrupted.p[0][0];
const cases=[
  ['valid replay',call(original,n,ms),true],
  ['claimed time one millisecond faster',call(original,n,ms-1),false],
  ['wrong frame count',call(original,n+1,ms),false],
  ['truncated packet',call(byteSql(bytes.slice(0,-1)),n,ms),false],
  ['trailing bytes',call(byteSql(Uint8Array.from([...bytes,0])),n,ms),false],
  ['duplicate timestamp',call(byteSql(encodeOnlineGhostNativeBinary(corrupted)),n,ms),false],
  ['noncanonical varint',call("decode('8000','hex')",2,1000),false]
];
const sql=[
  'CREATE SCHEMA IF NOT EXISTS tdr_web_private;',
  match[0],
  ...cases.map(([label,expr,pass],i)=>
    'DO $case'+i+'$ BEGIN IF ('+expr+') IS DISTINCT FROM '+(pass?'TRUE':'FALSE')+
    " THEN RAISE EXCEPTION 'Mismatch: "+label+"'; END IF; END; $case"+i+"$;"),
  'DO $bench$ DECLARE started timestamptz:=clock_timestamp(); i integer; BEGIN '+
    'FOR i IN 1..20 LOOP IF NOT '+call(original,n,ms)+
    " THEN RAISE EXCEPTION 'Invalid replay during benchmark'; END IF; END LOOP; "+
    "RAISE NOTICE 'TDR isolated lab: 20 replays of "+n+
    " samples, total_ms=%',round((extract(epoch from (clock_timestamp()-started))*1000)::numeric,1); "+
    'END; $bench$;'
].join('\n');
const runner=spawnSync('psql',['-X','-q','-v','ON_ERROR_STOP=1'],{
  input:sql,encoding:'utf8',env:process.env,maxBuffer:1024*1024,timeout:120000
});
if(runner.error)throw runner.error;
if(runner.status!==0){
  console.error(runner.stderr);
  throw new Error('PostgreSQL lab failed with exit code '+runner.status);
}
console.log('PASS: exact production PostgreSQL ghost validator; 7 synthetic cases.');
console.log((runner.stderr||'').split('\n').filter(x=>x.includes('TDR isolated lab:')).join('\n'));
console.log('No live credentials, no production database, no local Mac storage.');
if(process.env.GITHUB_STEP_SUMMARY){
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '## TDR · PostgreSQL aislado\n'+
  '- 7 casos de replay, incluido tiempo falsificado, paquete truncado y muestras repetidas.\n'+
  '- SQL exacto de migración 033 ejecutado en PostgreSQL temporal.\n'+
  '- 20 verificaciones sintéticas de 650 muestras; no es prueba de carga de producción.\n'+
  '- Ninguna llamada ni escritura en Supabase de producción.\n');
}
