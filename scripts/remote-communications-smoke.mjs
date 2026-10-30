import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validPublicNotice,noticeForPlayer,acknowledgeCommunication,noticeSeenKey,communicationSeenStore,playUpdateNotice,safeNoticeLink,PLAY_STORE_URL} from '../src/game/online/liveCommunications.js';

const now=Date.parse('2026-11-02T12:00:00Z');
const id='11111111-1111-4111-8111-111111111111';
const a={id,kind:'notice',target:'all',active:true,priority:10,
  title:'¡Bienvenidos!',body:'Nueva temporada',version_code:null,
  starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-12-01T00:00:00Z',updated_at:'2026-11-02T00:00:00Z'};
const update={...a,id:'22222222-2222-4222-8222-222222222222',kind:'update',target:'android',
  version_code:12,title:'Actualiza TDR',action_url:PLAY_STORE_URL,priority:50};
const storage=new Map(),local={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
assert.equal(validPublicNotice(a,now),true);
assert.equal(validPublicNotice({...a,active:false},now),false,'Drafts stay hidden');
assert.equal(validPublicNotice({...a,ends_at:'2026-11-01T12:00:00Z'},now),false,'Expired messages stay hidden');
assert.equal(validPublicNotice({...a,starts_at:'2026-11-03T00:00:00Z'},now),false,'Scheduled messages must wait');
assert.equal(validPublicNotice({...a,title:'<b>Hello</b>',body:'Safe text'},now),true,'Text accepted, DOM uses textContent');
assert.equal(validPublicNotice({...update,version_code:null},now),false,'Reject invalid release');
assert.equal(noticeForPlayer([a,update],{platform:'android',versionCode:11,storage:local,now}).id,update.id);
assert.equal(noticeForPlayer([a,update],{platform:'android',versionCode:12,storage:local,now}).id,a.id);
assert.equal(noticeForPlayer([a,update],{platform:'web',storage:local,now}).id,a.id);
assert.equal(safeNoticeLink({...update,action_url:'https://fake.example.com/evil'}),PLAY_STORE_URL,
  'Only the official fixed Play package link can be used for update alerts');
assert.equal(safeNoticeLink({...a,action_url:'javascript:alert(1)'}),null);
assert.equal(safeNoticeLink({...a,action_url:'https://example.com/tdr'}),'https://example.com/tdr');
acknowledgeCommunication(update,local);
assert.equal(noticeForPlayer([a,update],{platform:'android',versionCode:11,storage:local,now}).id,a.id,
  'Dismissed update falls through to normal notice');
acknowledgeCommunication(a,local);
assert.equal(local.getItem(noticeSeenKey(a)),'1');
const persistent=new Map(),temporary=new Map();
const persistentStore={getItem:k=>persistent.get(k)||null,setItem:(k,v)=>persistent.set(k,v)};
const sessionStore={getItem:k=>temporary.get(k)||null,setItem:(k,v)=>temporary.set(k,v)};
const perSession=communicationSeenStore(persistentStore,sessionStore);
acknowledgeCommunication(update,perSession);
acknowledgeCommunication(a,perSession);
assert.equal(noticeForPlayer([a,update],{platform:'android',versionCode:11,storage:perSession,now}),null,
  'No repeat within one game session');
temporary.clear();
assert.equal(noticeForPlayer([a,update],{platform:'android',versionCode:11,storage:perSession,now}).kind,'update',
  'After app restart, pending Play update must be offered again');
assert.equal(noticeForPlayer([a],{platform:'web',storage:perSession,now}),null,
  'Previously read ordinary announcement stays read after restart');

assert.equal(noticeForPlayer([a,update],{platform:'android',versionCode:11,storage:local,now}),null);
assert.equal(noticeForPlayer([{...a,updated_at:'2026-11-02T12:01:00Z'}],{platform:'web',storage:local,now}).kind,'notice',
  'A revised notice may appear once again');
assert.equal(playUpdateNotice({code:11,playAvailable:true,playVersionCode:12},now).version_code,12,
  'Play update notice is generated without any Supabase publication');
assert.equal(playUpdateNotice({code:12,playAvailable:true,playVersionCode:12},now),null);
assert.equal(playUpdateNotice({code:11,playAvailable:false,playVersionCode:12},now),null);
assert.equal(playUpdateNotice({code:11,playAvailable:true,playVersionCode:0},now),null);

const ui=readFileSync('src/game/ui/liveCommunicationsUi.js','utf8');
const lobby=readFileSync('src/game/ui/LobbyDomUi.js','utf8');
const admin=readFileSync('src/game/ui/adminCommunications.js','utf8');
const paddock=readFileSync('src/game/ui/adminPaddockView.js','utf8');
const adminScene=readFileSync('src/game/scenes/AdminHubScene.js','utf8');
const native=readFileSync('android/app/src/main/java/com/craftracestudio/topdownrace/TdrRewardedAdsPlugin.kt','utf8');
const gradle=readFileSync('android/app/build.gradle','utf8');
assert.match(lobby,/installLiveCommunicationsUi\(root\)/,'Announcements load in the initial lobby');
assert.match(lobby,/disposeCommunications\?\.\(\)/,'No polling after leaving the lobby');
assert.match(ui,/document\.querySelector\('\.tdr-bf-shade'\)/,'Do not overlay the existing Black Friday popup');
assert.match(ui,/MÁS TARDE/,'Player must be able to dismiss the update');
assert.match(ui,/textContent/,'Remote text rendered without raw HTML injection');
assert.match(ui,/playUpdateNotice\(installed\)/,'Google Play available update must display without server authoring');
assert.match(ui,/known=automatic\?\[\.\.\.eligible,automatic\]:eligible/);
assert.match(admin,/tdr_staff/,'Publishing requires server-managed app metadata');
assert.match(admin,/ENTRAR CON MI CUENTA DE TDR · GOOGLE/,'Admin uses existing Google-linked player identity');
assert.match(admin,/refreshRaceControlOnlineSession\(\)/,'Admin refreshes JWT to receive server-assigned staff claim');
assert.match(admin,/hasSavedRaceControlSession\(\)/,'Admin must never create an anonymous player to login');
assert.doesNotMatch(admin,/grant_type=password/,'Disabled email/password sign-in must not be offered');
assert.doesNotMatch(admin,/password\.value/,'Admin must not collect player password');
const onlineAuth=readFileSync('src/game/online/raceControlOnline.js','utf8');
assert.match(onlineAuth,/export async function refreshRaceControlOnlineSession/);
assert.match(onlineAuth,/next\.user\.id!==old\.user\.id/,'Never exchange pilot identity');
assert.match(onlineAuth,/current\?\.refresh_token!==old\.refresh_token/,'Never overwrite rotated session');
assert.match(admin,/\/auth\/v1\/user/);
assert.match(admin,/GUARDAR EN SERVIDOR/);
assert.match(paddock,/COMUNICACIONES/);
assert.match(adminScene,/mountAdminCommunications/);
assert.match(native,/fun checkForPlayUpdate/);
assert.match(native,/info\.updateAvailability\(\) == UpdateAvailability\.UPDATE_AVAILABLE/);
assert.match(native,/result\.put\("versionCode", BuildConfig\.VERSION_CODE\)/);
assert.match(native,/fun openPlayStore/);
assert.match(gradle,/com\.google\.android\.play:app-update:2\.1\.0/);
console.log('PASS remote communications: schedule/RLS client guard, once-only, update detection, safe Play URL, admin publishing, Android Play Core bridge');
