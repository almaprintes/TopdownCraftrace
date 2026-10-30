// TDR Remote Communications — read-only public feed. No continuous sockets.
// Do not put service-role/secret keys in the client. Supabase RLS filters live rows.
import {playerBackendConfig} from './backendConfig.js';
import {Capacitor,registerPlugin} from '@capacitor/core';

export const PLAY_STORE_URL='https://play.google.com/store/apps/details?id=com.craftracestudio.topdownrace';
export const COMMUNICATION_REFRESH_MS=30*60*1000;
const NATIVE=registerPlugin('TdrRewardedAds');
let snapshot=null, lastFetch=0, pending=null;

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

export async function fetchLiveCommunications({force=false}={}){
  if(!force&&snapshot&&Date.now()-lastFetch<COMMUNICATION_REFRESH_MS)return snapshot;
  if(pending)return pending;
  pending=(async()=>{
    try{
      const {url,key}=playerBackendConfig();
      if(!url||!key)return [];
      const endpoint=url+'/rest/v1/tdr_public_notices?select=id,kind,target,title,body,action_label,action_url,version_code,priority,active,starts_at,ends_at,updated_at&active=eq.true&order=priority.desc,created_at.desc&limit=30';
      const response=await fetch(endpoint,{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(6500)});
      if(!response.ok)throw Error('communications_http_'+response.status);
      const rows=await response.json();
      if(!Array.isArray(rows))throw Error('communications_invalid_response');
      snapshot=rows.filter(record=>validPublicNotice(record)).slice(0,20);
      lastFetch=Date.now();
    }catch(error){
      // Opening the game must never depend on a successful network request.
      console.warn('[TDR communications] offline or unavailable',error?.message||'unknown');
      snapshot=snapshot||[];
      lastFetch=Date.now();
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
    return Number.isSafeInteger(code)&&code>0
      ?{code,version:String(status.versionName||'')} : null;
  }catch{return null;}
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
