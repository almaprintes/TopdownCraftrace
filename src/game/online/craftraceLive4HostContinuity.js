// LIVE 4 host simulation must NEVER depend on Realtime transport readiness.
// The host is authoritative for all of its physical AI even during a socket
// outage; only broadcasts are conditional. No Supabase writes or reward logic.
export function advanceHostedLive4Bots({
 director,deltaMs,now,started,linkReady,sendPose,onBotFinish
}={}){
 if(!director)return{advanced:false,poses:0,finishes:0};
 const poses=director.update(deltaMs,now,Boolean(started));
 if(linkReady){
  for(const {seat,pose} of poses)sendPose(seat,pose);
 }
 const results=director.results();
 for(const result of results)onBotFinish(result);
 return{advanced:true,poses:poses.length,finishes:results.length};
}
