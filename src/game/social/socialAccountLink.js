// Safe handoff after a REAL Supabase Google/Apple sign-in.
// This module never starts OAuth; the platform-specific provider setup and
// verified callback must finish before it can be called.
// No automatic restore, merge, overwrite or profile takeover.
import {currentRaceControlAccount,getMyRaceControlProfile,
  claimRaceControlPilotNick,syncRaceControlProfile} from '../online/raceControlOnline.js';
import {getPilotProfile} from './pilotProfile.js';
import {localProgressSnapshot,cloudBackupStatus,createFirstCloudBackup} from './cloudProgress.js';
import {resolveRaceRankingLocation} from './pilotRankingGeography.js';

const LOCAL_GEO_KEY='tdr2:pilotRankingLocalLocation:v1';

function localRankingLocation(storage){
  const raw=storage.getItem(LOCAL_GEO_KEY);
  if(!raw)return null;
  let value;
  try{value=JSON.parse(raw);}catch{throw new Error('Tu región local no se puede leer. No se ha modificado la nube.');}
  const {continentCode,countryCode,regionCode}=resolveRaceRankingLocation(value||{});
  return {continentCode,countryCode,regionCode};
}

export function assessSocialLink({account,backup,pilotName,onlineProfile}={}){
  if(!account?.id||!Array.isArray(account.socialProviders)||
    !account.socialProviders.some(p=>p==='google'||p==='apple')||account.anonymous)
    throw new Error('Verifica primero tu identidad con Google o Apple. Tu partida local sigue intacta.');
  if(!pilotName||pilotName.length<3||pilotName.length>16)
    throw new Error('Elige un nombre de piloto antes de proteger tu partida.');
  if(!backup||backup.id!==account.id)
    throw new Error('La identidad de Supabase no coincide con la copia. No se ha guardado nada.');
  if(backup.existing)
    return {status:'existing-cloud-save',accountId:account.id,
      message:'Esta cuenta ya tiene una partida en la nube. Compara ambas antes de decidir; no se han fusionado ni reemplazado.'};
  if(onlineProfile&&onlineProfile.nick!==pilotName)
    return {status:'pilot-mismatch',accountId:account.id,
      message:'Esta cuenta ya pertenece a otro nombre de piloto. No hemos modificado tu partida.'};
  return {status:'ready',accountId:account.id};
}

// Called ONLY after the social sign-in has returned a verified user session
// AND the player has explicitly chosen to protect the current local save.
// Returning a conflict is not an error: it requires a separate user decision.
// The existing save wins until that decision; coins are never summed.
export async function protectLocalSaveAfterSocialSignIn({playerConfirmed=false}={}){
  if(playerConfirmed!==true)
    throw new Error('Confirma que quieres proteger tu partida antes de subir nada.');
  const snapshot=localProgressSnapshot(); // ensure a complete valid local save first
  const pilotName=String(getPilotProfile()?.name||'').trim();
  const location=localRankingLocation(localStorage);
  const account=await currentRaceControlAccount(); // verified server user
  const backup=await cloudBackupStatus();
  const onlineProfile=await getMyRaceControlProfile();
  const plan=assessSocialLink({account,backup,pilotName,onlineProfile});
  if(plan.status!=='ready')return plan;
  if(localStorage.getItem('tdr2:cloudLoginPendingRestore:v1'))
    return {status:'pending-restore',accountId:account.id,
      message:'Hay una recuperación pendiente. Elige qué partida conservar antes de guardarla en la nube.'};
  // No uploads if local progress changes during sign-in/account inspection.
  if(JSON.stringify(localProgressSnapshot().data)!==JSON.stringify(snapshot.data))
    throw new Error('Tu partida ha cambiado. Vuelve a protegerla para guardar la versión más reciente.');
  // Reserve nickname with the SAME authenticated UUID; never seize a name
  // already claimed by another user. Server side RLS/RPC own this decision.
  if(!onlineProfile)await claimRaceControlPilotNick(pilotName);
  if(location)await syncRaceControlProfile({nick:pilotName,...location});
  const saved=await createFirstCloudBackup(); // revision 0 + server readback
  if(saved.id!==account.id||saved.verified!==true)
    throw new Error('La copia no ha podido verificarse para esta identidad. Conserva tu dispositivo.');
  return {status:'protected',accountId:account.id,revision:saved.revision,keys:saved.keys};
}
