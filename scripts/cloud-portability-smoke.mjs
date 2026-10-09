import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { SupabaseProgressRepository, HttpV1ProgressRepository } from '../src/game/online/playerProgressRepository.js';

const token='a-test-token',id='a-uuid';
const identity={id,token};
const ok=data=>({ok:true,status:200,json:async()=>data});
const snapshot={format:2,createdAt:'2026-10-09T10:00:00Z',data:{'tdr2:garageFusion:v1':{coins:123}}};
const calls=[];
const supabase=new SupabaseProgressRepository({
  url:'https://supabase.example',key:'sb_publishable_test',storageProvider:'supabase-postgrest'
},async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/rpc/'))return ok([{saved:true,current_revision:2}]);
  return ok([{revision:2,updated_at:'2026-10-09T10:00:00Z',progress:snapshot}]);
});
const serverSave=await supabase.save(identity,snapshot,1);
assert.deepEqual(serverSave,{saved:true,revision:2});
const serverRead=await supabase.read(identity);
assert.deepEqual(serverRead.snapshot,snapshot);
assert.equal(calls[0].options.headers.Authorization,'Bearer '+token);
assert.equal(calls[0].options.headers.apikey,'sb_publishable_test');
assert.deepEqual(JSON.parse(calls[0].options.body),
  {p_progress:snapshot,p_expected_revision:1});
assert.ok(calls[1].url.includes('user_id=eq.a-uuid'));

const portableCalls=[];
const http=new HttpV1ProgressRepository({
  progressApiUrl:'https://self-host.example',storageProvider:'http-v1'
},async(url,options)=>{
  portableCalls.push({url,options});
  if(options.method==='PUT')return {ok:false,status:409,
    json:async()=>({saved:false,revision:4})};
  if(url.includes('fields=status'))return ok({revision:4,updatedAt:'now'});
  return ok({revision:4,updatedAt:'now',snapshot});
});
const row=await http.read(identity);
assert.deepEqual(row.snapshot,snapshot);
const status=await http.read(identity,{statusOnly:true});
assert.ok(!Object.hasOwn(status,'snapshot'));
const conflict=await http.save(identity,snapshot,3);
assert.deepEqual(conflict,{saved:false,revision:4});
assert.equal(portableCalls[2].options.headers.Authorization,'Bearer '+token);
assert.ok(!Object.hasOwn(portableCalls[2].options.headers,'apikey'));
assert.deepEqual(JSON.parse(portableCalls[2].options.body),
  {snapshot,expectedRevision:3});
const empty=new HttpV1ProgressRepository({progressApiUrl:'https://self-host.example'},
  async()=>({status:404,ok:false,json:async()=>null}));
assert.equal(await empty.read(identity),null);
await assert.rejects(http.read({id:'',token}),/iniciar sesión/);

for(const path of [
  'src/game/online/playerProgressRepository.js',
  'src/game/online/backendConfig.js',
  'src/game/online/raceControlOnline.js',
  'src/game/social/cloudProgress.js',
  'src/game/social/cloudAccountUi.js',
  'src/game/ui/LobbyDomUi.js'
]){
  execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
}
const source=await readFile(new URL('../src/game/social/cloudProgress.js',import.meta.url),'utf8');
const auth=await readFile(new URL('../src/game/online/raceControlOnline.js',import.meta.url),'utf8');
const ui=await readFile(new URL('../src/game/social/cloudAccountUi.js',import.meta.url),'utf8');
const lobby=await readFile(new URL('../src/game/ui/LobbyDomUi.js',import.meta.url),'utf8');
const db=await readFile(new URL('../supabase/migrations/20261009_012_player_progress_size_v2.sql',import.meta.url),'utf8');
for(const key of ['tdr2:garageFusion:v1','tdr2:playerStats:v1','tdr2:pilotProfile:v1',
  'tdr2:seasonInduction:v1','tdr2:carUnlocks:v1','tdr2:seasonTelemetry:v1','tdr2:cleanLapTelemetry:v1']){
  assert.ok(source.includes(key),'missing portable key '+key);
}
assert.ok(source.includes('const store=createPlayerProgressRepository()'));
assert.ok(source.includes('canonicalJson(actualData)!==canonicalJson(snapshot.data)'),
  'backup must verify a full readback, not just an OK status');
assert.ok(source.includes('restoreLocalProgress(cloud.snapshot)'));
assert.ok(source.includes('tdr2:cloudLoginPendingRestore:v1'),'account switch protection');
assert.ok(source.includes('try{localStorage.removeItem(key)'), 'restore must remove stale keys only inside rollback');
assert.ok(!source.includes('localStorage.clear('),'must never wipe all local storage');
assert.match(auth,/verifyRaceControlEmailCode/);
assert.match(auth,/setRaceControlPassword/);
assert.match(auth,/switchRaceControlAccount/);
assert.match(ui,/RECUPERAR PARTIDA DE LA NUBE/);
assert.match(ui,/ENTRAR CON MI CUENTA/);
assert.match(ui,/EXPORTAR PARTIDA LOCAL/);
assert.match(lobby,/openCloudAccountUi\(\)/);
assert.match(db,/524288/);
assert.match(db,/security invoker/);
assert.match(db,/auth\.uid\(\)/);
console.log('Cloud portability + account smoke: OK (2 backends, conflicts, protected restore, UI, schema)');
