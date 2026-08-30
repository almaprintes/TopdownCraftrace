const clampInt=(n,a,b)=>Math.max(a,Math.min(b,Math.trunc(Number(n)||0)));

function normalizeEntry(entry,index){
  return{
    id:String(entry?.id||`racer-${index}`),
    player:Boolean(entry?.player),
    gridIndex:Number.isFinite(Number(entry?.gridIndex))?Number(entry.gridIndex):index,
    active:entry?.active!==false,
    raceDistance:Number.isFinite(Number(entry?.raceDistance))?Number(entry.raceDistance):0,
    completedLaps:clampInt(entry?.completedLaps,0,999),
    armed:Boolean(entry?.armed),
    lapStartedAt:Number.isFinite(Number(entry?.lapStartedAt))?Number(entry.lapStartedAt):null,
    lastGateCrossAt:null,
    gateCrossCount:0,
    lapTimesMs:[]
  };
}

export function createSurvivalRaceState(entries,{maxRounds=5,minLapDistance=.72}={}){
  const participants=(Array.isArray(entries)?entries:[]).map(normalizeEntry);
  if(new Set(participants.map(p=>p.id)).size!==participants.length)throw new Error('Survival racer ids must be unique');
  return{
    participants,
    round:0,
    maxRounds:clampInt(maxRounds,1,99),
    minLapDistance:Math.max(.1,Math.min(1,Number(minLapDistance)||.72)),
    finished:false,
    winnerId:null,
    finishReason:null,
    lastEliminatedId:null
  };
}

export function getSurvivalParticipant(state,id){
  return state?.participants?.find(p=>p.id===String(id))||null;
}

export function updateSurvivalProgress(state,snapshots){
  if(!state||!Array.isArray(snapshots))return state;
  for(const snapshot of snapshots){
    const participant=getSurvivalParticipant(state,snapshot?.id);
    if(!participant||!participant.active)continue;
    const distance=Number(snapshot?.raceDistance);
    if(Number.isFinite(distance))participant.raceDistance=distance;
  }
  return state;
}

export function getSurvivalStandings(state,{includeEliminated=false}={}){
  const list=(state?.participants||[]).filter(p=>includeEliminated||p.active);
  return [...list].sort((a,b)=>{
    const distance=Number(b.raceDistance)-Number(a.raceDistance);
    if(Math.abs(distance)>1e-9)return distance;
    const laps=Number(b.completedLaps)-Number(a.completedLaps);
    if(laps)return laps;
    return Number(a.gridIndex)-Number(b.gridIndex)||String(a.id).localeCompare(String(b.id));
  });
}

export function recordSurvivalFinishCross(state,id,{distanceSinceFinish=0,now=performance.now()}={}){
  const participant=getSurvivalParticipant(state,id);
  if(!participant||!participant.active||state?.finished)return{accepted:false,reason:'inactive'};
  const stamp=Number(now);
  participant.gateCrossCount+=1;
  participant.lastGateCrossAt=Number.isFinite(stamp)?stamp:null;

  if(!participant.armed){
    participant.armed=true;
    participant.lapStartedAt=Number.isFinite(stamp)?stamp:null;
    return{accepted:false,armed:true,resetDistance:true,reason:'armed'};
  }

  const travelled=Number(distanceSinceFinish)||0;
  if(travelled<Number(state.minLapDistance||.72)){
    return{accepted:false,reason:'too-short',resetDistance:false};
  }

  const targetLap=Math.min(state.maxRounds,state.round+1);
  if(participant.completedLaps>=targetLap){
    return{accepted:false,reason:'already-credited',resetDistance:true,targetLap};
  }

  participant.completedLaps=targetLap;
  const started=Number(participant.lapStartedAt);
  const lapMs=Number.isFinite(stamp)&&Number.isFinite(started)?stamp-started:null;
  if(Number.isFinite(lapMs)&&lapMs>1000)participant.lapTimesMs.push(lapMs);
  participant.lapStartedAt=Number.isFinite(stamp)?stamp:null;
  return{
    accepted:true,
    reason:'credited',
    resetDistance:true,
    targetLap,
    completedLaps:participant.completedLaps,
    lapMs:Number.isFinite(lapMs)&&lapMs>1000?lapMs:null
  };
}

export function resolveSurvivalRound(state){
  if(!state||state.finished)return null;
  const active=getSurvivalStandings(state);
  if(active.length<=1){
    state.finished=true;
    state.winnerId=active[0]?.id||null;
    state.finishReason='winner';
    return{finished:true,winner:active[0]||null,eliminated:null,round:state.round};
  }

  const targetLap=state.round+1;
  if(targetLap>state.maxRounds)return null;
  const credited=active.filter(p=>p.completedLaps>=targetLap).length;
  if(credited<active.length-1)return null;

  const eliminated=active[active.length-1];
  eliminated.active=false;
  state.round=targetLap;
  state.lastEliminatedId=eliminated.id;

  const remaining=getSurvivalStandings(state);
  const playerEliminated=Boolean(eliminated.player);
  const winnerReached=remaining.length===1;
  const maxReached=state.round>=state.maxRounds;
  if(playerEliminated||winnerReached||maxReached){
    state.finished=true;
    state.winnerId=playerEliminated?null:(remaining[0]?.id||null);
    state.finishReason=playerEliminated?'player-eliminated':'winner';
  }

  return{
    round:state.round,
    targetLap,
    eliminated,
    remaining,
    playerEliminated,
    finished:state.finished,
    winner:state.winnerId?getSurvivalParticipant(state,state.winnerId):null,
    finishReason:state.finishReason
  };
}

export function getSurvivalRaceSnapshot(state){
  const standings=getSurvivalStandings(state);
  const targetLap=Math.min(Number(state?.maxRounds||5),Number(state?.round||0)+1);
  const credited=standings.filter(p=>p.completedLaps>=targetLap).length;
  return{
    round:Number(state?.round||0),
    maxRounds:Number(state?.maxRounds||5),
    targetLap,
    activeCount:standings.length,
    credited,
    requiredToClose:Math.max(0,standings.length-1),
    finished:Boolean(state?.finished),
    winnerId:state?.winnerId||null,
    finishReason:state?.finishReason||null,
    standings:standings.map((p,index)=>({
      id:p.id,player:p.player,position:index+1,raceDistance:p.raceDistance,
      completedLaps:p.completedLaps,active:p.active
    }))
  };
}
