// CraftRace LIVE 4 EXPERIMENTAL: 1 local car, 0–3 remotely rendered
// human cars, and up to 3 locally simulated AI cars on HOST ONLY.
// Nothing in here touches online LIVE 2, official records or rewards.
// Server v2 handles room admission and provisional finish results.
import {consumeLive4RaceSession} from './craftraceLiveV2RaceSession.js';
import {CrafRaceLive4RemoteModel} from './craftraceLiveV2RaceModel.js';
import {CrafRaceLive4PositionLink} from './craftraceLiveV2PositionLink.js';
import {CrafRaceLive4BotDirector} from './craftraceLiveV2BotDirector.js';
import {advanceHostedLive4Bots} from './craftraceLive4HostContinuity.js';
import {syncLive4CarVisual} from './craftraceLiveV2CarVisual.js';
import {CrafRaceLiveV2LobbyMonitor,finishLiveV2Lobby,acknowledgeLiveV2GridLoaded} from './craftraceLiveV2LobbyClient.js';

const TINTS=[0xffc35b,0x73d7ff,0xee81ce,0x9affbb];
const fmt=ms=>{
 if(!Number.isFinite(ms))return '—';
 const v=Math.max(0,Math.round(ms));
 return Math.floor(v/60000)+':'+String(Math.floor(v%60000/1000)).padStart(2,'0')+
  '.'+String(v%1000).padStart(3,'0');
};
export function attachCrafRaceLive4Pilot(scene,roomId){
 const session=consumeLive4RaceSession(roomId);
 if(!session||!scene?.carBody||!scene?.carRig?.list?.length){
   console.error('[LIVE 4] Missing authenticated room handoff or player body');
   return null;
 }
 const {room,identity}=session,roster=room.locked_roster;
 const localId=identity.id,hostId=room.host_id,isHost=localId===hostId;
 const model=new CrafRaceLive4RemoteModel({roomId,hostId,localId,roster});
 const localSeat=model.localSeat;
 const sprite=scene.carRig.list.find(item=>item?.texture?.key);
 if(!sprite)throw Error('LIVE 4 car sprite unavailable');
 let stopped=false,linkReady=false,startAt=Number(room.start_at_ms)||0;
 let gridAckPending=false,gridAckDone=false,lastGridAckAt=-5000;
 const ackGrid=now=>{
   if(stopped||!linkReady||aiError||gridAckPending||gridAckDone||now-lastGridAckAt<4000)return;
   gridAckPending=true;lastGridAckAt=now;
   void acknowledgeLiveV2GridLoaded(roomId).then(snapshot=>{
     if(stopped)return;
     gridAckDone=true;
     if(Number.isFinite(snapshot?.start_at_ms))startAt=snapshot.start_at_ms;
     if(Number.isFinite(snapshot?.clientClockOffsetMs))clockOffset=snapshot.clientClockOffsetMs;
   }).catch(err=>{if(!stopped)console.warn('[LIVE 4] Grid acknowledgement:',err.message);})
   .finally(()=>{gridAckPending=false;});
 };
 let clockOffset=Number(room.clientClockOffsetMs)||0;
 let localStartPerf=null,lastLocalSend=0,localPending=false;
 let completed=0,lapTimes=[],localFinish=null,localFinishPosted=false;
 let lastPostAttempt=0,localPosCount=0,slowFrames=0,frameCount=0;
 let elapsedWindow=0,lastUpdate=0,lastReport=0,frameTimes=[];
 const botPostAttempts=new Map(),postedBots=new Set();
 const states=new Map(),paint=new Map();
 // Low-cost, DEV-only performance HUD. Refresh only every 5 seconds.
 const perfHud=document.createElement('output');
 perfHud.setAttribute('aria-label','Diagnóstico LIVE 4');
 perfHud.style.cssText=[
   'position:fixed','right:max(5px,env(safe-area-inset-right))',
   'bottom:max(5px,env(safe-area-inset-bottom))','z-index:2147483500',
   'padding:4px 7px','max-width:min(92vw,380px)',
   'background:rgba(3,17,28,.82)','color:#aaf7df',
   'border:1px solid rgba(113,210,218,.45)',
   'font:600 10px ui-monospace,monospace','white-space:normal',
   'pointer-events:none'
 ].join(';');
 perfHud.textContent='LIVE 4 · conectando…';
 document.body.append(perfHud);
 const results=document.createElement('section');
 results.className='cr4-result-shell';results.style.display='none';
 results.setAttribute('role','dialog');results.setAttribute('aria-label','Resultados provisionales LIVE 4');
 document.body.append(results);
 const raceEntries=model.roster;
 const createVisual=item=>{
   if(item.seat===localSeat||isHost&&item.kind==='ai')return;
   const visual=scene.add.sprite(0,0,'__DEFAULT').setVisible(false);
   syncLive4CarVisual(scene,visual,TINTS[item.seat]);
   const rig=scene.add.container(scene.carBody.x,scene.carBody.y,[visual])
     .setDepth(29).setVisible(false);
   const label=scene.add.text(0,-40,
     item.kind==='ai'?'IA '+item.difficulty:'PILOTO '+(item.seat+1),{
       fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
       color:'#ffffff',backgroundColor:'#112638',padding:{x:4,y:2}
     }).setOrigin(.5).setDepth(31).setVisible(false);
   paint.set(item.seat,{rig,label,visual,tint:TINTS[item.seat],lastDrawn:0});
 };
 raceEntries.forEach(createVisual);
 let director=null,aiError=null;
 if(isHost){
   try{
     director=new CrafRaceLive4BotDirector(scene,{
       roster:raceEntries,hostId,localId,
       startingGrid:scene._crafRaceLiveV2Grid,laps:room.laps
     });
   }catch(err){
     aiError=err;console.error('[LIVE 4] Could not initialize physical AI:',err);
   }
 }
 // Keep local simulation authoritative even if Supabase Realtime disconnects.
 let link=null,reconnecting=false,offlineSince=performance.now(),
   lastReconnectAttempt=-10000;
 const startLink=async()=>{
   if(stopped||link)return;
   const instance=new CrafRaceLive4PositionLink({
     roomId,hostId,localId,roster,
     onPosition:packet=>{model.accept(packet,performance.now());},
     onStatus:(ready,status)=>{
       if(stopped||link!==instance)return;
       linkReady=ready;
       if(ready)offlineSince=null;
       else{
         if(offlineSince===null)offlineSince=performance.now();
         console.warn('[LIVE 4] Realtime status',status);
       }
     }
   });
   link=instance;
   try{await instance.connect();}
   catch(err){
     if(link!==instance||stopped)return;
     linkReady=false;
     if(offlineSince===null)offlineSince=performance.now();
     console.error('[LIVE 4] Realtime connection error',err);
   }
 };
 const reconnectLink=now=>{
   if(stopped||linkReady||reconnecting||offlineSince===null||
     now-offlineSince<6500||now-lastReconnectAttempt<9000)return;
   lastReconnectAttempt=now;reconnecting=true;
   const old=link;link=null;
   // New transport epoch, same authenticated room/seat, same local bot state.
   void Promise.resolve(old?.close()).catch(()=>{}).finally(()=>{
     reconnecting=false;
     if(!stopped)void startLink();
   });
 };
 void startLink();
 const monitor=new CrafRaceLiveV2LobbyMonitor(roomId,{
   snapshotMs:1250,heartbeatMs:5000,
   onSnapshot:s=>{
     if(stopped||s.id!==roomId)return;
     if(Number.isFinite(s.clientClockOffsetMs))
       clockOffset=clockOffset*.75+s.clientClockOffsetMs*.25;
     if(Number.isFinite(s.start_at_ms)&&s.start_at_ms>0)startAt=s.start_at_ms;
     states.clear();
     for(const result of s.results||[])states.set(result.seat,result);
     // Server snapshots can lag local completed AI results after an outage.
     // Preserve valid local finishes until the remote snapshot catches up.
     for(const bot of director?.results()||[])if(!states.has(bot.seat))
       states.set(bot.seat,{seat:bot.seat,elapsedMs:bot.elapsedMs,
         lapTimes:bot.lapTimes,kind:'ai'});
     if(localFinish)showResults();
   },
   onError:err=>{if(!stopped)console.warn('[LIVE 4] Snapshot:',err.message);}
 });
 monitor.start();
 const sendPose=(seat,pose)=>{
   if(!linkReady||!link||stopped||botPostAttempts.get('pending'+seat))return;
   botPostAttempts.set('pending'+seat,true);
   void link.send(seat,pose).then(ok=>{
     if(ok&&seat===localSeat)localPosCount++;
   }).catch(()=>{}).finally(()=>botPostAttempts.delete('pending'+seat));
 };
 const saveResult=(seat,data,attemptAt)=>{
   if(stopped||botPostAttempts.get('write'+seat)||
     attemptAt-Number(botPostAttempts.get('last'+seat)||0)<3000)return;
   botPostAttempts.set('last'+seat,attemptAt);
   botPostAttempts.set('write'+seat,true);
   void finishLiveV2Lobby(roomId,seat,data.lapTimes,data.elapsedMs)
     .then(()=>{
       if(seat===localSeat)localFinishPosted=true;
       else postedBots.add(seat);
       states.set(seat,{seat,elapsedMs:data.elapsedMs,lapTimes:data.lapTimes,
         kind:seat===localSeat?'human':'ai'});
       if(localFinish)showResults();
     })
     .catch(err=>console.warn('[LIVE 4] Finish persistence:',err.message))
     .finally(()=>botPostAttempts.delete('write'+seat));
 };
 const showResults=()=>{
   if(!localFinish||stopped)return;
   results.style.display='flex';
   results.replaceChildren();
   const panel=document.createElement('div');panel.className='cr4-result-panel';
   const headline=document.createElement('h2');headline.textContent='LIVE 4 · RESULTADOS AMISTOSOS';
   panel.append(headline);
   const intro=document.createElement('p');
   intro.textContent=String(room.laps)+' VUELTAS · SIN RÉCORDS NI CRÉDITOS';
   panel.append(intro);
   const list=document.createElement('ol');list.className='cr4-result-list';
   const ordered=raceEntries.map(entry=>({
     seat:entry.seat,
     name:entry.kind==='ai'?'IA · NIVEL '+entry.difficulty:
       entry.player_id===localId?'TÚ':'PILOTO '+(entry.seat+1),
     time:states.get(entry.seat)?.elapsedMs??
       (entry.seat===localSeat?localFinish.elapsedMs:null)
   }));
   ordered.sort((a,b)=>(a.time??Infinity)-(b.time??Infinity));
   for(const entry of ordered){
     const li=document.createElement('li');
     const name=document.createElement('strong');name.textContent=entry.name;
     const time=document.createElement('span');time.textContent=fmt(entry.time);
     li.append(name,time);list.append(li);
   }
   panel.append(list);
   const status=document.createElement('p');status.className='cr4-result-note';
   const allFinished=ordered.every(x=>x.time!==null);
   // Keep the live race visible while AI finish after the player.
   results.classList.toggle('cr4-results-waiting',!allFinished);
   const unposted=Boolean(localFinish&&!localFinishPosted)||
     Boolean(director?.results().some(bot=>!postedBots.has(bot.seat)));
   status.textContent=allFinished
     ?(!linkReady||unposted
       ?'Todos han terminado localmente. Resultados pendientes de sincronizar.'
       :'Todos han terminado. Clasificación provisional.')
     :(!linkReady
       ?'Red interrumpida · Las IA locales siguen compitiendo. Esperando resultados.'
       :'Esperando los resultados del resto de pilotos…');
   panel.append(status);
   const back=document.createElement('button');back.type='button';
   back.textContent='VOLVER AL MENÚ';back.onclick=()=>scene.scene.start('menu');
   panel.append(back);results.append(panel);
 };
 const finishCheck=now=>{
   if(!scene._raceStarted||localFinish)return;
   const done=Math.max(0,Math.floor(Number(scene.lapCount)||0));
   if(done>completed&&done===completed+1&&localStartPerf!==null){
     const total=Math.round(now-localStartPerf);
     const lastTotal=lapTimes.reduce((a,b)=>a+b,0);
     const lap=total-lastTotal;
     if(lap>=500&&total<=7200000)lapTimes.push(lap);
     completed=done;
   }
   if(done>=room.laps&&lapTimes.length===room.laps){
     const elapsedMs=lapTimes.reduce((a,b)=>a+b,0);
     localFinish={seat:localSeat,lapTimes:[...lapTimes],elapsedMs};
     scene._raceStarted=false;
     scene.carBody?.body?.setVelocity?.(0,0);
     scene.carBody?.body?.setAngularVelocity?.(0);
     showResults();
   }
 };
 const update=(now,deltaMs=16.667)=>{
   if(stopped)return;
   if(scene._startState==='COUNTDOWN')scene._crafRaceLiveReadyRequested=true;
   // Server had already verified readiness before locking the roster.
   // The client still blocks GO until an authenticated private channel joins.
   if(scene._startState==='COUNTDOWN'){
     ackGrid(now);
     scene._crafRaceLiveStartAt=startAt||null;
     if(!linkReady||aiError||!startAt){
       if(scene._startStatus)scene._startStatus.setText(aiError?
         'ERROR IA FÍSICA · SALIDA BLOQUEADA':!linkReady?
         'CONECTANDO PILOTOS · LIVE 4':'ESPERANDO CARGA DE LOS PILOTOS · LIVE 4');
     }
   }
   reconnectLink(now);
   if(scene._raceStarted&&localStartPerf===null)localStartPerf=now;
   finishCheck(now);
   // Update only remotely controlled rigs; never mutate local car dynamics.
   for(const item of model.positions(now)){
     const visual=paint.get(item.seat);
     if(!visual)continue;
     if(item.disconnected||!item.pose){
       visual.rig.setVisible(false);visual.label.setVisible(false);
       continue;
     }
     const pose=item.pose;
     const textured=syncLive4CarVisual(scene,visual.visual,visual.tint);
     const dt=visual.lastDrawn?Math.max(0,Math.min(80,now-visual.lastDrawn)):16.667;
     visual.lastDrawn=now;
     const blend=visual.rig.visible?1-Math.exp(-dt/115):1;
     const x=visual.rig.visible?visual.rig.x+(pose.x-visual.rig.x)*blend:pose.x;
     const y=visual.rig.visible?visual.rig.y+(pose.y-visual.rig.y)*blend:pose.y;
     const target=pose.angle+(scene._carVisualRotOffset||0);
     const offset=Math.atan2(Math.sin(target-visual.rig.rotation),Math.cos(target-visual.rig.rotation));
     visual.rig.setPosition(x,y)
       .setRotation(visual.rig.visible?visual.rig.rotation+offset*blend:target)
       .setVisible(textured);
     visual.label.setPosition(x,y-40).setVisible(textured);
   }
   if(scene.carBody?.active&&linkReady&&(!localFinish)){
     const body=scene.carBody,v=body.body?.velocity;
     const moving=Math.hypot(v?.x||0,v?.y||0)>1;
     const interval=scene._raceStarted&&moving?150:moving?500:1600;
     if(now-lastLocalSend>=interval){
       lastLocalSend=now;
       sendPose(localSeat,{x:body.x,y:body.y,angle:body.rotation,
         speed:Math.hypot(v?.x||0,v?.y||0),
         tick:Math.max(0,Math.floor(scene.simTick||0)),
         lap:Math.max(0,Math.floor(scene.lapCount||0))});
     }
   }
   // LIVE 4 host physics must advance even if the private Realtime link
   // goes offline. Network readiness only controls packet transmission.
   advanceHostedLive4Bots({
     director,deltaMs,now,
     started:scene._raceStarted||Boolean(localFinish),
     linkReady,sendPose,
     onBotFinish:bot=>{
       const local=states.get(bot.seat);
       if(local?.elapsedMs!==bot.elapsedMs){
         states.set(bot.seat,{seat:bot.seat,elapsedMs:bot.elapsedMs,
           lapTimes:bot.lapTimes,kind:'ai'});
         if(localFinish)showResults();
       }
       if(!postedBots.has(bot.seat))saveResult(bot.seat,bot,now);
     }
   });
   if(localFinish&&!localFinishPosted)saveResult(localSeat,localFinish,now);
   // Aggregate perf only every five seconds. Never render diagnostics each frame.
   if(lastUpdate){
     const ms=Math.max(0,now-lastUpdate);
     // Exclude the pause after tab/app backgrounding from active-play FPS.
     if(ms>0&&ms<=250&&document.visibilityState!=='hidden'){
       frameCount++;elapsedWindow+=ms;
       if(ms>33.4)slowFrames++;
       frameTimes.push(ms);
     }
   }
   lastUpdate=now;
   if(now-lastReport>=5000){
     const stats=model.stats(),ai=director?.stats()||{count:0,botCpuMeanMs:0};
     const sorted=frameTimes.sort((a,b)=>a-b);
     const p95=sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)]:0;
     const fps=Math.round(frameCount*1000/Math.max(1,elapsedWindow));
     const record={fps,p95FrameMs:+p95.toFixed(1),slowFrames,
       remoteCars:stats.remoteCount,received:stats.accepted,rejected:stats.rejected,
       localSent:localPosCount,aiCars:ai.count,
       botCpuMeanMs:+ai.botCpuMeanMs.toFixed(3),realtime:linkReady};
     if(scene._raceStarted||localFinish)console.info('[LIVE 4 PERF]',record);
     if(!stopped){
       perfHud.textContent='LIVE 4 · '+(frameCount?fps+' FPS':'SIN MUESTRAS')+
         ' · P95 '+(frameCount?p95.toFixed(1):'—')+' ms'+
         ' · IA '+ai.count+' ('+record.botCpuMeanMs.toFixed(2)+' ms)'+
         ' · RIVALES '+stats.remoteCount+
         ' · RED '+(linkReady?'OK':'SIN ENLACE');
       perfHud.style.color=frameCount&&fps<45?'#ffd2ad':'#aaf7df';
     }
     frameCount=0;elapsedWindow=0;slowFrames=0;frameTimes=[];lastReport=now;
   }
 };
 const stop=()=>{
   if(stopped)return;
   stopped=true;monitor.stop();void link?.close();
   director?.destroy();
   for(const v of paint.values()){v.rig.destroy();v.label.destroy();}
   paint.clear();results.remove();perfHud.remove();
 };
 scene.events.once('shutdown',stop);
 return{update,stop,get ownReady(){return linkReady&&!aiError;},
   get otherReady(){return linkReady&&!aiError;},
   get serverOffsetMs(){return clockOffset;}};
}
