import { recordOnlineCuperPublish } from '../seasons/seasonTelemetry.js';
import {raceControlServerTrackId,decodeRaceControlServerTrackId} from './raceControlTrackEdition.js';
// RACE Control Online — no request is made until activateRaceControlOnline().
// Auth uses the GoTrue protocol (open source, compatible with self-hosting).
import { playerBackendConfig } from './backendConfig.js';
let api=null;
let activationPromise=null;
// Single connection configuration allows switching to self-hosted GoTrue + Postgres.
const cfg=()=>playerBackendConfig();
const headers=(key,token)=>({'apikey':key,'Authorization':`Bearer ${token||key}`,'Content-Type':'application/json'});
const readSession=()=>{try{return JSON.parse(localStorage.getItem('tdr2:onlineSession:v1')||'null');}catch{return null;}};
const saveSession=s=>{try{localStorage.setItem('tdr2:onlineSession:v1',JSON.stringify(s));}catch{}};
// Presence check does not refresh a token or contact Supabase.
export function hasSavedRaceControlSession(){return Boolean(readSession()?.user?.id);}
// Only an expired legacy anonymous session may be detached explicitly.
// Never touch game progress, replays, coins, or server records.
export function continueRejectedAnonymousSessionLocally(expectedUserId){
  const old=readSession();
  const id=String(expectedUserId||'');
  if(!id||old?.user?.id!==id||old?.user?.is_anonymous!==true)
    throw new Error('La identidad ha cambiado. No se ha desvinculado ninguna cuenta.');
  if(sessionUsable(old)||sessionUsable(api?.session))
    throw new Error('La sesión sigue activa. No se ha desvinculado ninguna cuenta.');
  localStorage.setItem('tdr2:previousOnlineUserId:v1',id);
  localStorage.removeItem('tdr2:onlineSession:v1');
  if(readSession())throw new Error('No se pudo quitar la sesión anterior. No se ha tocado tu partida.');
  api=null;
  return {id,mode:'local'};
}
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
  if(!res.ok){
    const err=new Error(data?.msg||data?.message||data?.error_description||`Online HTTP ${res.status}`);
    err.status=res.status;
    err.code=data?.code||data?.error_code||data?.error||'';
    throw err;
  }
  return data;
}

async function performRaceControlActivation(){
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
      // A rejected token is distinct from a network error. Legacy guests only.
      const rejected=(error?.status===400||error?.status===401)&&
        /refresh_token_not_found|refresh.token.not.found|invalid.refresh.token/i.test(
          String(error?.code||'')+' '+String(error?.message||''));
      if(rejected&&old?.user?.is_anonymous===true&&!old?.user?.email){
        const revoked=new Error('No se pudo recuperar tu sesión de piloto. La renovación anterior fue rechazada.');
        revoked.code='TDR_AUTH_REFRESH_REJECTED';
        revoked.userId=old.user.id;
        throw revoked;
      }
      // Never silently create an anonymous player when a permanent login expires.
      if(old?.user?.email||old?.user?.is_anonymous===false)
        throw new Error('La sesión de tu cuenta caducó. Entra de nuevo con tu correo; la copia de la nube sigue a salvo.');
    }
    if(old?.user?.email||old?.user?.is_anonymous===false)
      throw new Error('No se pudo renovar tu cuenta. Inicia sesión con correo para recuperar tu ID.');
    // A failed anonymous refresh must never silently replace an existing UUID.
    // Keep the stored session intact so the player can retry or recover it.
    throw new Error('No se pudo recuperar tu sesión de piloto. Comprueba Internet y vuelve a intentarlo. Si persiste, usa YA TENGO CUENTA para recuperarla; no se ha creado otra cuenta.');
  }
  // A new guest is LOCAL: simply opening a leaderboard must never create
  // an anonymous Supabase user. Previously issued identities remain intact.
  throw new Error('PARTIDA_LOCAL_SIN_CUENTA: Para publicar récords, protege tu partida desde Ajustes → Cuenta.');
}

