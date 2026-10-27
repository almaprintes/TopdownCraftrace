// Black Friday 2026 / emergency ad-free promotional event.
// Never claim a Google or RevenueCat ad was viewed or verified.
import {playerBackendConfig} from '../online/backendConfig.js';

export const BLACK_FRIDAY_PROMOTION_ID='november_2026';
export const PROMO_START_MS=Date.parse('2026-10-27T21:00:00Z');
export const PROMO_END_MS=Date.parse('2026-12-01T00:00:00Z');
const REFRESH_MS=15*60*1000;
let remote=null;
let lastRead=0;
let pending=null;

const validWindow=(start,end,now)=>Number.isFinite(start)&&Number.isFinite(end)&&
  start<=now&&now<end;

export function isAdFreePromoActive(now=Date.now()){
  // Bundled default ensures the published November promise is honoured even
  // offline and before the first network request. Server may extend the promo
  // or explicitly disable it; never treat network failure as ad consent.
  if(remote!==null){
    return remote.enabled===true&&validWindow(remote.startsAt,remote.endsAt,now);
  }
  return validWindow(PROMO_START_MS,PROMO_END_MS,now);
}

export function isBlackFridayPromoWindow(now=Date.now()){
  return isAdFreePromoActive(now);
}

export async function refreshAdFreePromoControl({force=false}={}){
  const now=Date.now();
  if(!force&&now-lastRead<REFRESH_MS)return isAdFreePromoActive();
  if(pending)return pending;
  pending=(async()=>{
    try{
      const {url,key}=playerBackendConfig();
      if(!url||!key)return isAdFreePromoActive();
      const endpoint=url+'/rest/v1/tdr_promotion_control?id=eq.november_2026&select=id,enabled,starts_at,ends_at';
      const response=await fetch(endpoint,{headers:{apikey:key},cache:'no-store'});
      if(!response.ok)throw new Error('promo_http_'+response.status);
      const rows=await response.json();
      const row=Array.isArray(rows)?rows[0]:null;
      const startsAt=Date.parse(row?.starts_at||'');
      const endsAt=Date.parse(row?.ends_at||'');
      if(row?.id!==BLACK_FRIDAY_PROMOTION_ID||
        typeof row?.enabled!=='boolean'||!Number.isFinite(startsAt)||
        !Number.isFinite(endsAt)||endsAt<=startsAt)
        throw new Error('promo_invalid_response');
      remote={enabled:row.enabled,startsAt,endsAt};
      lastRead=Date.now();
      try{window.dispatchEvent(new CustomEvent('tdr:promotion-changed',
        {detail:{active:isAdFreePromoActive()}}));}catch{}
    }catch(error){
      // Keep the default promise; avoid a failed request on every button click.
      lastRead=Date.now();
      console.warn('[TDR promotion] remote control unavailable',error?.message||'offline');
    }
    return isAdFreePromoActive();
  })().finally(()=>{pending=null;});
  return pending;
}

export function installAdFreePromoControl(){
  void refreshAdFreePromoControl();
  if(typeof document!=='undefined'){
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')void refreshAdFreePromoControl();
    });
  }
}
