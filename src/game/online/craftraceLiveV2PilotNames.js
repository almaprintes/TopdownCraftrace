// Human names in LIVE 4 come ONLY from server-authorized room membership.
// A locally self-reported nickname is never assigned to someone else's UUID.
// AI labels are distinct and stable by seat, on host and guest devices.
const namesByLevel=Object.freeze({1:'PRINCIPIANTE',2:'COMPETITIVO',3:'EXPERTO'});
const cleanedNickname=value=>{
 if(typeof value!=='string')return '';
 const nick=value.replace(/[\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim();
 return nick.length>=3&&nick.length<=16?nick:'';
};
export function humanNickForRoomMember(members,userId){
 if(typeof userId!=='string'||!Array.isArray(members))return 'NICK PENDIENTE';
 const member=members.find(x=>x?.player_id===userId);
 return cleanedNickname(member?.nick)||'NICK PENDIENTE';
}
export function live4SeatName(entry,members){
 if(!entry||!Number.isInteger(entry.seat))return 'NICK PENDIENTE';
 if(entry.kind==='ai'){
   const level=namesByLevel[entry.difficulty]||'IA';
   return 'IA '+level+' · '+(entry.seat+1);
 }
 return entry.kind==='human'
   ?humanNickForRoomMember(members,entry.player_id)
   :'NICK PENDIENTE';
}
