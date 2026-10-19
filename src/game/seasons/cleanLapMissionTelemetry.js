// Shared clean-lap objectives: counts by car/track and single-session streaks.
// No old, unclassified ttHistory rows are retroactively considered clean.
export const CLEAN_LAP_MISSIONS_KEY='tdr2:cleanLapMissions:v1';
const norm=v=>String(v||'').trim(),num=n=>Math.max(0,Math.floor(Number(n)||0));
function blank(){return {version:1,byTrackCar:{},active:[],recent:[]};}
function load(){
 try{const s=JSON.parse(localStorage.getItem(CLEAN_LAP_MISSIONS_KEY)||'null');
  if(s?.version===1&&s.byTrackCar&&Array.isArray(s.active))
   return {...s,recent:Array.isArray(s.recent)?s.recent.slice(-80):[]};
 }catch{}
 return blank();
}
function save(s){try{localStorage.setItem(CLEAN_LAP_MISSIONS_KEY,JSON.stringify(s));}catch{}return s;}
function gather(o,path='root',out=[]){
 if(o?.type==='cleanLaps')out.push({path,config:{carId:norm(o.carId),trackId:norm(o.trackId),
  consecutive:o.consecutive===true||o.mode==='consecutive'}});
 if(o?.type==='combined')for(const [i,p] of (o.parts||[]).entries())gather(p,path+'.'+i,out);
 return out;
}
// Called when an objective becomes active; idempotent on repeated UI reads.
export function syncCleanLapMissionObjectives(missionId,objective){
 const id=norm(missionId),wanted=id?gather(objective):[],s=load();
 const next=wanted.map(x=>{
  const key=id+':'+x.path,prev=s.active.find(a=>a.id===key&&JSON.stringify(a.config)===JSON.stringify(x.config));
  return prev||{id:key,config:x.config,total:0,currentRun:0,bestRun:0,sessionId:null};
 });
 if(JSON.stringify(next)!==JSON.stringify(s.active)){s.active=next;save(s);}
 return next;
}
export function beginCleanLapMissionSession(sessionId){
 const id=norm(sessionId);if(!id)return;
 const s=load();let changed=false;
 for(const a of s.active)if(a.sessionId!==id){a.sessionId=id;a.currentRun=0;changed=true;}
 if(changed)save(s);
}
export function endCleanLapMissionSession(sessionId){
 const id=norm(sessionId);if(!id)return;
 const s=load();let changed=false;
 for(const a of s.active)if(a.sessionId===id){a.sessionId=null;a.currentRun=0;changed=true;}
 if(changed)save(s);
}
export function recordCleanLapMissionLap({trackId,carId,sessionId,eventId,valid=true,clean=false}={}){
 const track=norm(trackId),car=norm(carId),session=norm(sessionId),event=norm(eventId);
 const s=load();if(!track||!car||!session||!event)return s;
 const unique=session+':'+event;
 if(s.recent.includes(unique))return s; // no duplicate completion
 s.recent.push(unique);s.recent=s.recent.slice(-80);
 const qualifying=valid===true&&clean===true;
 if(valid===true){
  const cars=s.byTrackCar[track]||(s.byTrackCar[track]={});
  const pair=cars[car]||(cars[car]={laps:0,clean:0});
  pair.laps=num(pair.laps)+1;if(qualifying)pair.clean=num(pair.clean)+1;
 }
 for(const a of s.active){
  if(a.sessionId!==session){a.sessionId=session;a.currentRun=0;}
  const matches=(!a.config.carId||a.config.carId===car)&&(!a.config.trackId||a.config.trackId===track);
  if(qualifying&&matches){
   a.total=num(a.total)+1;a.currentRun=num(a.currentRun)+1;
   a.bestRun=Math.max(num(a.bestRun),a.currentRun);
  }else a.currentRun=0; // dirty, invalid or wrong pairing
 }
 return save(s);
}
export function cleanLapsByCarAndTrack(carId,trackId){
 const row=load().byTrackCar?.[norm(trackId)]?.[norm(carId)];
 return {laps:num(row?.laps),clean:num(row?.clean)};
}
export function getCleanLapMissionProgress(missionId,path='root'){
 const a=load().active.find(x=>x.id===norm(missionId)+':'+norm(path));
 if(!a)return {value:0,total:0,currentRun:0,bestRun:0,consecutive:false};
 return {value:a.config?.consecutive?num(a.bestRun):num(a.total),
  total:num(a.total),currentRun:num(a.currentRun),bestRun:num(a.bestRun),
  consecutive:!!a.config?.consecutive};
}
