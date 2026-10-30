// TDR Remote Communications — read-only public feed. No continuous sockets.
// Do not put service-role/secret keys in the client. Supabase RLS filters live rows.
import {playerBackendConfig} from './backendConfig.js';
import {Capacitor,registerPlugin} from '@capacitor/core';

export const PLAY_STORE_URL='https://play.google.com/store/apps/details?id=com.craftracestudio.topdownrace';
// Communications are frozen for one app runtime. No mid-session polling.

// Spanish is the legacy/default message. An English translation must be authored
// and checked before publication; never machine-translate game announcements.
export function hasEnglishNoticeTranslation(record){
  const en=record?.translations?.en;
  const title=String(en?.title||'').trim(),body=String(en?.body||'').trim();
  const label=String(en?.action_label||'').trim();
  return title.length>=1&&title.length<=90&&body.length>=1&&body.length<=600&&
    (record?.kind==='update'||!record?.action_label||(label.length>=1&&label.length<=28));
}
export function localizePublicNotice(record,language='es'){
  if(language!=='en'||!hasEnglishNoticeTranslation(record))return record;
  const en=record.translations.en;
  return {...record,title:en.title.trim(),body:en.body.trim(),
    action_label:record.kind==='update'?'UPDATE ON GOOGLE PLAY':
      String(en.action_label||'').trim()||null};
}
const NATIVE=registerPlugin('TdrRewardedAds');
let snapshot=null, pending=null;

export function validPublicNotice(record,now=Date.now()){
  if(!record||record.active!==true||!['notice','update'].includes(record.kind)||
    !['all','android','web','ios'].includes(record.target))return false;
  if(!/^[a-f0-9-]{36}$/i.test(String(record.id||'')))return false;
  if(!String(record.title||'').trim()||String(record.title).length>90||
    !String(record.body||'').trim()||String(record.body).length>600)return false;
  const start=Date.parse(record.starts_at||''),end=record.ends_at?Date.parse(record.ends_at):Infinity;
  if(!Number.isFinite(start)||start>now||end<=now)return false;
  if(record.kind==='update'&&
    (record.target!=='android'||!Number.isInteger(record.version_code)||record.version_code<=0))return false;
  return true;
}

export async function fetchLiveCommunications(){
  if(snapshot)return snapshot;
  if(pending)return pending;
  pending=(async()=>{
    try{
      const {url,key}=playerBackendConfig();
      if(!url||!key){snapshot=[];return snapshot;}
      const endpoint=url+'/rest/v1/tdr_public_notices?select=id,kind,target,title,body,action_label,action_url,version_code,priority,active,starts_at,ends_at,updated_at,translations&active=eq.true&order=priority.desc,created_at.desc&limit=30';
      const response=await fetch(endpoint,{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(6500)});
      if(!response.ok)throw Error('communications_http_'+response.status);
      const rows=await response.json();
      if(!Array.isArray(rows))throw Error('communications_invalid_response');
      snapshot=rows.filter(record=>validPublicNotice(record)).slice(0,20);
    }catch(error){
      // Opening the game must never depend on a successful network request.
      console.warn('[TDR communications] offline or unavailable',error?.message||'unknown');
      snapshot=snapshot||[];
    }
    return snapshot;
  })().finally(()=>{pending=null;});
  return pending;
}

export async function installedAndroidVersion(){
  if(!Capacitor.isNativePlatform?.()||Capacitor.getPlatform?.()!=='android')return null;
  try{
    const status=await NATIVE.getStatus();
    const code=Number(status?.versionCode);
    if(!Number.isSafeInteger(code)||code<1)return null;
    // Play Core is the source of truth for each player's eligible rollout.
    // A missing Play store/network response is "unknown", not "no update".
    const play=await Promise.race([
      Promise.resolve().then(()=>NATIVE.checkForPlayUpdate()).catch(()=>null),
      new Promise(resolve=>setTimeout(()=>resolve(null),5000))
    ]);
    return {
      code,version:String(status.versionName||''),
      playChecked:play?.checked===true,
      playAvailable:play?.available===true,
      playVersionCode:Math.max(0,Math.floor(Number(play?.availableVersionCode)||0))
    };
  }catch{return null;}
}

