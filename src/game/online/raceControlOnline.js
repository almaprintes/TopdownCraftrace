// RACE Control Online — no request is made until activateRaceControlOnline().
// Auth uses the GoTrue protocol (open source, compatible with self-hosting).
import { playerBackendConfig } from './backendConfig.js';
let api=null;
// Single connection configuration allows switching to self-hosted GoTrue + Postgres.
const cfg=()=>playerBackendConfig();
const headers=(key,token)=>({'apikey':key,'Authorization':`Bearer ${token||key}`,'Content-Type':'application/json'});
const readSession=()=>{try{return JSON.parse(localStorage.getItem('tdr2:onlineSession:v1')||'null');}catch{return null;}};
const saveSession=s=>{try{localStorage.setItem('tdr2:onlineSession:v1',JSON.stringify(s));}catch{}};
// GoTrue REST may omit expires_at; supabase-js normally adds it.
const normalizeSession=s=>{
  if(!s||!s.access_token||!s.user?.id)return s;
  const expires_at=Number(s.expires_at)||(
    Number.isFinite(Number(s.expires_in))?Math.floor(Date.now()/1000)+Number(s.expires_in):0
  );
  return {...s,expires_at};
};
const sessionUsable=s=>Boolean(s?.access_token&&s?.user?.id&&Number(s?.expires_at||0)*1000>Date.now()+30000);

async function request(path,{method='GET',body,token}={}){
  const {url,key}=cfg();if(!url||!key)throw new Error('Online backend not configured');
  const res=await fetch(`${url}${path}`,{method,headers:headers(key,token),body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||`Online HTTP ${res.status}`);
  return data;
}

export async function activateRaceControlOnline(){
  if(sessionUsable(api?.session))return api;
  const old=readSession();
  if(sessionUsable(old)){api={session:old};return api;}
  if(old?.refresh_token){
    try{
      const refreshed=normalizeSession(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:old.refresh_token}}));
      if(sessionUsable(refreshed)&&(!old.user?.id||old.user.id===refreshed.user.id)){
        saveSession(refreshed);api={session:refreshed};return api;
      }
    }catch(error){
      // Never silently create an anonymous player when a permanent login expires.
      if(old?.user?.email||old?.user?.is_anonymous===false)
        throw new Error('La sesión de tu cuenta caducó. Entra de nuevo con tu correo; la copia de la nube sigue a salvo.');
    }
    if(old?.user?.email||old?.user?.is_anonymous===false)
      throw new Error('No se pudo renovar tu cuenta. Inicia sesión con correo para recuperar tu ID.');
  }
  const session=normalizeSession(await request('/auth/v1/signup',{method:'POST',body:{}}));
  if(!sessionUsable(session))throw new Error('Anonymous session unavailable');
  saveSession(session);api={session};return api;
}

