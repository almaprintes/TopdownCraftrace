// Local-only four-car race setup. No account, server ID, room, or network transport.
export const OFFLINE_FOUR_TRACKS=Object.freeze(['santa-cruz','karting-canarias-4096','karting-tenerife-horario']);
export const OFFLINE_FOUR_LAPS=Object.freeze([1,3,5,10,20]);
export function makeOfflineFourRace({trackKey,carId,laps=3,difficulty=2}={}){
  if(!OFFLINE_FOUR_TRACKS.includes(trackKey)||typeof carId!=='string'||!carId.trim()||
     !OFFLINE_FOUR_LAPS.includes(laps)||![1,2,3].includes(difficulty))
    throw Error('Invalid offline four-car configuration');
  return Object.freeze({trackKey,carId,laps,difficulty});
}
export function offlineFourRoster(difficulty){
  if(![1,2,3].includes(difficulty))throw Error('Invalid AI difficulty');
  const host='local-player';
  return [{seat:0,kind:'human',player_id:host},...Array.from({length:3},(_,i)=>({
    seat:i+1,kind:'ai',owner_id:host,bot_id:'ai-seat-'+(i+2),difficulty
  }))];
}
export function rankOfflineFour(rows){
  return [...rows].sort((a,b)=>(a.elapsedMs??Infinity)-(b.elapsedMs??Infinity)||a.seat-b.seat);
}
