// LIVE v2: opt-in lobby client. NOT imported by the currently playable 2P mode.
// No Realtime, renderer, AI or database changes occur on module import.
import {liveIdentity} from './craftraceLiveTransport.js';
import {playerBackendConfig} from './backendConfig.js';
import {liveConfig,makeLiveCode,parseLiveCode} from './craftraceLiveProtocol.js';
import {liveV2Grid} from './craftraceLiveV2Roster.js';

const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const verifyId=id=>{if(!ID.test(id))throw Error('Identificador de pista inválido');return id;};
export function liveV2Options({capacity=2,fillWithAi=false,aiDifficulty=2}={}){
  if(!Number.isInteger(capacity)||capacity<2||capacity>4||
    typeof fillWithAi!=='boolean'||![1,2,3].includes(aiDifficulty))
    throw Error('Configuración LIVE de 2–4 pilotos inválida');
  return Object.freeze({capacity,fillWithAi,aiDifficulty});
}
async function rpc(suffix,args){
  const identity=await liveIdentity();
  const {url,key}=playerBackendConfig();
  const startedAt=Date.now();
  const response=await fetch(url+'/rest/v1/rpc/craftrace_live_v2_'+suffix,{
    method:'POST',headers:{apikey:key,Authorization:'Bearer '+identity.token,
      'Content-Type':'application/json'},
    body:JSON.stringify(args),signal:AbortSignal.timeout(8000),cache:'no-store'
  });
  const body=await response.json().catch(()=>null);
  if(!response.ok){
    const error=new Error(body?.message||'Error LIVE v2 '+response.status);
    // PostgREST exposes the server-computed unlock time separately in details.
    // Keep it structured instead of parsing server text or guessing a duration.
    error.details=body?.details||null;
    error.hint=body?.hint||null;
    error.code=body?.code||null;
    throw error;
  }
  // Date.now is used only for clock alignment; never for lap timing.
  if(body&&typeof body==='object'&&Number.isFinite(body.server_now_ms)){
    const rtt=Date.now()-startedAt;
    if(rtt>=0&&rtt<3000)body.clientClockOffsetMs=body.server_now_ms-(startedAt+rtt/2);
  }
  return body;
}
export async function createLiveV2Lobby(config,options={}){
  const settings=liveV2Options(options),race=liveConfig(config);
  if(!race)throw Error('Circuito, coche o físicas incompatibles');
  for(let attempt=0;attempt<3;attempt++){
    const code=makeLiveCode(crypto.getRandomValues(new Uint8Array(7)));
    try{
      return await rpc('create',{p_code:code,p_track:race.trackId,p_car:race.carId,
        p_laps:race.laps,p_physics:race.physicsVersion,p_direction:race.direction,
        p_capacity:settings.capacity,p_fill_ai:settings.fillWithAi,
        p_ai_difficulty:settings.aiDifficulty});
    }catch(e){
      if(!/duplicate key|unique constraint/i.test(e.message)||attempt===2)throw e;
    }
  }
  throw Error('No se pudo crear la pista');
}
export async function joinLiveV2Lobby(rawCode){
  const code=parseLiveCode(rawCode);
  if(!code)throw Error('Código de pista inválido');
  return rpc('join',{p_code:code});
}
export async function readLiveV2Lobby(roomId){
  return rpc('snapshot',{p_room:verifyId(roomId)});
}
export async function configureLiveV2Lobby(roomId,options){
  const settings=liveV2Options(options);
  return rpc('configure',{p_room:verifyId(roomId),p_capacity:settings.capacity,
    p_fill_ai:settings.fillWithAi,p_ai_difficulty:settings.aiDifficulty});
}
// Room host edits the venue while the lobby is still waiting. This keeps
// the same invitation code and human seats, but clears all ready flags.
export async function setLiveV2Venue(roomId,trackId,carId){
 const race=liveConfig({trackId,carId,laps:1,physicsVersion:1,direction:'forward'});
 if(!race)throw Error('Circuito o coche no válido');
 return rpc('set_venue',{p_room:verifyId(roomId),p_track:trackId,p_car:carId});
}
// A rematch is a NEW room: previous results and locked grid are immutable.
// Only the previous host proposes it; only previous members may accept.
export async function requestLiveV2Rematch(roomId){
 for(let attempt=0;attempt<3;attempt++){
  const code=makeLiveCode(crypto.getRandomValues(new Uint8Array(7)));
  try{return await rpc('request_rematch',{p_room:verifyId(roomId),p_code:code});}
  catch(e){
   if(!/duplicate key|unique constraint/i.test(e.message)||attempt===2)throw e;
  }
 }
 throw Error('No se pudo crear la revancha');
}
export async function acceptLiveV2Rematch(roomId){
 return rpc('accept_rematch',{p_room:verifyId(roomId)});
}

