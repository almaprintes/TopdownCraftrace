// CraftRace LIVE 4 EXPERIMENTAL: 1 local car, 0–3 remotely rendered
// human cars, and up to 3 locally simulated AI cars on HOST ONLY.
// Nothing in here touches online LIVE 2, official records or rewards.
// Server v2 handles room admission and provisional finish results.
import {consumeLive4RaceSession} from './craftraceLiveV2RaceSession.js';
import {CrafRaceLive4RemoteModel} from './craftraceLiveV2RaceModel.js';
import {CrafRaceLive4PositionLink} from './craftraceLiveV2PositionLink.js';
import {CrafRaceLive4BotDirector} from './craftraceLiveV2BotDirector.js';
import {hasLive4GuidedGForRoom,setLive4GuidedGForRoom} from './craftraceLive4GuidedGExperiment.js';
import {advanceHostedLive4Bots} from './craftraceLive4HostContinuity.js';
import {syncLive4CarVisual} from './craftraceLiveV2CarVisual.js';
import {live4SeatName} from './craftraceLiveV2PilotNames.js';
import {CrafRaceLiveV2LobbyMonitor,finishLiveV2Lobby,acknowledgeLiveV2GridLoaded,
 requestLiveV2Rematch,acceptLiveV2Rematch} from './craftraceLiveV2LobbyClient.js';

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
 const guidedGTrial=isHost&&scene.trackKey==='santa-cruz'&&
   roster.some(x=>x.kind==='ai'&&x.difficulty===3)&&
   hasLive4GuidedGForRoom(roomId);
 const model=new CrafRaceLive4RemoteModel({roomId,hostId,localId,roster});
 const localSeat=model.localSeat;
 const sprite=scene.carRig.list.find(item=>item?.texture?.key);
 if(!sprite)throw Error('LIVE 4 car sprite unavailable');
 let stopped=false,linkReady=false,startAt=Number(room.start_at_ms)||0;
 let rematchRoomId=room.rematch_room_id||null;
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
 perfHud.textContent='LIVE 4'+(guidedGTrial?' · G BÉZIER + DADOS':'')+' · conectando…';
 document.body.append(perfHud);
 const results=document.createElement('section');
 results.className='cr4-result-shell';results.style.display='none';
 results.setAttribute('role','dialog');results.setAttribute('aria-label','Resultados provisionales LIVE 4');
 document.body.append(results);
 const raceEntries=model.roster;
 // The room snapshot is authenticated and authorized by server membership.
 // Preserve known names during temporary Realtime/snapshot outages.
 const membersById=new Map();
 const updateNames=s=>{
   for(const member of s?.members||[]){
     if(typeof member?.player_id==='string'&&typeof member?.nick==='string'){
       membersById.set(member.player_id,member.nick);
     }
   }
 };
 updateNames(room);
 const displayName=entry=>live4SeatName(entry,
   [...membersById].map(([player_id,nick])=>({player_id,nick})),
   room.ai_identity_seed||room.id);
 const createVisual=item=>{
   if(item.seat===localSeat||isHost&&item.kind==='ai')return;
   const visual=scene.add.sprite(0,0,'__DEFAULT').setVisible(false);
   syncLive4CarVisual(scene,visual,TINTS[item.seat]);
   const rig=scene.add.container(scene.carBody.x,scene.carBody.y,[visual])
     .setDepth(29).setVisible(false);
   const label=scene.add.text(0,-40,displayName(item),{
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
       startingGrid:scene._crafRaceLiveV2Grid,laps:room.laps,
       live4GuidedGTrial:guidedGTrial,
       aiIdentitySeed:room.ai_identity_seed||room.id
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
     updateNames(s);
     if(typeof s.rematch_room_id==='string')rematchRoomId=s.rematch_room_id;
     for(const item of raceEntries){
       const visual=paint.get(item.seat);
       const nick=displayName(item);
       if(visual?.label?.text!==nick)visual?.label?.setText(nick);
     }
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
 let lastResultsSnapshot=null;
 const openRematchLobby=next=>{
   if(!next?.id||!Array.isArray(next?.members))throw Error('Revancha sin sala autorizada');
   // Never reuse an existing room or its saved result rows.
   scene.scene.start('stats',{
     onlineFromLobby:true,
     raceControlTrackId:next.track_id,liveTrackId:next.track_id,
     liveCarId:next.car_id,live4RematchRoom:next
   });
 };
 const showResults=()=>{
   if(!localFinish||stopped)return;
   // Network acknowledgements may call this repeatedly while the player
   // reads the results. Replacing DOM resets <details> and scroll on iOS.
   const snapshot=JSON.stringify({
     localFinish,localFinishPosted,linkReady,rematchRoomId,
     entries:raceEntries.map(entry=>({
       seat:entry.seat,name:displayName(entry),
       elapsedMs:states.get(entry.seat)?.elapsedMs??null,
       lapTimes:states.get(entry.seat)?.lapTimes||
         states.get(entry.seat)?.lap_times||null
     })),
     postedBots:[...postedBots].sort((a,b)=>a-b),
     dice:guidedGTrial?director?.results().map(bot=>({
       seat:bot.seat,lapTimes:bot.lapTimes,
       bezierDieHistory:bot.bezierDieHistory
     })):null
   });
   if(snapshot===lastResultsSnapshot&&results.querySelector('.cr4-result-panel'))return;
   lastResultsSnapshot=snapshot;
   const previousPanel=results.querySelector('.cr4-result-panel');
   const savedScrollTop=previousPanel?.scrollTop||0;
   const diceWasOpen=previousPanel?.querySelector('details')?.open===true;
   results.style.display='flex';
   results.replaceChildren();
   const panel=document.createElement('div');panel.className='cr4-result-panel';
   const headline=document.createElement('h2');headline.textContent='LIVE 4 · RESULTADOS AMISTOSOS';
   panel.append(headline);
   const intro=document.createElement('p');
   intro.textContent=String(room.laps)+' VUELTAS · SIN RÉCORDS NI CRÉDITOS'+
     (guidedGTrial?' · IA G BÉZIER + DADOS':'');
   panel.append(intro);
   const list=document.createElement('ol');list.className='cr4-result-list';
   const ordered=raceEntries.map(entry=>({
     seat:entry.seat,
     name:displayName(entry),
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
   const lapTable=document.createElement('table');lapTable.className='cr4-laps';
   const header=document.createElement('tr');
   for(const title of ['PILOTO',...Array.from({length:room.laps},(_,i)=>'V'+(i+1))]){
     const th=document.createElement('th');th.textContent=title;header.append(th);
   }
   lapTable.append(header);
   for(const entry of raceEntries){
     const data=states.get(entry.seat);
     const times=(entry.seat===localSeat?localFinish?.lapTimes:null)||
       data?.lapTimes||data?.lap_times||[];
     const tr=document.createElement('tr'),name=document.createElement('th');
     name.textContent=displayName(entry);tr.append(name);
     for(let n=0;n<room.laps;n++){
       const td=document.createElement('td');td.textContent=fmt(times[n]);tr.append(td);
     }
     lapTable.append(tr);
   }
   panel.append(lapTable);
   if(guidedGTrial&&director?.results().length){
     const dice=document.createElement('details');
     // Keep the user's toggle open through real server-state updates.
     dice.open=diceWasOpen;
     const summary=document.createElement('summary');
     summary.textContent='TIRADAS AUTOMÁTICAS DE DADO (POR VUELTA)';
     dice.append(summary);
     for(const b of director.results()){
       const p=document.createElement('p');p.className='cr4-result-note';
       p.textContent=(b.aiPilotName||'IA '+(b.seat+1))+' · '+
         (b.bezierDieHistory||[]).map(x=>'V'+x.lap+': '+x.face+'/6 · '+
           Number(x.plannedVariationPx||0).toFixed(1)+' px previstos').join(' | ');
       dice.append(p);
     }
     const explanation=document.createElement('small');
     explanation.textContent='Variación planificada, no distancia física garantizada. Tiradas invisibles durante la carrera.';
     dice.append(explanation);panel.append(dice);
   }
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
   if(allFinished&&director){
     // Host-only, observational telemetry; guests still see identical
     // classification data. No finish times are recalculated.
     const diag=director.stats();
     const occupied=diag.cornerDiagnostics||[];
     const average=occupied.length
       ?Math.round(occupied.reduce((n,b)=>n+b.lateralMeanPct,0)/occupied.length):null;
     const detail=document.createElement('p');
     detail.className='cr4-result-note';
     const target=occupied.length
       ?Math.round(occupied.reduce((n,b)=>n+b.targetMeanPct,0)/occupied.length):null;
     const follow=occupied.length
       ?Math.round(occupied.reduce((n,b)=>n+b.followMeanErrorPct,0)/occupied.length):null;
     detail.textContent='IA · OBJETIVO LATERAL '+(target===null?'—':target+'%')+
       ' · REAL '+(average===null?'—':average+'%')+
       ' · ERROR SEGUIMIENTO '+(follow===null?'—':follow+'%')+
       ' · HITCH '+diag.timing.hitches+
       ' · TIEMPO NO INTEGRADO '+diag.timing.droppedSeconds.toFixed(2)+' s';
     panel.append(detail);
   }
   // Authenticated rematch: only the previous host can propose. Former
   // human participants can accept without a second invitation code.
   if(allFinished&&!unposted&&linkReady){
     if(isHost&&!rematchRoomId){
       const repeat=document.createElement('button');
       repeat.type='button';repeat.textContent='REVANCHA · MISMA PARRILLA';
       repeat.onclick=async()=>{
         repeat.disabled=true;repeat.textContent='CREANDO REVANCHA…';
         try{
           const next=await requestLiveV2Rematch(roomId);
           setLive4GuidedGForRoom(next.id,guidedGTrial);
           openRematchLobby(next);
         }catch(e){
           status.textContent='Revancha: '+(e?.message||'No disponible');
           repeat.disabled=false;repeat.textContent='REINTENTAR REVANCHA';
         }
       };
       panel.append(repeat);
     }else if(!isHost&&rematchRoomId){
       const accept=document.createElement('button');
       accept.type='button';accept.textContent='ACEPTAR REVANCHA';
       accept.onclick=async()=>{
         accept.disabled=true;accept.textContent='UNIÉNDOTE A LA REVANCHA…';
         try{openRematchLobby(await acceptLiveV2Rematch(roomId));}
         catch(e){
           status.textContent='Revancha: '+(e?.message||'No disponible');
           accept.disabled=false;accept.textContent='REINTENTAR REVANCHA';
         }
       };
       panel.append(accept);
     }else if(!isHost){
       const hint=document.createElement('p');hint.className='cr4-result-note';
       hint.textContent='Esperando a que el organizador proponga una revancha…';
       panel.append(hint);
     }
   }
   const back=document.createElement('button');back.type='button';
   back.textContent='VOLVER AL MENÚ';back.onclick=()=>scene.scene.start('menu');
   panel.append(back);results.append(panel);
   panel.scrollTop=Math.min(savedScrollTop,
     Math.max(0,panel.scrollHeight-panel.clientHeight));
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
       perfHud.textContent='LIVE 4'+(guidedGTrial?' · G':'')+' · '+(frameCount?fps+' FPS':'SIN MUESTRAS')+
         ' · P95 '+(frameCount?p95.toFixed(1):'—')+' ms'+
         ' · IA '+ai.count+' ('+record.botCpuMeanMs.toFixed(2)+' ms)'+
         ' · RIVALES '+stats.remoteCount+
         ' · RED '+(linkReady?'OK':'SIN ENLACE')+
         (director?' · IA HITCH '+(ai.timing?.hitches||0)+
           ' · Δ '+(ai.timing?.droppedSeconds||0).toFixed(1)+'s':
           '');
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