// A refresh token must never be used by concurrent callers.
export async function activateRaceControlOnline(){
  if(sessionUsable(api?.session))return api;
  if(!activationPromise)activationPromise=performRaceControlActivation();
  try{return await activationPromise;}
  finally{activationPromise=null;}
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
  const names=Array.isArray(user.app_metadata?.providers)
    ?user.app_metadata.providers:[user.app_metadata?.provider];
  const socialProviders=[...new Set(names.filter(name=>name==='google'||name==='apple'))];
  return {id:user.id,email:user.email||null,emailConfirmed:!!user.email_confirmed_at,
    anonymous:typeof user.is_anonymous==='boolean'?user.is_anonymous:!user.email,
    pendingEmail:user.new_email||null,socialProviders};
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
  const response=await request('/rest/v1/rpc/submit_track_record_with_ghost',{method:'POST',token,body:{p_track_id:raceControlServerTrackId(trackId),p_best_time_ms:Math.round(Number(bestTimeMs)||0),p_car_id:String(carId||''),p_ghost_payload:payload,p_ghost_sample_count:Math.round(Number(ghostSampleCount)||0),p_ghost_format:1}});
  const record=Array.isArray(response)?response[0]:response;
  const edition=decodeRaceControlServerTrackId(record?.track_id);
  if(!edition||edition.trackId!==String(trackId||'').trim())
    throw new Error('El servidor confirmó otra edición del circuito.');
  if(record?.improved===true&&record?.record_ref&&String(carId||'')==='crown_cuper')recordOnlineCuperPublish();
  return Array.isArray(response)?response.map(row=>({...row,track_id:edition.trackId})):
    {...record,track_id:edition.trackId};
}

// Time-only publication for genuine device PBs whose exact local recording
// is missing. The server's pre-existing authenticated RPC leaves the ranking
// entry without a ghost; replay/VS must stay disabled. Rewarded consent is
// checked by the calling UI, exactly as in ghost-backed publishing.
export async function submitRaceControlRecordWithoutGhost({trackId,bestTimeMs,carId}){
  const id=String(trackId||'').trim(),car=String(carId||'').trim();
  const ms=Math.round(Number(bestTimeMs)||0);
  if(!id||id.length>80||!car||car.length>80||ms<=1000)
    throw new Error('Datos incompletos para publicar el récord.');
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  const response=await request('/rest/v1/rpc/submit_track_record',{
    method:'POST',token,body:{p_track_id:raceControlServerTrackId(id),p_best_time_ms:ms,p_car_id:car}
  });
  const record=Array.isArray(response)?response[0]:response;
  if(record?.track_id!==raceControlServerTrackId(id)||Number(record?.best_time_ms)<=0)
    throw new Error('El servidor no confirmó el tiempo del trazado actual.');
  if(record.improved===true&&car==='crown_cuper')recordOnlineCuperPublish();
  return Array.isArray(response)?response.map(row=>({...row,track_id:id})):
    {...record,track_id:id};
}

// Return only the caller's OWN identity. This read-only RPC is SECURITY
// DEFINER and does not expose another pilot's profile via PostgREST.
// Only the authenticated Supabase UUID can obtain a creator badge.
export async function getMyRaceControlBadge(){
  const s=await activeSession();
  const badge=await request('/rest/v1/rpc/get_my_pilot_badge',{
    method:'POST',token:s.access_token,body:{}
  });
  return badge==='CREADOR'?'CREADOR':null;
}
export async function getMyRaceControlProfile(){
  const session=await activeSession();
  const rows=await request('/rest/v1/rpc/get_my_pilot_profile',{
    method:'POST',token:session.access_token,body:{}
  });
  return Array.isArray(rows)?rows[0]||null:rows||null;
}

// Time-matched rivals for large leaderboards. Returns bounded metadata ONLY;
// expensive compact ghost payloads remain on the existing rewarded, on-demand
// getRaceControlGhost(record_ref) endpoint. No account creation per row.
export async function getRaceControlNearbyGhostRivals({trackId,referenceMs,minGapMs=1,maxGapMs=3000,limit=8}){
  const id=raceControlServerTrackId(trackId);
  const time=Math.round(Number(referenceMs)||0);
  const min=Math.round(Number(minGapMs)||0),max=Math.round(Number(maxGapMs)||0);
  const amount=Math.round(Number(limit)||0);
  if(!id||id.length>80||time<1001||time>3600000||
     min<1||max<min||max>120000||amount<1||amount>12)
    throw new Error('Rango de rivales no válido');
  const s=await activeSession();
  const rows=await request('/rest/v1/rpc/get_race_control_nearby_ghosts',{
    method:'POST',token:s.access_token,
    body:{p_track_id:id,p_reference_ms:time,
      p_min_gap_ms:min,p_max_gap_ms:max,p_limit:amount}
  });
  return (Array.isArray(rows)?rows:[]).filter(row=>
    row?.ghost_available===true&&
    typeof row?.record_ref==='string'&&
    Number(row?.best_time_ms)>1000&&
    Number(row?.delta_ms)>0&&
    Number(row?.delta_ms)<=max
  ).slice(0,amount);
}

