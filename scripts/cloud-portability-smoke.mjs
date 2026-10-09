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

// Safari/WebKit regression: native Window.fetch must receive its Window
// receiver. Calling it via this.transport() throws "Can only call Window.fetch
// on instances of Window" in the iPhone PWA.
const savedFetch=globalThis.fetch;
try{
  let nativeCalls=0;
  globalThis.fetch=function(url){
    assert.equal(this,globalThis,'fetch called with incorrect receiver');
    nativeCalls++;
    return Promise.resolve(ok([{revision:3,updated_at:'2026-10-09T13:00:00Z',progress:snapshot}]));
  };
  const nativeRepository=new SupabaseProgressRepository({
    url:'https://supabase.example',key:'sb_publishable_test'
  });
  const fromNative=await nativeRepository.read(identity);
  assert.equal(fromNative.revision,3);
  assert.equal(nativeCalls,1);
}finally{globalThis.fetch=savedFetch;}


for(const path of [
  'src/game/online/playerProgressRepository.js',
  'src/game/online/backendConfig.js',
  'src/game/online/raceControlOnline.js',
  'src/game/social/cloudProgress.js',
  'src/game/social/cloudAccountUi.js',
  'src/game/ui/LobbyDomUi.js',
  'src/game/scenes/SettingsGraphicsQualityScene.js'
]){
  execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
}
const transportSource=await readFile(new URL('../src/game/online/playerProgressRepository.js',import.meta.url),'utf8');
assert.match(transportSource,/globalThis\.fetch\(url,options\)/,'WebKit-safe transport');
const source=await readFile(new URL('../src/game/social/cloudProgress.js',import.meta.url),'utf8');
const auth=await readFile(new URL('../src/game/online/raceControlOnline.js',import.meta.url),'utf8');
const ui=await readFile(new URL('../src/game/social/cloudAccountUi.js',import.meta.url),'utf8');
const lobby=await readFile(new URL('../src/game/ui/LobbyDomUi.js',import.meta.url),'utf8');
const settings=await readFile(new URL('../src/game/scenes/SettingsGraphicsQualityScene.js',import.meta.url),'utf8');
const pilot=await readFile(new URL('../src/game/social/pilotProfile.js',import.meta.url),'utf8');
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
assert.ok(source.includes('for(const [key] of before)')&&source.includes('localStorage.removeItem(key)'), 'restore must alter only whitelisted progress keys');
assert.ok(!source.includes('localStorage.clear('),'must never wipe all local storage');
assert.match(auth,/verifyRaceControlEmailCode/);
assert.match(auth,/setRaceControlPassword/);
assert.match(auth,/switchRaceControlAccount/);
assert.match(ui,/RECUPERAR PARTIDA DE LA NUBE/);
for(const stage of ['link','verify','password','login']){
  assert.ok(ui.includes('data-stage=\\\"'+stage+'\\\"'),'account step available: '+stage);
}
assert.match(ui,/data-advanced/,'advanced controls behind disclosure');
assert.match(ui,/data-action=\\\"retry\\\"/,'retry action exists when cloud fails');
assert.match(ui,/showConnectionError/,'cloud failure must not strand account loading');
assert.doesNotMatch(ui,/Promise\.all\(\[currentRaceControlAccount\(\),cloudBackupStatus\(\)\]\)/,'no concurrent anonymous auth creation');
assert.match(ui,/data-action=\\\"edit-pilot\\\"/,'pilot name can be edited from primary account');
assert.match(pilot,/advanced.insertBefore\(card/,'profile editor stays in More settings');
assert.match(ui,/cloudRecoveryChecked:/,'only verified accounts show protected state');
assert.match(ui,/progress.meaningful&&!remote.existing/,'first cloud save after recovery check');
assert.match(ui,/tdr2:cloudLoginPendingRestore:v1/,'never upload before restore');
assert.match(ui,/ENTRAR CON MI CUENTA/);
assert.match(ui,/EXPORTAR PARTIDA LOCAL/);
assert.match(lobby,/__tdrSettingsAccountRequested=true/,'lobby must route to Settings Cuenta');
assert.doesNotMatch(lobby,/openCloudAccountUi\(\)/,'no duplicate lobby account modal');
assert.match(settings,/data-cloud-account-section/,'existing account tab must own cloud account');
assert.match(settings,/openCloudAccountUi\(\{host:body\.querySelector\(/,'cloud recovery must be embedded in Settings tab');
assert.match(settings,/unmountCloudAccountSettings\(\)/,'tab switching must clean up account section');
assert.match(settings,/tdr2:onlineSession:v1/,'local progress reset must preserve server identity');
assert.match(settings,/BORRAR DATOS DEL DISPOSITIVO/,'account deletion must not mislead players about remote accounts');
assert.match(ui,/root\.dataset\.inline=host\?'1':'0'/,'account UI must support embedded Settings layout');
assert.match(db,/524288/);
assert.match(db,/security invoker/);
assert.match(db,/auth\.uid\(\)/);
console.log('Cloud portability + account smoke: OK (2 backends, conflicts, protected restore, UI, schema)');
