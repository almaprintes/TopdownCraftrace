// Recoverable player progression. A backup never includes auth credentials,
// transient ad claims, developer/admin overrides or device-specific settings.
import { activateRaceControlOnline } from '../online/raceControlOnline.js';

const URL=String(import.meta.env.VITE_TDR_ONLINE_URL||'https://juukbnkjboiazqggqcyv.supabase.co').trim();
const KEY=String(import.meta.env.VITE_TDR_ONLINE_PUBLIC||'sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB').trim();
export const CLOUD_SAVE_FORMAT=2;
// Leave margin below the 512-KiB server-side JSONB quota. No partial backups.
export const MAX_CLOUD_BYTES=470000;
const JSON_KEYS=new Set([
  'tdr2:playerStats:v1','tdr2:carUnlocks:v1','tdr2:garageFusion:v1',
  'tdr2:pilotProfile:v1','tdr2:raceRecords:v1',
  'tdr2:seasonInduction:v1','tdr2:seasonTelemetry:v1','tdr2:cleanLapTelemetry:v1'
]);
const RAW_KEYS=new Set(['tdr2:carId']);
const JSON_PREFIXES=['tdr2:ttHist:','tdr2:ttBest:'];
const RAW_PREFIXES=['tdr2:masterySeen:'];
// Large topReplay/ghost blobs deliberately stay on-device (many MB). Official
// published records/ghosts are in Supabase separately. Never imply that local
// replays are backed up by this progress snapshot.
export function allowedProgressKey(key){
  return JSON_KEYS.has(key)||RAW_KEYS.has(key)||
    JSON_PREFIXES.some(prefix=>key.startsWith(prefix)&&key.length>prefix.length)||
    RAW_PREFIXES.some(prefix=>key.startsWith(prefix)&&key.length>prefix.length);
}
function rawKey(key){return RAW_KEYS.has(key)||RAW_PREFIXES.some(prefix=>key.startsWith(prefix));}
function progressIsMeaningful(data){
  return Boolean(data['tdr2:garageFusion:v1']||data['tdr2:playerStats:v1']||
    data['tdr2:carUnlocks:v1']||data['tdr2:seasonInduction:v1']||
    Object.keys(data).some(key=>key.startsWith('tdr2:ttHist:')));
}
function snapshotData(){
  const data=Object.create(null);
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!allowedProgressKey(key))continue;
      const raw=localStorage.getItem(key);
      if(raw!==null)data[key]=rawKey(key)?raw:JSON.parse(raw);
    }
  }catch{
    throw new Error('No se puede leer completamente la partida local. No se ha modificado Supabase.');
  }
  return data;
}
export function inspectLocalProgress(){
  const data=snapshotData();
  return {keys:Object.keys(data).length,meaningful:progressIsMeaningful(data),
    pilotName:String(data['tdr2:pilotProfile:v1']?.name||'').trim(),
    hasGarage:!!data['tdr2:garageFusion:v1'],hasStats:!!data['tdr2:playerStats:v1']};
}
export function localProgressSnapshot(){
  const data=snapshotData();
  if(!progressIsMeaningful(data))throw new Error('No hay una partida con progreso suficiente para guardar.');
  const snapshot={format:CLOUD_SAVE_FORMAT,createdAt:new Date().toISOString(),data};
  if(new TextEncoder().encode(JSON.stringify(snapshot)).length>MAX_CLOUD_BYTES)
    throw new Error('La partida supera el límite de copia en la nube. No se ha guardado una copia parcial.');
  return snapshot;
}
export async function cloudIdentity(){
  const online=await activateRaceControlOnline();
  return {id:online.session.user.id,token:online.session.access_token};
}
async function api(path,token,options={}){
  const res=await fetch(URL+path,{...options,headers:{apikey:KEY,Authorization:'Bearer '+token,
    'Content-Type':'application/json',...options.headers}});
  const result=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(result?.message||result?.error||'Cloud HTTP '+res.status);
  return result;
}
function validatedSnapshot(snapshot){
  if(!snapshot||![1,2].includes(snapshot.format)||!snapshot.data||
    typeof snapshot.data!=='object'||Array.isArray(snapshot.data))
    throw new Error('Formato de copia en la nube incompatible.');
  const data=Object.create(null);
  const keys=Object.keys(snapshot.data);
  if(keys.length>1000)throw new Error('Copia inválida: demasiadas entradas.');
  for(const key of keys){
    // Backups created with v1 can be read, but may only restore allowed keys.
    if(!allowedProgressKey(key))throw new Error('La copia incluye datos desconocidos; no se ha restaurado nada.');
    const value=snapshot.data[key];
    if(value===undefined||typeof value==='function'||value===null)
      throw new Error('La copia contiene valores inválidos; no se ha restaurado nada.');
    if(rawKey(key)){
      if(typeof value!=='string')throw new Error('Campo de selección inválido en la copia.');
      data[key]=value;
    }else{
      if(typeof value!=='object')throw new Error('Datos de progreso inválidos.');
      data[key]=value;
    }
  }
  if(!progressIsMeaningful(data))throw new Error('La copia no contiene una partida reconocible.');
  const bytes=new TextEncoder().encode(JSON.stringify(snapshot)).length;
  if(bytes>MAX_CLOUD_BYTES)throw new Error('La copia supera el tamaño de restauración permitido.');
  return data;
}
export async function cloudBackupStatus(){
  const {id,token}=await cloudIdentity();
  const rows=await api('/rest/v1/player_progress?select=revision,updated_at&user_id=eq.'+encodeURIComponent(id),token);
  return {id,existing:Array.isArray(rows)&&rows.length>0,
    revision:rows?.[0]?.revision||0,updatedAt:rows?.[0]?.updated_at||null};
}
async function saveBackup(expectedRevision){
  const {id,token}=await cloudIdentity();
  const snapshot=localProgressSnapshot();
  const result=await api('/rest/v1/rpc/save_my_player_progress',token,{
    method:'POST',body:JSON.stringify({p_progress:snapshot,p_expected_revision:expectedRevision})
  });
  const row=Array.isArray(result)?result[0]:result;
  if(!row?.saved)throw new Error('La copia cambió en otro dispositivo. No se ha sobrescrito. Recarga su estado.');
  return {id,revision:row.current_revision,keys:Object.keys(snapshot.data).length,bytes:new TextEncoder().encode(JSON.stringify(snapshot)).length};
}
// Revision 0 permits only the first backup, even under concurrent device writes.
export async function createFirstCloudBackup(){return saveBackup(0);}
export async function updateCloudBackup(expectedRevision){
  const revision=Number(expectedRevision);
  if(!Number.isSafeInteger(revision)||revision<1)throw new Error('Revisión de copia inválida.');
  return saveBackup(revision);
}
export async function readCloudBackup(){
  const {id,token}=await cloudIdentity();
  const rows=await api('/rest/v1/player_progress?select=revision,updated_at,progress&user_id=eq.'+encodeURIComponent(id),token);
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row)return null;
  validatedSnapshot(row.progress);
  return {id,revision:row.revision,updatedAt:row.updated_at,snapshot:row.progress,
    keys:Object.keys(row.progress.data).length};
}
export function restoreLocalProgress(snapshot){
  const data=validatedSnapshot(snapshot);
  const before=new Map();
  const incomingKeys=Object.keys(data);
  try{
    // Gather ALL current save keys before altering any data. Auth tokens are
    // explicitly outside this whitelist and cannot be removed/restored here.
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&allowedProgressKey(key))before.set(key,localStorage.getItem(key));
    }
    const staged=Object.entries(data).map(([key,value])=>[
      key,rawKey(key)?value:JSON.stringify(value)
    ]);
    for(const [key] of before)if(!Object.hasOwn(data,key))localStorage.removeItem(key);
    for(const [key,value] of staged){
      localStorage.setItem(key,value);
      if(localStorage.getItem(key)!==value)throw new Error('Fallo al escribir '+key);
    }
  }catch(error){
    // Roll back all partial writes and leave the local device intact.
    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const key=localStorage.key(i);
        if(key&&allowedProgressKey(key)&&!before.has(key))localStorage.removeItem(key);
      }
      for(const [key,value] of before)if(value!==null)localStorage.setItem(key,value);
    }catch{throw new Error('Error al recuperar la partida: reinicia la app sin jugar y contacta con soporte. '+String(error?.message||''));}
    throw new Error('No se ha podido restaurar. Se ha conservado tu partida anterior: '+String(error?.message||''));
  }
  try{window.dispatchEvent(new CustomEvent('tdr:pilotprofile',{detail:data['tdr2:pilotProfile:v1']||null}));}catch{}
  return {restoredKeys:incomingKeys.length,previousKeys:before.size};
}
export async function restoreCloudBackup(){
  const cloud=await readCloudBackup();
  if(!cloud)throw new Error('Esta cuenta aún no tiene una partida guardada.');
  return {...cloud,...restoreLocalProgress(cloud.snapshot)};
}
export function shortPlayerId(id){return String(id||'').slice(0,8).toUpperCase();}
