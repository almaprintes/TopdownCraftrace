// Compact selector times: global rank-1 from the existing PUBLIC snapshot, and
// personal best from the same local record store as Statistics/Race Control.
// No authentication, polling, new profiles, or network request per circuit card.
import {playerBackendConfig} from '../online/backendConfig.js';
import {getCircuitRecord} from '../stats/localRaceRecords.js';

const TTL=3*60*1000;
let cachedPromise=null,cachedAt=0;
const goodMs=value=>{
  const n=Number(value);
  return Number.isFinite(n)&&n>1000?Math.round(n):null;
};
export function formatSelectorLap(ms){
  const value=goodMs(ms);if(!value)return '—';
  const mins=Math.floor(value/60000),secs=Math.floor(value%60000/1000),part=value%1000;
  return mins+':'+String(secs).padStart(2,'0')+'.'+String(part).padStart(3,'0');
}
export function absoluteRecordsFromSnapshot(payload){
  if(!Array.isArray(payload?.tracks))throw Error('Invalid public leaderboard snapshot');
  const result=new Map();
  for(const track of payload.tracks){
    const id=String(track?.id||'');
    if(!id)continue;
    let best=null;
    for(const entry of Array.isArray(track.entries)?track.entries:[]){
      const ms=goodMs(entry?.best_time_ms);
      if(ms&&(best===null||ms<best))best=ms;
    }
    result.set(id,best);
  }
  return result;
}
export function getSelectorLocalBest(trackId){
  try{return goodMs(getCircuitRecord(String(trackId||''))?.bestLapMs);}
  catch{return null;}
}
export async function getSelectorGlobalRecords(){
  const now=Date.now();
  if(cachedPromise&&now-cachedAt<TTL)return cachedPromise;
  cachedAt=now;
  cachedPromise=(async()=>{
    const {url,key}=playerBackendConfig();
    if(!url||!key)throw Error('Leaderboard unavailable');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5500);
    try{
      const response=await fetch(url+'/rest/v1/web_leaderboard_snapshot?select=payload&id=eq.true',{
        headers:{apikey:key},signal:controller.signal});
      if(!response.ok)throw Error('Leaderboard HTTP '+response.status);
      const rows=await response.json();
      return absoluteRecordsFromSnapshot(rows?.[0]?.payload);
    }finally{clearTimeout(timeout);}
  })();
  // A transient failure must not stick as an empty, fabricated ranking.
  cachedPromise.catch(()=>{cachedAt=0;cachedPromise=null;});
  return cachedPromise;
}
export function attachSelectorRecordDisplay(root,currentTrackId,lang='es'){
  if(!root?.isConnected||root.querySelector('.tdr-ts-locked-hero'))return null;
  const hero=root.querySelector('.tdr-ts-hero');
  if(!hero)return null;
  const english=lang==='en';
  const section=document.createElement('aside');
  section.className='tdr-ts-records';
  section.setAttribute('aria-label',english?'Circuit lap records':'Récords del circuito');
  // All dynamic text is assigned through textContent (no remote HTML).
  section.innerHTML='<div class="tdr-ts-record"><small></small><strong data-scope="global">—</strong></div><div class="tdr-ts-record"><small></small><strong data-scope="personal">—</strong></div>';
  const labels=section.querySelectorAll('small');
  labels[0].textContent=english?'ABSOLUTE RECORD':'RÉCORD ABSOLUTO';
  labels[1].textContent=english?'YOUR RECORD':'TU RÉCORD';
  hero.appendChild(section);
  const global=section.querySelector('[data-scope="global"]'),personal=section.querySelector('[data-scope="personal"]');
  const update=()=>{
    if(!root.isConnected)return;
    const id=String(currentTrackId()||'');
    if(!id)return;
    section.dataset.trackId=id;
    personal.textContent=formatSelectorLap(getSelectorLocalBest(id));
    global.textContent='…';
    getSelectorGlobalRecords().then(records=>{
      if(!root.isConnected||section.dataset.trackId!==id)return;
      const hasBoard=records.has(id),value=records.get(id);
      global.textContent=hasBoard?formatSelectorLap(value):'—';
      global.title=hasBoard
        ?(value?(english?'Public online ranking':'Clasificación pública online')
          :(english?'No published record':'Sin récord publicado'))
        :(english?'Not yet in the public ranking':'Todavía no aparece en el ranking público');
    }).catch(()=>{
      if(!root.isConnected||section.dataset.trackId!==id)return;
      global.textContent=english?'OFFLINE':'SIN CONEXIÓN';
      global.title=english?'Online ranking unavailable':'No se pudo consultar el ranking online';
    });
  };
  update();
  return {update};
}
