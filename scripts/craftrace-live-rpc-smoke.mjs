import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('supabase/migrations/20261115_038_craftrace_live_rpc_beta.sql','utf8');
const adapter=readFileSync('src/game/online/craftraceLiveTransport.js','utf8');
for(const name of ['craftrace_live_create','craftrace_live_join','craftrace_live_send','craftrace_live_poll']){
 assert.match(sql,new RegExp('create or replace function public\\.'+name+'\\('));
 assert.match(sql,new RegExp('revoke all on function public\\.'+name+'\\('));
 assert.match(sql,new RegExp('grant execute on function public\\.'+name+'\\('));
 assert.match(adapter,new RegExp("'"+name+"'"));
}
assert.match(sql,/enable row level security/g);
assert.match(sql,/revoke all on public\.craftrace_live_rooms,public\.craftrace_live_packets from public,anon,authenticated/);
assert.match(sql,/v_uid<>v_room\.host_id and v_uid is distinct from v_room\.guest_id/);
assert.match(sql,/on conflict\(room_id,sender_id,client_seq\) do nothing/);
assert.match(sql,/created_at>now\(\)-interval '5 seconds'/);
assert.match(sql,/created_at>now\(\)-interval '1 second'/);
assert.match(adapter,/activateRaceControlOnline\(\)/);
assert.match(adapter,/crypto\.getRandomValues/);
assert.match(adapter,/this\.onPacket\(packet\)/);
assert.doesNotMatch(sql,/slotrace_live_rooms|drop table|truncate table/i);
console.log('PASS CrafRace LIVE RPC review: restricted RPCs, isolated tables, identity, flood limits');
