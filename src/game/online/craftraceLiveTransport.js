// Isolated CrafRace LIVE RPC transport. No calls until a DEV UI explicitly uses it.
// This is NOT a realtime physics integration: polling is for handshake/chat/testing.
import {activateRaceControlOnline} from './raceControlOnline.js';
import {playerBackendConfig} from './backendConfig.js';
import {makeLiveCode,parseLiveCode,liveConfig,acceptLivePacket} from './craftraceLiveProtocol.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function liveIdentity(){
 const {session}=await activateRaceControlOnline();
 if(!uuid.test(session?.user?.id)||session.user.is_anonymous===true||
   !session.user.email&&!session.user.app_metadata?.providers?.length)
  throw Error('Para jugar online necesitas una cuenta permanente de CraftRace Studio.');
 return {id:session.user.id,token:session.access_token};
}
async function rpc(method,args){
 const {id,token}=await liveIdentity();
 const {url,key}=playerBackendConfig();
 const res=await fetch(url+'/rest/v1/rpc/'+method,{
  method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify(args),signal:AbortSignal.timeout(8000),cache:'no-store'});
 const json=await res.json().catch(()=>null);
 if(!res.ok)throw Error(json?.message||'Error de conexión LIVE '+res.status);
 return {id,data:json};
}
export async function createLiveRoom(config){
 const cfg=liveConfig(config);if(!cfg)throw Error('Circuito, coche o físicas incompatibles.');
 // Server enforces uniqueness; retry collisions without weakening randomness.
 for(let i=0;i<3;i++){
  const code=makeLiveCode(crypto.getRandomValues(new Uint8Array(7)));
  try{return (await rpc('craftrace_live_create',{p_code:code,p_track:cfg.trackId,
   p_car:cfg.carId,p_laps:cfg.laps,p_physics:cfg.physicsVersion,p_direction:cfg.direction})).data;}
  catch(err){if(!/duplicate key|unique constraint/i.test(err.message)||i===2)throw err;}
 }
 throw Error('No se pudo crear la pista.');
}
export async function joinLiveRoom(code){
 const clean=parseLiveCode(code);if(!clean)throw Error('Código de pista inválido.');
 return (await rpc('craftrace_live_join',{p_code:clean})).data;
}
export class CrafRaceLiveTransport{
 constructor(roomId,{onPacket=()=>{},onState=()=>{},onError=()=>{},pollMs=350}={}){
  if(!uuid.test(roomId))throw Error('Identificador de pista inválido.');
  this.roomId=roomId;this.onPacket=onPacket;this.onState=onState;this.onError=onError;
  this.pollMs=Math.max(250,Math.min(3000,pollMs));this.seq=0;this.lastId=0;
  this.lastSeqBySender=new Map();this.heat=1;this.generation=1;
  this.closed=false;this.timer=null;this.busy=false;this.sending=Promise.resolve();
  this.serverOffsetMs=0;this.clockSamples=0;
 }
 async send(type,payload){
  if(this.closed)throw Error('Pista cerrada.');
  // Serialize writes: concurrent button presses must never arrive out of order.
  const operation=this.sending.catch(()=>{}).then(async()=>{
   if(this.closed)throw Error('Pista cerrada.');
   const seq=++this.seq;
   return (await rpc('craftrace_live_send',{p_room:this.roomId,p_seq:seq,
    p_generation:this.generation,p_heat:this.heat,p_kind:type,p_payload:payload})).data;
  });
  this.sending=operation.catch(()=>{});
  return operation;
 }
 async poll(){
  if(this.closed||this.busy)return;
  this.busy=true;
  try{
   const requestStarted=Date.now();
   const {id,data}=await rpc('craftrace_live_poll',{p_room:this.roomId,p_after:this.lastId});
   if(this.closed)return;
   const rtt=Date.now()-requestStarted;
   if(Number.isFinite(data?.server_now_ms)&&rtt>=0&&rtt<3000){
    const offset=data.server_now_ms-(requestStarted+rtt/2);
    if(!this.clockSamples||Math.abs(offset-this.serverOffsetMs)<1500){
     this.serverOffsetMs=this.clockSamples?this.serverOffsetMs*0.8+offset*0.2:offset;
     this.clockSamples++;
    }
   }
   try{this.onState(data);}catch(err){this.onError(err);}
   for(const packet of data?.packets||[]){
    if(this.closed)break;
    if(!Number.isSafeInteger(packet.id)||packet.id<=this.lastId)continue;
    this.lastId=packet.id;
    if(packet.from===id)continue;
    const prev=this.lastSeqBySender.get(packet.from)||0;
    if(!acceptLivePacket({...packet,roomId:this.roomId},{
      roomId:this.roomId,from:packet.from,lastSeq:prev,heat:this.heat,generation:this.generation}))continue;
    this.lastSeqBySender.set(packet.from,packet.seq);
    try{this.onPacket(packet);}catch(err){this.onError(err);}
   }
  }catch(err){if(!this.closed)this.onError(err);}
  finally{this.busy=false;}
 }
 start(){
  if(this.closed)throw Error('Pista cerrada.');
  if(this.timer)return;
  // Avoid overlapping fetches and clean up on scene shutdown.
  this.timer=setInterval(()=>{void this.poll();},this.pollMs);
  void this.poll();
 }
 stop(){this.closed=true;if(this.timer)clearInterval(this.timer);this.timer=null;}
 serverNow(){return Date.now()+this.serverOffsetMs;}
 setRound(heat,generation){
  if(!Number.isSafeInteger(heat)||heat<1||heat>2||!Number.isSafeInteger(generation)||generation<1)return;
  this.heat=heat;this.generation=generation;this.lastSeqBySender.clear();
 }
}
