// Recoverable player progression. A backup never includes auth credentials,
// transient ad claims, developer/admin overrides or device-specific settings.
import { activateRaceControlOnline, savedGoogleWebIdentity } from '../online/raceControlOnline.js';
import { createPlayerProgressRepository } from '../online/playerProgressRepository.js';
import {Capacitor,registerPlugin} from '@capacitor/core';

const store=createPlayerProgressRepository();
export const CLOUD_SAVE_FORMAT=2;
// Leave margin below the 512-KiB server-side JSONB quota. No partial backups.
export const MAX_CLOUD_BYTES=470000;
// Small, device-local receipt. Never upload it and never treat it as server authentication.
const CLOUD_RECEIPT='tdr2:cloudConfirmed:v1';
let cloudWritePending=false;
function exclusiveCloudWrite(task){
  if(cloudWritePending)throw new Error('Ya se está guardando otra copia. Vuelve a intentarlo.');
  cloudWritePending=true;
  return Promise.resolve().then(task).finally(()=>{cloudWritePending=false;});
}
export function cloudConfirmedMarker(id){
  if(!id)return null;
  try{
    const value=JSON.parse(localStorage.getItem(CLOUD_RECEIPT)||'null');
    return value?.id===id&&Number.isSafeInteger(value.revision)&&value.revision>0&&
      /^[a-f0-9]{64}$/.test(value.digest||'')?value:null;
  }catch{return null;}
}
export async function cloudDataDigest(data){
  const bytes=new TextEncoder().encode(canonicalJson(data));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function markCloudConfirmed(id,revision,data){
  if(!id||!Number.isSafeInteger(revision)||revision<1)return false;
  const digest=await cloudDataDigest(data);
  try{
    localStorage.setItem(CLOUD_RECEIPT,JSON.stringify({id,revision,digest}));
    if(!cloudConfirmedMarker(id))return false;
    try{window.dispatchEvent(new Event('tdr:cloudsave-confirmed'));}catch{}
    return true;
  }catch{return false;}
}
const JSON_KEYS=new Set([
  'tdr2:playerStats:v1','tdr2:carUnlocks:v1','tdr2:garageFusion:v1',
  'tdr2:pilotProfile:v1','tdr2:pilotRankingLocalLocation:v1','tdr2:raceRecords:v1',
  'tdr2:seasonInduction:v1','tdr2:seasonCuper:v1','tdr2:seasonSkinUnlocks:v1',
  'tdr2:seasonTelemetry:v1','tdr2:cleanLapTelemetry:v1',
  'tdr2:cleanLapMissions:v1'
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
function canonicalJson(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>
    JSON.stringify(key)+':'+canonicalJson(value[key])
  ).join(',')+'}';
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
  const identity=await cloudIdentity();
  const row=await store.read(identity,{statusOnly:true});
  return {id:identity.id,existing:!!row,revision:row?.revision||0,
    updatedAt:row?.updatedAt||null};
}
async function saveBackup(expectedRevision,{socialAccountId=null}={}){
  const identity=await cloudIdentity();
  // Never accidentally upload the previous phone's locally cached save into a
  // different account just because authentication changed successfully.
  let pending=null;
  try{pending=localStorage.getItem('tdr2:cloudLoginPendingRestore:v1');}catch{}
  if(pending&&!(expectedRevision===0&&socialAccountId===identity.id&&pending===identity.id&&localStorage.getItem('tdr2:socialSavePending:v1')===identity.id))throw new Error('Primero recupera la partida de esta cuenta; no se ha sobrescrito la nube.');
  const snapshot=localProgressSnapshot();
  const row=await store.save(identity,snapshot,expectedRevision);
  if(!row?.saved)throw new Error('La copia cambió en otro dispositivo. No se ha sobrescrito. Recarga su estado.');
  // Read back server state before declaring a backup safe for reinstall.
  const persisted=await store.read(identity);
  if(persisted?.revision!==row.revision||!persisted?.snapshot)
    throw new Error('La copia se guardó pero no se ha podido verificar su lectura; no desinstales.');
  const actualData=validatedSnapshot(persisted.snapshot);
  if(canonicalJson(actualData)!==canonicalJson(snapshot.data))
    throw new Error('La copia leída del servidor difiere de la partida. No desinstales.');
  await markCloudConfirmed(identity.id,row.revision,snapshot.data);
  return {id:identity.id,revision:row.revision,keys:Object.keys(snapshot.data).length,
    bytes:new TextEncoder().encode(JSON.stringify(snapshot)).length,verified:true};
}
// Revision 0 permits only the first backup, even under concurrent device writes.
export async function createFirstCloudBackup(options){
  return exclusiveCloudWrite(()=>saveBackup(0,options));
}
export async function updateCloudBackup(expectedRevision){
  const revision=Number(expectedRevision);
  if(!Number.isSafeInteger(revision)||revision<1)throw new Error('Revisión de copia inválida.');
  return exclusiveCloudWrite(()=>saveBackup(revision));
}
// Auto writes are limited to a previously confirmed *same-device* baseline.
// The RPC performs an atomic revision CAS. Unlike manual saves, no full 125-KB
// download is needed to read back an already committed PostgreSQL transaction.
// Any mismatch fails closed; manual recovery keeps its full content verification.
export async function updateCloudBackupAutomatically(expectedRevision){
  return exclusiveCloudWrite(async()=>{
    const id=savedGoogleWebIdentity();
    const receipt=cloudConfirmedMarker(id);
    if(!receipt||receipt.revision!==expectedRevision)
      throw new Error('Confirma primero tu última copia en Cuenta.');
    if(localStorage.getItem('tdr2:cloudLoginPendingRestore:v1'))
      throw new Error('Debes decidir qué partida recuperar antes de sincronizar.');
    const identity=await cloudIdentity();
    if(identity.id!==id||savedGoogleWebIdentity()!==id)
      throw new Error('Se ha cambiado de cuenta. La nube permanece intacta.');
    const snapshot=localProgressSnapshot();
    const digest=await cloudDataDigest(snapshot.data);
    if(cloudConfirmedMarker(id)?.revision!==expectedRevision)
      throw new Error('Se ha actualizado la copia desde otra operación.');
    if(digest===receipt.digest)return {saved:false,unchanged:true,revision:expectedRevision};
    if(savedGoogleWebIdentity()!==id)
      throw new Error('La cuenta cambió durante el guardado.');
    const row=await store.save(identity,snapshot,expectedRevision);
    if(!row?.saved){
      const error=new Error('La nube tiene otra revisión. Compara las partidas antes de guardar.');
      error.code='TDR_CLOUD_CONFLICT';
      throw error;
    }
    await markCloudConfirmed(id,row.revision,snapshot.data);
    return {saved:true,revision:row.revision,bytes:new TextEncoder().encode(JSON.stringify(snapshot)).length};
  });
}
export async function readCloudBackup(){
  const identity=await cloudIdentity();
  const row=await store.read(identity);
  if(!row)return null;
  validatedSnapshot(row.snapshot);
  return {id:identity.id,revision:row.revision,updatedAt:row.updatedAt,
    snapshot:row.snapshot,keys:Object.keys(row.snapshot.data).length};
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
  const local=restoreLocalProgress(cloud.snapshot);
  // Clear the inter-account guard only after a successful fully verified
  // restoration. Never clear auth tokens or overwrite other players' saves.
  try{localStorage.removeItem('tdr2:cloudLoginPendingRestore:v1');localStorage.removeItem('tdr2:socialSavePending:v1');}catch{}
  await markCloudConfirmed(cloud.id,cloud.revision,cloud.snapshot.data);
  return {...cloud,...local};
}
// Portable exports contain ONLY the schema-versioned save, never tokens,
// credentials, external OAuth identities or Supabase PostgREST metadata.
export function exportLocalProgressJson(){
  const snapshot=localProgressSnapshot();
  return JSON.stringify(snapshot,null,2);
}
export async function exportCloudProgressJson(){
  const backup=await readCloudBackup();
  if(!backup)throw new Error('Esta cuenta aún no tiene ninguna copia que exportar.');
  return JSON.stringify(backup.snapshot,null,2);
}
const androidPortableSave=registerPlugin('TdrPortableSave');

// Returns an explicit status. No longer claim a file was downloaded just because
// an <a download> was clicked inside Android's WebView.
export async function downloadPortableSave(json,filename='top-down-race-partida.json'){
  const snapshot=JSON.parse(json);
  validatedSnapshot(snapshot);
  if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'){
    let result;
    try{result=await androidPortableSave.saveJsonFile({json,filename});}
    catch(error){throw new Error('Android no pudo guardar el archivo JSON: '+String(error?.message||'error del selector de archivos'));}
    if(result?.cancelled===true)return {status:'cancelled'};
    if(result?.saved!==true)throw new Error('Android no ha confirmado que se haya guardado la copia.');
    return {status:'saved',filename:result.filename||filename};
  }
  const blob=new Blob([json],{type:'application/json'});
  const link=document.createElement('a');
  const objectUrl=URL.createObjectURL(blob);
  try{
    link.href=objectUrl;
    link.download=filename;
    link.style.display='none';
    document.body.appendChild(link);
    link.click();
  }finally{
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
  }
  // The browser provides no reliable download-complete callback for blob links.
  return {status:'requested',filename};
}
export function shortPlayerId(id){return String(id||'').slice(0,8).toUpperCase();}
