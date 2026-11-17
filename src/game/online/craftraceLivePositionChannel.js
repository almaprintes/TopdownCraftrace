// Optional position-only Broadcast adapter. No network connection is opened by this module.
// The caller supplies a *private, authenticated, already subscribed* Realtime channel.
// Control events and recovery stay on the existing HTTP RPC transport.
import {acceptLivePacket} from './craftraceLiveProtocol.js';

export class CrafRaceLivePositionChannel {
 constructor({channel,roomId,localId,remoteId,onPosition=()=>{}}){
  if(!channel||typeof channel.send!=='function'||typeof channel.on!=='function')throw Error('Realtime channel required');
  if(!roomId||!localId||!remoteId||localId===remoteId)throw Error('Invalid pilots or room');
  this.channel=channel;this.roomId=roomId;this.localId=localId;this.remoteId=remoteId;
  this.onPosition=onPosition;this.seq=0;this.lastSeq=0;this.heat=1;this.generation=1;
  this.active=false;this.closed=false;
  channel.on('broadcast',{event:'position'},message=>this.receive(message?.payload));
 }
 // Only call after the channel reports SUBSCRIBED and membership has been verified.
 enable(){if(this.closed)throw Error('Position channel closed');this.active=true;}
 disable(){this.active=false;}
 setRound(heat,generation){
  if(!Number.isSafeInteger(heat)||heat<1||heat>2||!Number.isSafeInteger(generation)||generation<1)return false;
  this.heat=heat;this.generation=generation;this.lastSeq=0;return true;
 }
 async send(payload){
  if(!this.active||this.closed)return false;
  const packet={v:1,type:'position',roomId:this.roomId,from:this.localId,
   seq:++this.seq,heat:this.heat,generation:this.generation,payload};
  if(!acceptLivePacket(packet,{roomId:this.roomId,from:this.localId,lastSeq:0,heat:this.heat,generation:this.generation}))return false;
  try{return (await this.channel.send({type:'broadcast',event:'position',payload:packet}))==='ok';}
  catch{return false;}
 }
 receive(packet){
  if(!this.active||this.closed||packet?.from!==this.remoteId)return false;
  if(!acceptLivePacket(packet,{roomId:this.roomId,from:this.remoteId,lastSeq:this.lastSeq,
   heat:this.heat,generation:this.generation}))return false;
  this.lastSeq=packet.seq;
  this.onPosition(packet);return true;
 }
 close(){this.closed=true;this.active=false;}
}
