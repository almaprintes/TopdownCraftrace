// Local-only four-car race setup. No account, server ID, room, or network transport.
export const OFFLINE_FOUR_TRACKS=Object.freeze(['santa-cruz','karting-canarias-4096','karting-tenerife-horario']);
export const OFFLINE_FOUR_LAPS=Object.freeze([1,3,5,10,20]);
export function makeOfflineFourRace({trackKey,carId,laps=3,difficulty=2,humanSeat=Math.floor(Math.random()*4),seed='local-'+Date.now()+'-'+Math.random()}={}){
  if(!OFFLINE_FOUR_TRACKS.includes(trackKey)||typeof carId!=='string'||!carId.trim()||
     !OFFLINE_FOUR_LAPS.includes(laps)||![1,2,3].includes(difficulty)||
     !Number.isInteger(humanSeat)||humanSeat<0||humanSeat>3||typeof seed!=='string'||!seed||seed.length>100)
    throw Error('Invalid offline four-car configuration');
  return Object.freeze({trackKey,carId,laps,difficulty,humanSeat,seed});
}
export function offlineFourRoster(difficulty,humanSeat=0){
  if(![1,2,3].includes(difficulty)||!Number.isInteger(humanSeat)||humanSeat<0||humanSeat>3)throw Error('Invalid AI roster');
  const host='local-player';
  return Array.from({length:4},(_,seat)=>seat===humanSeat?{seat,kind:'human',player_id:host}:{seat,kind:'ai',owner_id:host,bot_id:'ai-seat-'+(seat+1),difficulty});
}
export function rankOfflineFour(rows){
  return [...rows].sort((a,b)=>(a.elapsedMs??Infinity)-(b.elapsedMs??Infinity)||a.seat-b.seat);
}

// Preflight must finish before leaving the selection screen.
export async function prepareOfflineFourLaunch(config,prepare){
  const valid=makeOfflineFourRace(config);
  if(typeof prepare!=='function'||await prepare()!==true)throw Error('Módulo de carrera no disponible. Vuelve a intentarlo.');
  return {trackKey:valid.trackKey,carId:valid.carId,gameMode:'offline-ai',offlineFourRace:valid};
}
