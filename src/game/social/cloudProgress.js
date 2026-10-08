// Optional cloud backup. Local saves remain authoritative until the player explicitly restores.
// Uses the same anonymous Supabase identity as Race Control; no second player ID is created.
import { activateRaceControlOnline } from '../online/raceControlOnline.js';
const URL=String(import.meta.env.VITE_TDR_ONLINE_URL||'https://juukbnkjboiazqggqcyv.supabase.co').trim();
const KEY=String(import.meta.env.VITE_TDR_ONLINE_PUBLIC||'sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB').trim();
const STORAGE_KEYS=['tdr2:pilotProfile:v1','tdr2:playerStats:v1','tdr2:carUnlocks:v1','tdr2:garageFusion:v1'];
const allowedKey=key=>STORAGE_KEYS.includes(key)||key.startsWith('tdr2:ttHist:');
export function localProgressSnapshot(){
  const data={};try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||!allowedKey(key))continue;const raw=localStorage.getItem(key);if(raw!==null){try{data[key]=JSON.parse(raw);}catch{}}}}catch{}
  return {format:1,createdAt:new Date().toISOString(),data};
}
export async function cloudIdentity(){const online=await activateRaceControlOnline();return {id:online.session.user.id,token:online.session.access_token};}
async function api(path,token,options={}){
 const res=await fetch(URL+path,{...options,headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
 const result=await res.json().catch(()=>null);
 if(!res.ok)throw new Error(result?.message||result?.error||'Cloud HTTP '+res.status);
 return result;
}
export async function cloudBackupStatus(){
 const {id,token}=await cloudIdentity();
 const rows=await api('/rest/v1/player_progress?select=revision,updated_at&user_id=eq.'+encodeURIComponent(id),token);
 return {id,existing:Array.isArray(rows)&&rows.length>0,revision:rows?.[0]?.revision||0,updatedAt:rows?.[0]?.updated_at||null};
}
// Never overwrite an existing cloud backup without explicit conflict resolution.
export async function createFirstCloudBackup(){
 const {id,token}=await cloudIdentity();
 const snapshot=localProgressSnapshot();
 const bytes=new TextEncoder().encode(JSON.stringify(snapshot)).length;
 if(bytes>120000)throw new Error('La partida supera el límite de 120 KB; no se ha modificado nada.');
 const result=await api('/rest/v1/rpc/save_my_player_progress',token,{method:'POST',body:JSON.stringify({p_progress:snapshot,p_expected_revision:0})});
 const row=Array.isArray(result)?result[0]:result;
 if(!row?.saved)throw new Error('Ya existe una copia en la nube. No se ha sobrescrito.');
 return {id,revision:row.current_revision};
}
export function shortPlayerId(id){return String(id||'').slice(0,8).toUpperCase();}
