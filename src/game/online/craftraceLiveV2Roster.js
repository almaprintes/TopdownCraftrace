// Pure UI projection of server-authorized LIVE v2 seats. No network or writes.
// Unlike the initial linear planner, this preserves seats after guest departure.
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function liveV2Grid(snapshot){
  const capacity=snapshot?.capacity;
  if(!integer(capacity,2,4)||!ID.test(snapshot?.host_id)||
      !Array.isArray(snapshot?.members)||snapshot.members.length<1||
      snapshot.members.length>capacity)throw Error('Invalid LIVE v2 snapshot');
  const seats=Array.from({length:capacity},(_,index)=>({index,kind:'empty'}));
  const knownIds=new Set();
  for(const m of snapshot.members){
    if(!m||!ID.test(m.player_id)||!integer(m.seat,0,capacity-1)||
        typeof m.ready!=='boolean'||typeof m.online!=='boolean'||
        seats[m.seat].kind!=='empty'||knownIds.has(m.player_id))
      throw Error('Duplicate or invalid LIVE pilot');
    knownIds.add(m.player_id);
    seats[m.seat]={index:m.seat,kind:'human',playerId:m.player_id,
      ready:m.ready,online:m.online};
  }
  if(seats[0].kind!=='human'||seats[0].playerId!==snapshot.host_id)
    throw Error('Host must have seat zero');
  const racing=snapshot.state!=='waiting';
  const locked=snapshot.locked_roster;
  if(racing&&Array.isArray(locked)){
    const rosterSeats=Array.from({length:capacity},(_,index)=>({index,kind:'empty'}));
    for(const entry of locked){
      if(!entry||!integer(entry.seat,0,capacity-1)||
          rosterSeats[entry.seat].kind!=='empty')throw Error('Invalid locked grid');
      const index=entry.seat;
      if(entry.kind==='human'&&ID.test(entry.player_id)&&
          seats[index].kind==='human'&&seats[index].playerId===entry.player_id)
        rosterSeats[index]={...seats[index]};
      else if(entry.kind==='ai'&&integer(entry.difficulty,1,3)&&
          entry.owner_id===snapshot.host_id&&
          seats[index].kind==='empty')
        rosterSeats[index]={index,kind:'ai',difficulty:entry.difficulty,ownerId:entry.owner_id};
      else throw Error('Invalid locked pilot');
    }
    if(rosterSeats.filter(s=>s.kind!=='empty').length<2)throw Error('Incomplete locked race');
    return Object.freeze({
      capacity,started:true,humanCount:seats.filter(s=>s.kind==='human').length,
      aiCount:rosterSeats.filter(s=>s.kind==='ai').length,
      canStart:false,seats:Object.freeze(rosterSeats.map(Object.freeze))
    });
  }
  if(racing)throw Error('Missing locked roster for started race');
  if(snapshot.fill_ai===true)for(let i=0;i<capacity;i++)if(seats[i].kind==='empty'){
    if(!integer(snapshot.ai_difficulty,1,3))throw Error('Invalid AI level');
    seats[i]={index:i,kind:'ai',difficulty:snapshot.ai_difficulty,ownerId:snapshot.host_id};
  }
  const humanCount=snapshot.members.length,aiCount=seats.filter(s=>s.kind==='ai').length;
  return Object.freeze({
    capacity,started:racing,humanCount,aiCount,
    canStart:!racing&&humanCount+aiCount>=2&&
      seats.filter(s=>s.kind==='human').every(s=>s.ready&&s.online),
    seats:Object.freeze(seats.map(Object.freeze))
  });
}
