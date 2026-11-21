// DEV-only bracket engine for RACE Control's weekend championship.
// 16 named AI pilots; 4 qualifying races -> 2 semifinals -> 1 final.
// This module never alters Elo, contacts Supabase or publishes an event.
const RACE_IDS=['Q-A','Q-B','Q-C','Q-D','S-1','S-2','F'];
const QUALIFIER_SEEDS=[
 [1,8,9,16], [2,7,10,15], [3,6,11,14], [4,5,12,13]
];
const assert=(condition,message)=>{if(!condition)throw Error(message);};

export function seedAiWeekendChampionship(pilots,eventId){
 assert(Array.isArray(pilots)&&pilots.length===16,'Se necesitan exactamente 16 IA');
 assert(typeof eventId==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(eventId),
   'Identificador de campeonato inválido');
 const seen=new Set();
 const ordered=pilots.map(p=>{
  const id=String(p?.id??'');
  assert(/^[a-zA-Z0-9_-]{1,64}$/.test(id)&&!seen.has(id),'ID de piloto inválido o repetido');
  assert(Number.isFinite(p.elo)&&p.elo>=0,'Elo de piloto inválido');
  seen.add(id);
  return{id,elo:p.elo,name:String(p.name||id)};
 }).sort((a,b)=>b.elo-a.elo||a.id.localeCompare(b.id));
 const bySeed=rank=>ordered[rank-1].id;
 const qualifying=QUALIFIER_SEEDS.map((seedRanks,i)=>({
  id:RACE_IDS[i],stage:'qualifying',day:'saturday',seedRanks:seedRanks.slice(),
  pilots:seedRanks.map(bySeed),results:null
 }));
 const semifinals=['S-1','S-2'].map(id=>({
  id,stage:'semifinal',day:'sunday',pilots:null,results:null
 }));
 const final={id:'F',stage:'final',day:'sunday',pilots:null,results:null};
 return{
  version:1,eventId,format:'ai-weekend-16-4x4',
  seedSnapshot:ordered.map((p,i)=>({...p,seed:i+1})),
  races:[...qualifying,...semifinals,final],
  stage:'qualifying',championId:null,homologated:false
 };
}
const pick=(race,position)=>race.results[position-1].id;
export function submitAiWeekendRaceResult(bracket,raceId,finishers){
 assert(bracket?.format==='ai-weekend-16-4x4'&&Array.isArray(bracket.races)&&bracket.races.length===7,
  'Campeonato inválido');
 assert(!bracket.homologated,'Campeonato ya homologado');
 const race=bracket.races.find(r=>r.id===raceId);
 assert(race&&Array.isArray(race.pilots)&&race.pilots.length===4,'Carrera aún no habilitada');
 assert(race.results===null,'La carrera ya tiene un resultado');
 assert(Array.isArray(finishers)&&finishers.length===4,'Deben terminar los cuatro pilotos');
 const expected=new Set(race.pilots),used=new Set();
 const sorted=finishers.map(f=>{
  assert(f&&typeof f.id==='string'&&expected.has(f.id)&&!used.has(f.id),
   'Participante ajeno a la carrera o duplicado');
  used.add(f.id);
  assert(Number.isInteger(f.elapsedMs)&&f.elapsedMs>0,'Tiempo inválido');
  return{id:f.id,elapsedMs:f.elapsedMs};
 }).sort((a,b)=>a.elapsedMs-b.elapsedMs);
 assert(sorted.every((f,i)=>i===0||f.elapsedMs!==sorted[i-1].elapsedMs),
  'Empate sin resolver: requiere decisión antes de clasificar');
 const copy={
  ...bracket,races:bracket.races.map(r=>({
   ...r,pilots:r.pilots?.slice()??null,
   seedRanks:r.seedRanks?.slice(),results:r.results?.map(f=>({...f}))??null
  }))
 };
 copy.races.find(r=>r.id===raceId).results=sorted;
 const byId=id=>copy.races.find(r=>r.id===id);
 const allDone=ids=>ids.every(id=>byId(id).results!==null);
 if(allDone(['Q-A','Q-B','Q-C','Q-D'])){
  if(!byId('S-1').pilots){
   // Four different qualifying races in each semifinal; no repeat pairing.
   byId('S-1').pilots=[pick(byId('Q-A'),1),pick(byId('Q-B'),2),
      pick(byId('Q-C'),1),pick(byId('Q-D'),2)];
   byId('S-2').pilots=[pick(byId('Q-B'),1),pick(byId('Q-A'),2),
      pick(byId('Q-D'),1),pick(byId('Q-C'),2)];
  }
  copy.stage='semifinals';
 }
 if(allDone(['S-1','S-2'])){
  if(!byId('F').pilots)
   byId('F').pilots=[pick(byId('S-1'),1),pick(byId('S-2'),1),
     pick(byId('S-1'),2),pick(byId('S-2'),2)];
  copy.stage='final';
 }
 if(byId('F').results){
  copy.stage='finished';copy.championId=pick(byId('F'),1);
 }
 return copy;
}
// No automatic Elo update: only the administrator can approve an entire
// validated tournament via the future server-side RACE Control workflow.
export function aiWeekendStandings(bracket){
 const races=bracket?.races||[];
 return{
  eventId:bracket?.eventId||null,
  stage:bracket?.stage||'unknown',
  championId:bracket?.championId||null,
  completedRaces:races.filter(r=>r.results!==null).length,
  totalRaces:7,
  remainingRaces:races.filter(r=>r.results===null).map(r=>r.id),
  qualifiers:races.filter(r=>r.stage==='qualifying').map(r=>({
   id:r.id,grid:r.pilots,advancing:r.results?.slice(0,2).map(x=>x.id)||[]
  })),
  semifinals:races.filter(r=>r.stage==='semifinal').map(r=>({
   id:r.id,grid:r.pilots,advancing:r.results?.slice(0,2).map(x=>x.id)||[]
  })),
  final:races.find(r=>r.id==='F')||null
 };
}
