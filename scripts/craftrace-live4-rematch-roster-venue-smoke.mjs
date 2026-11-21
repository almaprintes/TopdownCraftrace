// DEV LIVE 4: names from the permanent 16-driver roster, authorized
// rematches and host-editable venue. Protect LIVE 2 and prior race results.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AI_ELO_PILOTS,eloDieProbabilities} from '../src/game/ai/craftraceAiEloLeague.js';
import {live4AiPilotForSeat,live4AiRoster} from '../src/game/online/craftraceLive4AiIdentity.js';
import {live4SeatName} from '../src/game/online/craftraceLiveV2PilotNames.js';
assert.equal(AI_ELO_PILOTS.length,16);
for(const seed of ['85f29db0-6134-4e2e-8577-5641c07ce070',
 '483e128b-1479-4c25-9ec5-5f3f9fd15d31']){
 const chosen=Array.from({length:4},(_,seat)=>live4AiPilotForSeat(seed,seat));
 assert.equal(new Set(chosen.map(p=>p.id)).size,4,'Four AI must all be distinct');
 for(let seat=0;seat<4;seat++){
  assert.equal(chosen[seat],live4AiPilotForSeat(seed,seat));
  assert.equal(live4SeatName({seat,kind:'ai',difficulty:3},[],seed),chosen[seat].name);
  assert.ok(chosen[seat].name.split(' ').length>=2,'Full pilot name');
 }
 const sub=live4AiRoster(seed,[{kind:'human',seat:0},{kind:'ai',seat:1},
  {kind:'human',seat:2},{kind:'ai',seat:3}]);
 assert.deepEqual(sub.map(x=>x.pilot.id),[chosen[1].id,chosen[3].id]);
}
assert.equal(live4SeatName({seat:1,kind:'ai',difficulty:3},[]),'IA EXPERTO · 2',
 'Legacy no-seed compatibility');
assert.equal(live4SeatName({seat:0,kind:'human',player_id:'x'},
 [{player_id:'x',nick:'HUGOFRESCO'}],'any'), 'HUGOFRESCO');
const rookie=eloDieProbabilities(900),ace=eloDieProbabilities(1800);
assert.ok(ace[5]>rookie[5]&&ace[0]<rookie[0],
 'High Elo should favour high dice results in experimental G');
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
assert.ok(bridge.includes('aiIdentitySeed:room.ai_identity_seed||room.id'));
assert.ok(bridge.includes('requestLiveV2Rematch(roomId)'));
assert.ok(bridge.includes('acceptLiveV2Rematch(roomId)'));
assert.ok(bridge.includes('rematchRoomId=s.rematch_room_id'));
assert.ok(bridge.includes('setLive4GuidedGForRoom(next.id,guidedGTrial)'));
const lobby=readFileSync('src/game/ui/craftraceLiveV2Lobby.js','utf8');
for(const key of ['data-select-track','data-select-car','data-join-car',
 'data-edit-track','data-edit-car','setLiveV2Venue(room.id',
 'trackId:$(',"carId:$(", 'initialRoom?.id']){
 assert.ok(lobby.includes(key),'Missing LIVE4 venue/rematch control: '+key);
}
const stats=readFileSync('src/game/scenes/StatsRaceControlHubScene.js','utf8');
assert.ok(stats.includes('live4RematchRoom')&&stats.includes('initialRoom:next'));
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
assert.ok(director.includes('rollEloAiDie(bot.aiPilot.elo)'));
assert.ok(!bridge.includes('createLiveRoom('),'LIVE 2 transport untouched');
const sql=readFileSync('supabase/migrations/20261121_043_craftrace_live_v2_rematch_venue.sql','utf8');
assert.ok(sql.includes('v_finished<>v_total')&&sql.includes('rematch_room_id'));
assert.ok(sql.includes('on conflict (room_id,user_id) do update set last_seen=now()'));
assert.ok(sql.includes('revoke all on function public.craftrace_live_v2_accept_rematch'));
console.log('PASS LIVE 4: 16 stable AI full names, Elo G dice, editable venue, private rematch seats and no LIVE 2 change');
