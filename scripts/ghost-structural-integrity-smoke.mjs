import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeOnlineGhostNative,encodeOnlineGhostNativeBinary}
  from '../src/game/online/onlineGhostCodec.js';

// Independent contract model of server SQL: structural check, NOT anti-cheat
// proof. Direct server regression tests use all 15 existing packets in SQL.
function structurallyValid(bytes,frames,lapMs){
  if(!(bytes instanceof Uint8Array)||!Number.isInteger(frames)||
    frames<2||frames>20000||!Number.isInteger(lapMs)||lapMs<=0||
    bytes.length<1||bytes.length>131072)return false;
  let at=0,prev=[0,0,0,0],previousTime=-1;
  for(let i=0;i<frames;i++){
    for(let j=0;j<4;j++){
      let value=0,mul=1,ended=false;
      for(let k=1;k<=8;k++){
        if(at>=bytes.length)return false;
        const next=bytes[at++];
        value+=(next&127)*mul;
        if(next<128){
          if(k>1&&next===0)return false;
          ended=true;break;
        }
        mul*=128;
      }
      if(!ended||value>4294967295)return false;
      const delta=value%2===0?value/2:-(value+1)/2;
      prev[j]+=delta;
      if(prev[j]<-2147483648||prev[j]>2147483647)return false;
    }
    if(prev[0]<0||prev[0]>lapMs||(i>0&&prev[0]<=previousTime))return false;
    previousTime=prev[0];
  }
  return at===bytes.length&&previousTime===lapMs;
}
const samples=[
  {t:0,x:150,y:120,r:0},
  {t:40,x:155.25,y:124,r:0.11},
  {t:100,x:160.5,y:126.25,r:0.13},
  {t:150,x:168,y:127,r:0.15}
];
const packet=encodeOnlineGhostNative({
  lapMs:150,trackKey:'karting-tenerife',carId:'avenir_gripline',samples});
const bytes=encodeOnlineGhostNativeBinary(packet);
assert.equal(structurallyValid(bytes,packet.p.length,150),true,'Normal race ghost must pass');
assert.equal(structurallyValid(bytes,packet.p.length,149),false,'Claimed time mismatch');
assert.equal(structurallyValid(bytes,packet.p.length,151),false,'Claimed time must match final sample');
assert.equal(structurallyValid(bytes,packet.p.length+1,150),false,'Wrong declared frame count');
assert.equal(structurallyValid(bytes.slice(0,-1),packet.p.length,150),false,'Truncated binary');
assert.equal(structurallyValid(Uint8Array.from([...bytes,0]),packet.p.length,150),false,'Extra bytes');
assert.equal(structurallyValid(Uint8Array.of(128,0,0,0,0),2,150),false,'Noncanonical varint');
assert.equal(structurallyValid(Uint8Array.of(255,255,255,255,255,255,255,255),2,150),false,'Overflowing varint');
const repeated=JSON.parse(JSON.stringify(packet));
repeated.p[1][0]=repeated.p[0][0];
assert.equal(structurallyValid(encodeOnlineGhostNativeBinary(repeated),repeated.p.length,150),false,
  'Repeated/retrograde timestamps cannot pass');
const altered=JSON.parse(JSON.stringify(packet));
altered.p[2][0]=-10;
assert.equal(structurallyValid(encodeOnlineGhostNativeBinary(altered),altered.p.length,150),false,
  'Negative/retrograde timestamps cannot pass');

const sql=readFileSync('supabase/migrations/20261030_033_online_ghost_structural_validation.sql','utf8');
assert.match(sql,/tdr_web_private\.valid_online_ghost_v1/);
assert.match(sql,/v_last\[1\]<=v_previous_time/,'Must enforce strictly increasing timestamps');
assert.match(sql,/v_at=v_len and v_previous_time=p_lap_ms/,'Must validate length and lap time');
assert.match(sql,/if v_at>=v_len then return false/,'Reject truncated varints');
assert.match(sql,/if not v_ended or v_number>4294967295/,'Reject malformed varints');
assert.match(sql,/v_k>1 and v_byte=0/,'Reject noncanonical varints');
assert.match(sql,/if \(v_previous_time is null or p_best_time_ms < v_previous_time\)/,
  'Expensive decode must not run for unchanged/older PB');
assert.match(sql,/where ghost_payload is not null\s+and not tdr_web_private\.valid_online_ghost_v1/,
  'Migration must verify every existing ghost before enforcement');
assert.match(sql,/revoke all on function tdr_web_private\.valid_online_ghost_v1\(bytea,integer,integer\)\s+from public,anon,authenticated/,
  'Validator is private, not another public API');
assert.doesNotMatch(sql,/delete from public\.track_records|truncate table|alter table|create table|create index/i,
  'No data loss or additional DB structures');
const constraints=readFileSync('supabase/migrations/20261030_034_minimum_lap_and_strict_ghost_format.sql','utf8');
assert.equal((constraints.match(/p_best_time_ms <= 1000/g)||[]).length,2);
assert.match(constraints,/p_ghost_format is distinct from 1/,'NULL cannot evade ghost format check');
assert.match(constraints,/if \(select min\(best_time_ms\) from public\.track_records\)<=1000/,
  'Abort if any older official lap might be affected');
assert.doesNotMatch(constraints,/delete from public\.track_records|truncate table/i);
console.log('PASS: native ghost integrity, 8 bad-payload cases, no-op CPU gate, private RPC, strict score/format limits');