export async function setReadyLiveV2Lobby(roomId,ready){
  if(typeof ready!=='boolean')throw Error('Estado de preparación inválido');
  return rpc('set_ready',{p_room:verifyId(roomId),p_ready:ready});
}
export async function startLiveV2Lobby(roomId){
  return rpc('start',{p_room:verifyId(roomId)});
}
export async function acknowledgeLiveV2GridLoaded(roomId){
  return rpc('grid_loaded',{p_room:verifyId(roomId)});
}
export async function leaveLiveV2Lobby(roomId){
  return rpc('leave',{p_room:verifyId(roomId)});
}
export async function finishLiveV2Lobby(roomId,seat,lapTimes,elapsedMs){
  if(!Number.isInteger(seat)||seat<0||seat>3||
      !Number.isInteger(elapsedMs)||elapsedMs<1000||elapsedMs>7200000||
      !Array.isArray(lapTimes)||lapTimes.length<1||lapTimes.length>30||
      lapTimes.some(x=>!Number.isInteger(x)||x<500||x>7200000)||
      lapTimes.reduce((a,b)=>a+b,0)!==elapsedMs)
    throw Error('Resultado LIVE provisional inválido');
  return rpc('finish',{p_room:verifyId(roomId),p_seat:seat,
    p_lap_times:lapTimes,p_elapsed_ms:elapsedMs});
}
export async function heartbeatLiveV2Lobby(roomId){
  return rpc('heartbeat',{p_room:verifyId(roomId)});
}

// The server owns admission and the final grid. Local projections are for UI only.
export function liveV2LobbyView(snapshot){return liveV2Grid(snapshot);}

export class CrafRaceLiveV2LobbyMonitor{
  constructor(roomId,{onSnapshot=()=>{},onError=()=>{},snapshotMs=1200,heartbeatMs=5000}={}){
    this.roomId=verifyId(roomId);this.onSnapshot=onSnapshot;this.onError=onError;
    this.snapshotMs=Math.max(750,Math.min(3000,snapshotMs));
    this.heartbeatMs=Math.max(4000,Math.min(10000,heartbeatMs));
    this.stopped=true;this.busy=false;this._snapshotTimer=null;this._heartbeatTimer=null;
  }
  async refresh(){
    if(this.stopped||this.busy)return;
    this.busy=true;
    try{const data=await readLiveV2Lobby(this.roomId);
      if(!this.stopped)this.onSnapshot(data,liveV2Grid(data));
    }catch(err){if(!this.stopped)this.onError(err);}
    finally{this.busy=false;}
  }
  start(){
    if(!this.stopped)return;
    this.stopped=false;
    this._snapshotTimer=setInterval(()=>void this.refresh(),this.snapshotMs);
    this._heartbeatTimer=setInterval(()=>void heartbeatLiveV2Lobby(this.roomId)
      .catch(err=>{if(!this.stopped)this.onError(err);}),this.heartbeatMs);
    void heartbeatLiveV2Lobby(this.roomId).catch(err=>{if(!this.stopped)this.onError(err);});
    void this.refresh();
  }
  stop(){
    this.stopped=true;
    if(this._snapshotTimer)clearInterval(this._snapshotTimer);
    if(this._heartbeatTimer)clearInterval(this._heartbeatTimer);
    this._snapshotTimer=null;this._heartbeatTimer=null;
  }
}
