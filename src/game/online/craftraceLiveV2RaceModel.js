// Live 4: independent remote interpolation, zero local-physics side effects.
// Network topic membership is enforced on Supabase. These checks also reject
// mismatched senders, generations, seats, sequence numbers and malformed poses.
// DEV friendly only: transient Broadcast positions are not anti-cheat proof.
import {RemotePilotInterpolator} from './craftraceLiveRaceModel.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const numeric=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;

export function validateLive4Roster(roster,hostId,localId){
  if(!Array.isArray(roster)||roster.length<2||roster.length>4||
      !UUID.test(hostId)||!UUID.test(localId))
    throw Error('Invalid Live 4 locked roster');
  const ids=new Set(),seats=new Set();
  let localSeat=-1,hostSeen=false;
  for(const item of roster){
    if(!item||!integer(item.seat,0,3)||seats.has(item.seat))
      throw Error('Duplicate or invalid seat');
    seats.add(item.seat);
    if(item.kind==='human'){
      if(!UUID.test(item.player_id)||ids.has(item.player_id))throw Error('Invalid human seat');
      ids.add(item.player_id);
      if(item.player_id===localId)localSeat=item.seat;
      if(item.player_id===hostId){
        if(item.seat!==0)throw Error('Host must own seat zero');
        hostSeen=true;
      }
    }else if(item.kind==='ai'){
      if(item.owner_id!==hostId||!integer(item.difficulty,1,3)||
        item.bot_id!=='ai-seat-'+(item.seat+1))
        throw Error('Invalid hosted AI seat');
    }else throw Error('Invalid race participant');
  }
  if(!hostSeen||localSeat<0)throw Error('Local participant must be authorized human');
  return Object.freeze({
    localSeat,
    racers:Object.freeze(roster.map(item=>Object.freeze({...item})).sort((a,b)=>a.seat-b.seat))
  });
}

export class CrafRaceLive4RemoteModel{
  constructor({roomId,hostId,localId,roster,delayMs=280}={}){
    if(!UUID.test(roomId))throw Error('Invalid LIVE room');
    const valid=validateLive4Roster(roster,hostId,localId);
    this.roomId=roomId;this.hostId=hostId;this.localId=localId;
    this.localSeat=valid.localSeat;this.roster=valid.racers;
    this.state=new Map();this.accepted=0;this.rejected=0;
    for(const item of this.roster)if(item.seat!==this.localSeat){
      this.state.set(item.seat,{
        item,seq:0,lastAt:0,count:0,interpolator:new RemotePilotInterpolator({
          delayMs,maxSamples:18,maxExtrapolateMs:90
        })
      });
    }
  }
  accept(packet,now){
    const fail=()=>{this.rejected++;return false};
    if(!packet||packet.v!==1||packet.type!=='position'||
      packet.roomId!==this.roomId||!UUID.test(packet.from)||
      !integer(packet.seat,0,3)||!integer(packet.seq,1,2147483647)||
      !integer(packet.generation,1,1000000)||!numeric(now,0,Number.MAX_SAFE_INTEGER)||
      !packet.payload||typeof packet.payload!=='object')
      return fail();
    const st=this.state.get(packet.seat);
    if(!st||packet.seq<=st.seq||packet.generation!==1)return fail();
    if(st.item.kind==='human'&&packet.from!==st.item.player_id)return fail();
    if(st.item.kind==='ai'&&packet.from!==this.hostId)return fail();
    const pose=packet.payload;
    if(!numeric(pose.x,-100000,100000)||!numeric(pose.y,-100000,100000)||
      !numeric(pose.angle,-Math.PI*2,Math.PI*2)||
      !numeric(pose.speed,0,200000)||!integer(pose.tick,0,2147483647)||
      !integer(pose.lap,0,31))
      return fail();
    if(!st.interpolator.push({...pose,generation:1,heat:1},now))return fail();
    st.seq=packet.seq;st.lastAt=now;st.count++;this.accepted++;
    return true;
  }
  positions(now,maxAgeMs=2500){
    if(!Number.isFinite(now))return [];
    const positions=[];
    for(const [seat,st]of this.state){
      const pose=st.interpolator.at(now);
      if(!pose)continue;
      const ageMs=Math.max(0,now-st.lastAt);
      positions.push({
        seat,kind:st.item.kind,ageMs,disconnected:ageMs>maxAgeMs,
        pose:ageMs>maxAgeMs?null:pose,packets:st.count
      });
    }
    return positions;
  }
  stats(){return {
    remoteCount:this.state.size,accepted:this.accepted,rejected:this.rejected,
    samples:[...this.state.entries()].map(([seat,s])=>({seat,packets:s.count,samples:s.interpolator.samples.length}))
  };}
}
