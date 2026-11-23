import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AI_ELO_PILOTS} from '../src/game/ai/craftraceAiEloLeague.js';
import {live4SeatName} from '../src/game/online/craftraceLiveV2PilotNames.js';
import {live4AiPilotForSeat} from '../src/game/online/craftraceLive4AiIdentity.js';
import {LIVE4_AI_CHOICES,live4AiPilotById,live4PilotHighRollChance,
 cleanLive4AiSelections,chooseLive4AiSeat,readLive4AiSelections,
 saveLive4AiSelections,resolveLive4AiPilots,resolvedLive4AiPilotIds
} from '../src/game/online/craftraceLive4AiSelection.js';
import {stageLive4RaceSession,consumeLive4RaceSession} from '../src/game/online/craftraceLiveV2RaceSession.js';

assert.equal(LIVE4_AI_CHOICES.length,16);
assert.equal(new Set(LIVE4_AI_CHOICES.map(x=>x.id)).size,16);
assert.deepEqual(LIVE4_AI_CHOICES.map(x=>x.elo),[...AI_ELO_PILOTS].map(x=>x.elo).sort((a,b)=>b-a));
assert.equal(live4AiPilotById('falcon').elo,1800);
assert.equal(live4AiPilotById('comet').name,'Vera Cometa');
assert.equal(live4AiPilotById('nova').elo,900);
assert.ok(live4PilotHighRollChance(live4AiPilotById('falcon'))>
          live4PilotHighRollChance(live4AiPilotById('nova')));
assert.equal(live4AiPilotById('not-in-catalog'),null);
assert.deepEqual(cleanLive4AiSelections({'1':'comet','2':'comet','3':'falcon','0':'nova'}),{'1':'comet','3':'falcon'});
assert.throws(()=>chooseLive4AiSeat({},0,'nova'),/Plaza IA/);
assert.throws(()=>chooseLive4AiSeat({},1,'unknown'),/catálogo/);
const initial=chooseLive4AiSeat({},1,'comet');
const second=chooseLive4AiSeat(initial,2,'falcon');
const selected=chooseLive4AiSeat(second,3,'nova');
assert.throws(()=>chooseLive4AiSeat(selected,3,'comet'),/otra plaza/);
assert.deepEqual(selected,{'1':'comet','2':'falcon','3':'nova'});
assert.deepEqual(chooseLive4AiSeat(selected,3,''),{'1':'comet','2':'falcon'});
const storage=new Map();
const fakeStore={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
assert.deepEqual(readLive4AiSelections('santa-cruz',fakeStore),{});
assert.equal(saveLive4AiSelections('santa-cruz',selected,fakeStore),true);
assert.deepEqual(readLive4AiSelections('santa-cruz',fakeStore),selected);
assert.deepEqual(readLive4AiSelections('karting-canarias-4096',fakeStore),{});
assert.equal(saveLive4AiSelections('imola',selected,fakeStore),false);
assert.deepEqual(readLive4AiSelections('imola',fakeStore),{});
const errors={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
assert.deepEqual(readLive4AiSelections('santa-cruz',errors),{});
assert.equal(saveLive4AiSelections('santa-cruz',selected,errors),false);

const seed='85f29db0-6134-4e2e-8577-5641c07ce070';
const choices=resolveLive4AiPilots(seed,[1,2,3],selected);
assert.deepEqual(resolvedLive4AiPilotIds(choices),selected);
assert.deepEqual([choices[1].elo,choices[2].elo,choices[3].elo],[1730,1800,900]);
assert.equal(live4SeatName({seat:1,kind:'ai',difficulty:3},[],seed,resolvedLive4AiPilotIds(choices)), 'Vera Cometa');
const defaults=resolveLive4AiPilots(seed,[1,2,3],{});
assert.equal(defaults[1],live4AiPilotForSeat(seed,1));
assert.equal(defaults[2],live4AiPilotForSeat(seed,2));
assert.equal(defaults[3],live4AiPilotForSeat(seed,3));
const displaced=resolveLive4AiPilots(seed,[1,2,3],{'1':defaults[2].id});
assert.equal(displaced[1].id,defaults[2].id);
assert.equal(new Set(Object.values(displaced).map(x=>x.id)).size,3,
 'Explicit preference displaces automatic duplicate without changing Elo');
const subset=resolveLive4AiPilots(seed,[2,3],selected);
assert.deepEqual(Object.keys(subset),['2','3']);
assert.equal(subset[2].name,'Álex Falcón');

const host='550e8400-e29b-41d4-a716-446655440000';
const guest='550e8400-e29b-41d4-a716-446655440001';
const roomId='550e8400-e29b-41d4-a716-446655440034';
const single={id:roomId,host_id:host,fill_ai:true,ai_difficulty:3,
 locked_roster:[{kind:'human',seat:0,player_id:host},
 ...[1,2,3].map(seat=>({kind:'ai',seat,owner_id:host,difficulty:3,bot_id:'ai-seat-'+(seat+1)}))]};
stageLive4RaceSession(single,{id:host},selected);
const session=consumeLive4RaceSession(roomId);
assert.equal(session.aiPilotIds[1],'comet');
assert.equal(session.aiPilotIds[2],'falcon');
assert.equal(session.aiPilotIds[3],'nova');
assert.deepEqual(session.room.locked_roster,single.locked_roster,
 'Never mutate server authorization or assign invented seats');
const twoHuman={...single,locked_roster:[{kind:'human',seat:0,player_id:host},
 {kind:'human',seat:1,player_id:guest},
 ...[2,3].map(seat=>({kind:'ai',seat,owner_id:host,difficulty:3,bot_id:'ai-seat-'+(seat+1)}))]};
stageLive4RaceSession(twoHuman,{id:host},selected);
assert.deepEqual(consumeLive4RaceSession(roomId).aiPilotIds,{},
 'Host-only picks must not mislabel guests in a multi-human room');
stageLive4RaceSession(single,{id:guest},selected);
assert.deepEqual(consumeLive4RaceSession(roomId).aiPilotIds,{},
 'Only the room host can provide the locally selected bot IDs');

const lobby=readFileSync('src/game/ui/craftraceLiveV2Lobby.js','utf8');
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
const bots=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
for(const token of [
 "select.className='cr4-ai-pilot-select'",
 "select.addEventListener('change'",
 "option.textContent=choice.name+' · ELO '+choice.elo",
 "live4PilotHighRollChance(choice)",
 "s.members.length===1",
 "aiSelectionsByTrack.set(s.track_id,next)",
 "seatSignature",
 "if(row.dataset.signature!==seatSignature)",
 "stageLive4RaceSession(s,identity,resolvedLive4AiPilotIds(pilots))"
])assert.ok(lobby.includes(token),'UI must actually offer Elo picker: '+token);
assert.ok(bridge.includes('aiPilotIds:guidedGTrial?session.aiPilotIds:null'));
assert.ok(bridge.includes('room.ai_identity_seed||room.id,guidedGTrial?session.aiPilotIds:null'));
assert.ok(bots.includes('live4AiPilotById(this.aiPilotIds?.[item.seat])'));
assert.ok(bots.includes('rollEloAiDie(bot.aiPilot.elo)'),
 'The selected ELO must influence dice, not be just a visible nickname');
console.log('PASS LIVE 4 host G: real 16-pilot picker/Elo, unique seats, persisted circuit preferences, rematch, physical dice selection, no multi-human mismatch.');
