import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validPublicNotice,noticeForPlayer,acknowledgeCommunication,noticeSeenKey,communicationSeenStore,playUpdateNotice,safeNoticeLink,PLAY_STORE_URL,hasEnglishNoticeTranslation,localizePublicNotice} from '../src/game/online/liveCommunications.js';
import {splitTranslationSegments,translateCommunicationDraft} from '../src/game/online/communicationTranslation.js';

const now=Date.parse('2026-11-02T12:00:00Z');
const id='11111111-1111-4111-8111-111111111111';
const a={id,kind:'notice',target:'all',active:true,priority:10,
  title:'¡Bienvenidos!',body:'Nueva temporada',version_code:null,
  starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-12-01T00:00:00Z',updated_at:'2026-11-02T00:00:00Z'};
const update={...a,id:'22222222-2222-4222-8222-222222222222',kind:'update',target:'android',
  version_code:12,title:'Actualiza TDR',action_url:PLAY_STORE_URL,priority:50};
const storage=new Map(),local={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
assert.equal(validPublicNotice(a,now),true);
const bilingual={...a,translations:{en:{title:'Welcome!',body:'New season'}}};
assert.equal(hasEnglishNoticeTranslation(bilingual),true);
assert.equal(hasEnglishNoticeTranslation({...a,translations:{en:{title:'Welcome!'}}}),false,
  'Publishing requires both English title and message');
assert.equal(localizePublicNotice(bilingual,'es').title,a.title);
assert.equal(localizePublicNotice(bilingual,'en').title,'Welcome!');
assert.equal(localizePublicNotice(bilingual,'en').body,'New season');
assert.equal(localizePublicNotice(bilingual,'fr').body,a.body,
  'Unsupported languages retain the Spanish canonical message');
assert.equal(hasEnglishNoticeTranslation({...bilingual,action_label:'MÁS INFO'}),false,
  'A custom Spanish button requires its English translation');
assert.equal(localizePublicNotice({...bilingual,action_label:'MÁS INFO',
  translations:{en:{title:'Welcome!',body:'New season',action_label:'MORE INFO'}}},'en').action_label,'MORE INFO');
assert.equal(localizePublicNotice(playUpdateNotice({code:11,playAvailable:true,playVersionCode:12},now),'en').title,
  'New version available!','Play-sourced updates are bilingual too');
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

const huge='¡Árboles y curvas! '.repeat(40);
const parts=splitTranslationSegments(huge);
assert.ok(parts.length>1,'Long Spanish drafts must be split into safe segments');
assert.ok(parts.every(p=>!p.translate||new TextEncoder().encode(p.text.trim()).length<=500),
  'MyMemory must never receive more than 500 UTF-8 bytes in one segment');
const requests=[];
const mockTranslation=async url=>{
  const address=new URL(url);
  assert.equal(address.hostname,'api.mymemory.translated.net');
  assert.equal(address.searchParams.get('langpair'),'es|en');
  requests.push(address.searchParams.get('q'));
  return {ok:true,json:async()=>({responseStatus:200,
    responseData:{translatedText:'EN '+address.searchParams.get('q')}})};
};
const translated=await translateCommunicationDraft({title:'Hola',body:'Primera línea.\nSegunda línea.',actionLabel:'Ver más'},mockTranslation);
assert.equal(translated.title,'EN Hola');
assert.ok(translated.body.includes('\n'),'Preserve paragraph boundaries');
assert.equal(translated.action_label,'EN Ver más');
assert.equal(requests.length,4,'Translate title, two body paragraphs, and button separately');
await assert.rejects(()=>translateCommunicationDraft({title:'Hola',body:'Mensaje'},
  async()=>({ok:true,json:async()=>({responseStatus:429,responseDetails:'limit'})})),
  /cuota|rechazado/,'Reject provider quota failures without inventing an English text');
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
assert.match(ui,/localizePublicNotice\(notice/,'Player notice uses selected language');
assert.match(ui,/getLanguage\(\)/,'Read the TDR language setting');
assert.match(admin,/TÍTULO · ENGLISH/,'Admin must author an English title');
assert.match(admin,/MENSAJE · ENGLISH/,'Admin must author an English body');
assert.match(admin,/hasEnglishNoticeTranslation\(row\)/,'Cannot publish incomplete translations');
assert.match(admin,/affected\.length!==1/,'Write success requires exactly one changed server row');
assert.match(admin,/function editorView\(record=null\)\{\s*notice\(''\)/,
  'Old success banners must be cleared before editing a new message');
const adminStyles=readFileSync('src/game/ui/adminCommunications.css','utf8');
assert.match(adminStyles,/flex-direction:column;overflow:hidden/,
  'Keep the admin header outside the scrollable content');
assert.match(adminStyles,/min-height:0;overflow-y:auto;overscroll-behavior:contain/,
  'Only the message editor scrolls, avoiding sticky-header overlap');
const liveSource=readFileSync('src/game/online/liveCommunications.js','utf8');
assert.match(liveSource,/updated_at,translations/,'Public REST feed includes translations');
assert.doesNotMatch(liveSource,/lastFetch|COMMUNICATION_REFRESH_MS/,
  'Freeze fetched notices for the entire app runtime');
assert.match(liveSource,/if\(snapshot\)return snapshot/,
  'Reload only after a fresh game startup');
assert.match(ui,/playUpdateNotice\(installed\)/,'Google Play available update must display without server authoring');
assert.match(ui,/getOpeningCommunications\(\)/,
  'Opening communications must be captured once per application runtime');
assert.match(ui,/if\(!launchRead\)launchRead=Promise\.all/,
  'Shared promise must freeze the feed and Play update status at app start');
assert.doesNotMatch(ui,/setInterval\(/,'No polling while players are racing or using the lobby');
assert.match(ui,/automaticNoticeShownThisLaunch=true/,
  'Do not repeat automatic notices when returning to the lobby');
assert.match(admin,/TRADUCIR AL INGLÉS/,'Admin can translate Spanish draft on demand');
assert.match(admin,/translateCommunicationDraft\(source\)/,'Admin uses external translator only on user click');
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
assert.match(admin,/verified\?\.id!==staffUserId/,'Refreshed staff JWT must belong to original administrator');
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