export function playUpdateNotice(installed,now=Date.now()){
  if(!installed?.playAvailable||!Number.isSafeInteger(installed.code)||
    !Number.isSafeInteger(installed.playVersionCode)||
    installed.playVersionCode<=installed.code)return null;
  return {
    id:'00000000-0000-0000-0000-000000000000',
    kind:'update',target:'android',active:true,priority:0,
    title:'¡Nueva versión disponible!',
    body:'Google Play tiene una actualización de Top Down RACE lista para tu dispositivo. Puedes instalarla ahora o seguir jugando.',
    action_label:'ACTUALIZAR EN GOOGLE PLAY',action_url:PLAY_STORE_URL,
    version_code:installed.playVersionCode,updated_at:'play:'+installed.playVersionCode,
    translations:{en:{title:'New version available!',
      body:'Google Play has a Top Down RACE update ready for your device. Install it now or keep playing.',
      action_label:'UPDATE ON GOOGLE PLAY'}},
    starts_at:'2000-01-01T00:00:00Z',ends_at:null
  };
}

export function noticeForPlayer(rows,{platform='web',versionCode=0,storage=null,now=Date.now()}={}){
  const relevant=(rows||[]).filter(record=>validPublicNotice(record,now)&&
    (record.target==='all'||record.target===platform));
  const updates=relevant.filter(record=>record.kind==='update'&&platform==='android'&&
    Number.isInteger(versionCode)&&versionCode>0&&record.version_code>versionCode);
  if(updates.length){
    // A later version always wins, even if another announcement has higher priority.
    updates.sort((a,b)=>b.version_code-a.version_code||Number(b.priority||0)-Number(a.priority||0));
    const next=updates[0];
    if(storage?.getItem?.('tdr2:remoteUpdateDismissed:'+next.version_code)==='1')
      return relevant.filter(record=>record.kind==='notice'&&!wasSeen(record,storage))[0]||null;
    return next;
  }
  return relevant.filter(record=>record.kind==='notice'&&!wasSeen(record,storage))[0]||null;
}

export function noticeSeenKey(record){
  return 'tdr2:remoteNoticeSeen:'+String(record?.id||'')+':'+String(record?.updated_at||'');
}
 
// Players see ordinary notices once per publication, but are reminded of a
// still-pending Play update on the next app launch (not endlessly per lobby).
export function communicationSeenStore(local=globalThis.localStorage,session=globalThis.sessionStorage){
  const source=key=>String(key).startsWith('tdr2:remoteUpdateDismissed:')?session:local;
  return {
    getItem(key){try{return source(key)?.getItem?.(key)||null;}catch{return null;}},
    setItem(key,value){try{source(key)?.setItem?.(key,value);}catch{}}
  };
}
function wasSeen(record,storage){
  try{return storage?.getItem?.(noticeSeenKey(record))==='1';}catch{return false;}
}
export function acknowledgeCommunication(record,storage){
  try{
    if(record?.kind==='update')storage?.setItem?.('tdr2:remoteUpdateDismissed:'+record.version_code,'1');
    else storage?.setItem?.(noticeSeenKey(record),'1');
  }catch{}
}

export function safeNoticeLink(record){
  if(record?.kind==='update')return PLAY_STORE_URL;
  try{
    const url=new URL(String(record?.action_url||''));
    return url.protocol==='https:'?url.href:null;
  }catch{return null;}
}

export async function openCommunicationLink(record){
  const url=safeNoticeLink(record);
  if(!url)return false;
  if(record?.kind==='update'&&Capacitor.isNativePlatform?.()&&
    Capacitor.getPlatform?.()==='android'){
    try{await NATIVE.openPlayStore();return true;}catch(error){
      console.warn('[TDR update] Play application unavailable',error?.message||'unknown');
    }
  }
  try{window.open(url,'_blank','noopener,noreferrer');return true;}
  catch{return false;}
}