// All account operations reuse the existing Race Control Supabase user ID.
const cleanEmail=email=>{
  const value=String(email||'').trim().toLowerCase();
  if(value.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('Introduce un correo electrónico válido.');
  return value;
};
const cleanPassword=value=>{
  const pwd=String(value||'');
  if(pwd.length<10||pwd.length>128)throw new Error('La contraseña debe tener entre 10 y 128 caracteres.');
  return pwd;
};
const activeSession=async()=> (await activateRaceControlOnline()).session;
const persistAuthSession=(incoming,expectedId=null)=>{
  const session=normalizeSession(incoming);
  if(!sessionUsable(session))throw new Error('No se ha recibido una sesión válida de Supabase.');
  if(expectedId&&session.user.id!==expectedId)throw new Error('La sesión recibida pertenece a otro piloto.');
  saveSession(session);
  api={session};
  return session;
};
export async function currentRaceControlAccount(){
  const s=await activeSession();
  const user=await request('/auth/v1/user',{token:s.access_token});
  if(user?.id!==s.user.id)throw new Error('La identidad del jugador no coincide.');
  return {id:user.id,email:user.email||null,emailConfirmed:!!user.email_confirmed_at,
    anonymous:user.is_anonymous===true||!user.email,
    pendingEmail:user.new_email||null};
}
export async function requestRaceControlEmailLink(email){
  const s=await activeSession();
  const addr=cleanEmail(email);
  const result=await request('/auth/v1/user',{method:'PUT',token:s.access_token,body:{email:addr}});
  if(result?.id!==s.user.id)throw new Error('No se pudo mantener el ID original del jugador.');
  return {id:s.user.id,email:addr};
}
export async function verifyRaceControlEmailCode(email,code){
  const s=await activeSession();
  const addr=cleanEmail(email);
  const token=String(code||'').trim();
  if(!/^\d{6}$/.test(token))throw new Error('Introduce el código de 6 cifras enviado por correo.');
  const result=await request('/auth/v1/verify',{method:'POST',body:{type:'email_change',email:addr,token}});
  // Some Auth configurations return a refreshed session after verification.
  if(result?.access_token)persistAuthSession(result,s.user.id);
  else if(result?.user?.id&&result.user.id!==s.user.id)throw new Error('El código pertenece a otra cuenta.');
  return currentRaceControlAccount();
}
export async function setRaceControlPassword(password){
  const s=await activeSession();
  const account=await currentRaceControlAccount();
  if(account.anonymous||!account.emailConfirmed)throw new Error('Verifica el correo antes de crear una contraseña.');
  const safePassword=cleanPassword(password);
  const result=await request('/auth/v1/user',{method:'PUT',token:s.access_token,body:{password:safePassword}});
  if(result?.id!==s.user.id)throw new Error('La cuenta no conserva el ID del piloto.');
  // Before approving a destructive reinstall, prove the new credentials work
  // and resolve to the SAME UUID. Merely receiving a password update OK isn't enough.
  try{
    const checked=await loginRaceControlEmail(account.email,safePassword,{sameUserOnly:true});
    if(checked.user.id!==s.user.id)throw new Error('Cambio inesperado de identidad.');
  }catch(error){
    throw new Error('Se ha guardado la contraseña, pero NO se ha comprobado que puedas entrar de nuevo. No desinstales. '+String(error?.message||error));
  }
  return {...account,recoveryVerified:true};
}
export async function loginRaceControlEmail(email,password,{sameUserOnly=false}={}){
  const addr=cleanEmail(email);
  const pass=String(password||'');
  if(!pass)throw new Error('Introduce tu contraseña.');
  const old=readSession();
  const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:addr,password:pass}});
  // For credential checks on the existing device, refuse an account switch.
  return persistAuthSession(result,sameUserOnly?old?.user?.id:null);
}
export async function switchRaceControlAccount(email,password){
  // Credentials are verified before changing local auth. Local game data is
  // never modified here; explicit cloud restore is a separate user action.
  const session=await loginRaceControlEmail(email,password);
  try{localStorage.setItem('tdr2:cloudLoginPendingRestore:v1',session.user.id);}catch{}
  return session;
}

// Exact case-sensitive nickname reservation happens on the server, atomically.
// No local nickname is committed until Supabase confirms the reservation.
export async function claimRaceControlPilotNick(value){
  const nick=String(value??'').replace(/\s+/g,' ').trim();
  if(nick.length<3||nick.length>16)
    throw new Error('El nombre de piloto debe tener entre 3 y 16 caracteres.');
  const s=await activeSession();
  let claimed;
  try{
    claimed=await request('/rest/v1/rpc/claim_my_pilot_nick',{
      method:'POST',token:s.access_token,body:{p_nick:nick}
    });
  }catch(error){
    const message=String(error?.message||error);
    if(/failed to fetch|networkerror|network request failed|online backend not configured/i.test(message))
      throw new Error('No se pudo comprobar el nick en Supabase. Comprueba Internet y vuelve a intentarlo.');
    throw error;
  }
  if(claimed!==nick)throw new Error('Supabase no ha confirmado el nombre de piloto.');
  return claimed;
}

export async function syncRaceControlProfile({nick,continentCode,countryCode,regionCode}){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/upsert_my_profile',{method:'POST',token,body:{p_nick:nick,p_continent_code:continentCode,p_country_code:countryCode,p_region_code:regionCode}});
}

export function raceControlOnlineIsActive(){return Boolean(api?.session?.user?.id||readSession()?.user?.id);}


export async function submitRaceControlRecordWithGhost({trackId,bestTimeMs,carId,ghostBytes,ghostSampleCount}){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  const bytes=ghostBytes instanceof Uint8Array?ghostBytes:new Uint8Array(ghostBytes||[]);
  let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
  const payload='\\x'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return request('/rest/v1/rpc/submit_track_record_with_ghost',{method:'POST',token,body:{p_track_id:String(trackId||''),p_best_time_ms:Math.round(Number(bestTimeMs)||0),p_car_id:String(carId||''),p_ghost_payload:payload,p_ghost_sample_count:Math.round(Number(ghostSampleCount)||0),p_ghost_format:1}});
}

export async function getRaceControlSnapshot(trackId){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/get_race_control_snapshot',{method:'POST',token,body:{p_track_id:String(trackId||'')}});
}

export async function getRaceControlGhost(recordRef){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/get_track_record_ghost',{method:'POST',token,body:{p_record_ref:String(recordRef||'')}});
}

export async function getMyShipatonJudgeAccess(){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/get_my_shipaton_judge_access',{method:'POST',token,body:{}});
}

export async function activateShipatonJudgeAccess(code){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/activate_shipaton_judge_access',{method:'POST',token,body:{p_code:String(code||'').trim()}});
}
