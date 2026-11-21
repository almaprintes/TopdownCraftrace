import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {humanNickForRoomMember,live4SeatName}
 from '../src/game/online/craftraceLiveV2PilotNames.js';
const a='00000000-0000-4000-8000-000000000001';
const b='00000000-0000-4000-8000-000000000002';
const members=[{player_id:a,nick:'JUANFRIKAZO'},{player_id:b,nick:'HUGO_RACE'}];
assert.equal(humanNickForRoomMember(members,a),'JUANFRIKAZO');
assert.equal(humanNickForRoomMember(members,b),'HUGO_RACE');
assert.equal(live4SeatName({kind:'human',seat:1,player_id:b},members),'HUGO_RACE');
assert.equal(live4SeatName({kind:'ai',seat:2,difficulty:3},members),'IA EXPERTO · 3');
assert.equal(live4SeatName({kind:'ai',seat:3,difficulty:3},members),'IA EXPERTO · 4');
assert.equal(humanNickForRoomMember(members,'unknown'),'NICK PENDIENTE');
assert.equal(humanNickForRoomMember([{player_id:a,nick:'<img src=x>'}],a),'<img src=x>');
assert.equal(humanNickForRoomMember([{player_id:a,nick:' A '.repeat(30)}],a),'NICK PENDIENTE');
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
const lobby=readFileSync('src/game/ui/craftraceLiveV2Lobby.js','utf8');
const sql=readFileSync('supabase/migrations/20261121_042_craftrace_live_v2_member_nicks.sql','utf8');
for(const tag of ['const displayName=','name:displayName(entry)','updateNames(s)','visual?.label?.setText(nick)'])
 assert.ok(bridge.includes(tag),'LIVE 4 race nick missing '+tag);
assert.ok(lobby.includes('live4SeatName('),'Lobby must show profile nicks');
for(const tag of ['Room unavailable', 'public.profiles p','public.craft_accounts a',
 'm.room_id=p_room',"'nick',coalesce", 'grant execute on function'])
 assert.ok(sql.includes(tag),'Authenticated-room-only SQL name mapping missing '+tag);
assert.ok(!bridge.includes("entry.player_id===localId?'TÚ':'PILOTO '"));
console.log('PASS LIVE 4 nicknames in room, labels and results (AI names deterministic)');