// One server-backed badge lookup per circuit, never per ranked row.
// A verified record_ref is authoritative for authenticated leaderboard rows;
// public snapshots have no record_ref, so require the exact server-supplied
// nickname from a record whose owner is confirmed by the same RPC.
export async function getRaceControlTrackCreatorBadges(trackId){
  const s=await activeSession();
  const rows=await request('/rest/v1/rpc/get_track_creator_badges',{
    method:'POST',token:s.access_token,body:{p_track_id:raceControlServerTrackId(trackId)}
  });
  return Array.isArray(rows)?rows:[];
}
export function withRaceControlCreatorBadges(rows,verified){
  const refs=new Map(),names=new Set();
  for(const badge of Array.isArray(verified)?verified:[]){
    if(badge?.badge!=='CREADOR'||!badge.nick||!badge.record_ref)continue;
    const nick=String(badge.nick),ref=String(badge.record_ref);
    refs.set(ref,nick);names.add(nick);
  }
  return (Array.isArray(rows)?rows:[]).map(row=>{
    const nick=String(row?.nick||''),ref=row?.record_ref?String(row.record_ref):'';
    const confirmed=ref?refs.get(ref)===nick:names.has(nick);
    return {...row,creator_badge:confirmed?'CREADOR':null,creator_badge_checked:true};
  });
}
async function applyRaceControlCreatorBadges(trackId,rows){
  try{
    const badges=await getRaceControlTrackCreatorBadges(trackId);
    return withRaceControlCreatorBadges(rows,badges);
  }catch(err){
    // Ranking and VS must still work if badge service is unavailable.
    console.warn('[race-control] verified badges unavailable',err);
    return rows;
  }
}

// Guest-safe global leaderboard if a device is signed into a different account.
// Read-only; does not grant VS ghosts or publish permission.
export async function getPublicRaceControlSnapshot(trackId){
  const id=raceControlServerTrackId(trackId);
  const {url,key}=cfg();
  if(!url||!key)throw new Error('Online backend not configured');
  const res=await fetch(url+'/rest/v1/web_leaderboard_snapshot?select=payload&id=eq.true',{
    headers:{apikey:key}
  });
  if(!res.ok)throw new Error('No se ha podido consultar la clasificación pública.');
  const rows=await res.json();
  const payload=rows?.[0]?.payload;
  if(!payload||!Array.isArray(payload.tracks))throw new Error('Clasificación pública no disponible.');
  const board=payload.tracks.find(t=>t?.id===id);
  // A brand-new online edition has no guest snapshot until a first record
  // and the scheduled refresh. Never borrow the historic leaderboard instead.
  if(!board&&decodeRaceControlServerTrackId(id)?.currentLayout)return [];
  if(!board)throw new Error('Circuito aún no disponible en la clasificación pública.');
  const ranking=(Array.isArray(board.entries)?board.entries:[]).map(r=>({
    scope:'global',rank:Number(r.rank)||0,nick:String(r.nick||''),
    best_time_ms:Number(r.best_time_ms)||0,car_id:String(r.car_id||''),
    record_ref:null,ghost_available:false,is_me:false,section:'top'
  })).filter(r=>r.rank>0&&r.best_time_ms>0);
  return applyRaceControlCreatorBadges(id,ranking);
}

export async function getRaceControlSnapshot(trackId){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  const id=raceControlServerTrackId(trackId);
  const ranking=await request('/rest/v1/rpc/get_race_control_snapshot',{
    method:'POST',token,body:{p_track_id:id}
  });
  return applyRaceControlCreatorBadges(id,ranking);
}

// This snapshot marks the caller by authenticated UUID (is_me), never nickname.
// Used as a no-ad preflight before attempting to submit a local best.
export async function getMyRaceControlRecord(trackId){
  const id=raceControlServerTrackId(trackId);
  if(!id||id.length>80)throw new Error('Circuito no válido');
  const s=await activeSession();
  const rows=await request('/rest/v1/rpc/get_race_control_snapshot',{
    method:'POST',token:s.access_token,body:{p_track_id:id}
  });
  if(!Array.isArray(rows))throw new Error('No se pudo verificar tu récord online. No se ha solicitado ningún anuncio.');
  const own=rows.find(row=>row?.scope==='global'&&row?.is_me===true);
  return own&&Number(own.best_time_ms)>0?own:null;
}

export async function getRaceControlGhost(recordRef){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  const rows=await request('/rest/v1/rpc/get_track_record_ghost',{
    method:'POST',token,body:{p_record_ref:String(recordRef||'')}
  });
  const decode=row=>{
    if(!row)return row;
    const edition=decodeRaceControlServerTrackId(row.track_id);
    if(!edition)throw new Error('El fantasma pertenece a otra edición del circuito.');
    return {...row,track_id:edition.trackId,
      online_geometry_current:edition.currentLayout};
  };
  return Array.isArray(rows)?rows.map(decode):decode(rows);
}
