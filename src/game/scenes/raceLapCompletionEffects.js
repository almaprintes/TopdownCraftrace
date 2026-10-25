// Keep completed laps playable even if optional records, loot persistence or
// presentation fails. Invoked ONLY after a new validated lap, never per frame.
// Errors must remain observable: the caller logs each phase for support.
export function runRaceLapCompletionEffects({scene,row,grantLoot,reportFailure}){
  if(!scene||!Number.isFinite(row?.lapMs)||row.lapMs<=0)return {processed:false,rewardGranted:false,failures:[]};
  const failures=[];
  const safely=(phase,work)=>{
    try{return {ok:true,value:work()};}
    catch(error){
      failures.push(phase);
      try{reportFailure?.(phase,error);}catch{}
      return {ok:false,value:null};
    }
  };
  const registered=safely('register-records',()=>scene._registerLapRecords(row));
  if(registered.ok){
    safely('display-records',()=>scene._showTimingAchievement(registered.value,row.lapMs));
  }
  const reward=safely('persist-loot',()=>grantLoot({trackKey:scene.trackKey,lapMs:row.lapMs}));
  if(reward.ok){
    safely('display-loot',()=>scene._showRaceLoot(reward.value));
  }
  return {processed:true,rewardGranted:reward.ok,failures};
}
