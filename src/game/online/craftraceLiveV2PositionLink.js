// Transient authorized LIVE 4 Broadcast. Only positions; never results or rewards.
// A Realtime RLS policy must authorize authenticated members for topic
// craftrace-live4:<room uuid> before this class is enabled.
import {liveIdentity} from './craftraceLiveTransport.js';
import {playerBackendConfig} from './backendConfig.js';
import {validateLive4Roster} from './craftraceLiveV2RaceModel.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class CrafRaceLive4PositionLink{
 constructor({roomId,hostId,localId,roster,onPosition=()=>{},onStatus=()=>{}}={}){
  if(!UUID.test(roomId))throw Error('Invalid Live 4 room');
  const {localSeat,racers}=validateLive4Roster(roster,hostId,localId);
  this.roomId=roomId;this.hostId=hostId;this.localId=localId;
  this.localSeat=localSeat;this.roster=racers;
  this.onPosition=onPosition;this.onStatus=onStatus;
  this.status='OFFLINE';this.ready=false;this.closed=false;
  this.channel=null;this.client=null;this.sent=0;this.errors=0;
  this.seqBySeat=new Map();
 }
 async connect(){
  if(this.closed)throw Error('Closed Live 4 position link');
  if(this.channel)return;
  const identity=await liveIdentity();
  if(identity.id!==this.localId)throw Error('Live 4 pilot identity changed');
  const {url,key}=playerBackendConfig();
  const {createClient}=await import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2.119.0?target=es2022');
  const client=createClient(url,key,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  client.realtime.setAuth(identity.token);
  const channel=client.channel('craftrace-live4:'+this.roomId,{
   config:{private:true,broadcast:{self:false,ack:false}}
  });
  channel.on('broadcast',{event:'position'},msg=>{
   if(!this.closed)this.onPosition(msg?.payload);
  });
  channel.subscribe(status=>{
   if(this.closed)return;
   this.status=status;this.ready=status==='SUBSCRIBED';
   this.onStatus(this.ready,status);
  });
  if(this.closed){await client.removeChannel(channel).catch(()=>{});return;}
  this.channel=channel;this.client=client;
 }
 async send(seat,payload){
  if(!this.ready||this.closed||!this.channel)return false;
  const item=this.roster.find(x=>x.seat===seat);
  if(!item||item.kind==='human'&&
      (seat!==this.localSeat||item.player_id!==this.localId)||
      item.kind==='ai'&&this.localId!==this.hostId)
    return false;
  if(!payload||![payload.x,payload.y,payload.angle,payload.speed].every(Number.isFinite)||
    !Number.isSafeInteger(payload.tick)||!Number.isSafeInteger(payload.lap))
    return false;
  const seq=(this.seqBySeat.get(seat)||0)+1;
  this.seqBySeat.set(seat,seq);
  const packet={v:1,type:'position',roomId:this.roomId,from:this.localId,
    seat,seq,generation:1,payload};
  try{
   const result=await this.channel.send({type:'broadcast',event:'position',payload:packet});
   if(result==='ok'){this.sent++;return true;}
  }catch{}
  this.errors++;return false;
 }
 async close(){
  if(this.closed)return;
  this.closed=true;this.ready=false;this.status='CLOSED';
  const client=this.client,channel=this.channel;
  this.client=null;this.channel=null;
  if(client&&channel)try{await client.removeChannel(channel);}catch{}
  if(client)try{await client.removeAllChannels();}catch{}
 }
}
