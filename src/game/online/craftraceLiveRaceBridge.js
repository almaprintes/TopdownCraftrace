import {dressResultPanel,resultHero} from '../ui/raceResultsPresentation.js';
// DEV-only live visual bridge. Remote pilot never participates in local collisions.
import {RemotePilotInterpolator} from './craftraceLiveRaceModel.js';
import {connectLivePositionBroadcast} from './craftraceLiveTransport.js';
import {takeLiveSession} from './craftraceLiveSession.js';
import {CAR_SPECS} from '../cars/carSpecs.js';
import {getEquippedCarSkin,availableCarSkins} from '../skins/carSkins.js';
import {localLivePilot,parseLivePilot,pilotName,pilotMastery,livePilotHandshake} from './craftraceLivePilot.js';
import {getTrackPublicName} from '../tracks/trackPublicNames.js';
import {masteryWheelDataUri} from '../stats/carMastery.js';
import '../ui/craftraceLiveResults.css';
const validRoom=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
export function attachCrafRaceLivePilot(scene,roomId){
 if(!validRoom(roomId)||!scene?.carBody||!scene?.add)return null;
 const interpolation=new RemotePilotInterpolator({delayMs:350,maxExtrapolateMs:100});
 const localSprite=scene.carRig?.list?.find?.(item=>item?.texture?.key);
 if(!localSprite)return null;
 const remoteSprite=scene.add.sprite(0,0,'car').setAlpha(1);
 remoteSprite.setOrigin(localSprite.originX,localSprite.originY).setScale(localSprite.scaleX,localSprite.scaleY);
 const remote=scene.add.container(scene.carBody.x,scene.carBody.y,[remoteSprite]).setDepth(29).setVisible(false);
 const label=scene.add.text(0,-45,'RIVAL · LIVE',{fontFamily:'system-ui',fontSize:'14px',color:'#ffffff',backgroundColor:'#16283c',padding:{x:5,y:3}}).setOrigin(0.5).setDepth(31).setVisible(false);
 let lastSent=0,stopped=false,positionPending=false,remoteAppearance=null;
 let lastPublishedPose=null;
 let positionBroadcast=null,connectingBroadcast=false,positionBroadcastStatus='HTTP fallback';
 let broadcastLastAttempt=0;
 let lastRemotePacketAt=0,remotePacketGapMs=300,lastRenderedAt=0;
 let perfFrames=0,perfSlowFrames=0,perfTotalMs=0,perfLastAt=0,perfLastReport=0,perfRemotePackets=0;
 let ownReady=false,otherReady=false,startSending=false,readySending=false,lastReadySentAt=0;
 const ownCarId=CAR_SPECS[scene.carId]?.id||CAR_SPECS[scene.baseSpec?.id]?.id||'stock';
 const ownSkinId=getEquippedCarSkin(ownCarId,{spec:CAR_SPECS[ownCarId],dev:true}).id;
 const loadAppearance=(carId,skinId)=>{
  if(!Object.hasOwn(CAR_SPECS,carId))return;
  const spec=CAR_SPECS[carId],skin=availableCarSkins(carId,spec).find(x=>x.id===skinId);
  if(!skin?.file||!/^[a-z0-9_-]+\.webp$/i.test(skin.file))return;
  const signature=carId+':'+skinId;
  if(signature===remoteAppearance)return;
  remoteAppearance=signature;
  const key='cr_live_'+carId+'_'+skinId;
  const apply=()=>{if(stopped||remoteAppearance!==signature||!scene.textures.exists(key))return;
   remoteSprite.setTexture(key).setOrigin(0.5);
   const scale=Number(spec.visualScale)||1;
   const trackScale=Math.max(0.35,Math.min(1.5,Number(scene.track?.carScale??scene.track?.meta?.carScale??1)||1));
   remoteSprite.setScale(Math.min(96*scale*1.35*trackScale/Math.max(1,remoteSprite.width),48*scale*1.35*trackScale/Math.max(1,remoteSprite.height)));
  };
  if(scene.textures.exists(key)){apply();return;}
  const onOk=k=>{if(k!==key)return;cleanup();apply();};
  const onError=file=>{if(file?.key!==key)return;cleanup();console.warn('[CrafRace LIVE] Rival skin unavailable:',key);};
  const cleanup=()=>{scene.load.off('filecomplete-image-'+key,onOk);scene.load.off('loaderror',onError);};
  scene.load.once('filecomplete-image-'+key,onOk);
  scene.load.on('loaderror',onError);
  scene.load.image(key,'assets/skins/'+skin.file+'?v='+encodeURIComponent(spec.collectionNo||1));
  if(!scene.load.isLoading())scene.load.start();
 };
 const session=takeLiveSession(roomId);
 if(!session){remote.destroy();label.destroy();return null;}
 const {transport,room,identity}=session;
 const rivalId=identity.id===room.host_id?room.guest_id:room.host_id;
 const targetLaps=Math.max(1,Math.min(30,Number(room.laps)||3));
 const ownPilot=localLivePilot(ownCarId);
 let rivalPilot=parseLivePilot(room.rivalPilot);
 label.setText(pilotName(rivalPilot,'RIVAL')+' · LIVE');
 const acceptPosition=p=>{
  if(typeof p.payload?.carId==='string'&&typeof p.payload?.skinId==='string')loadAppearance(p.payload.carId,p.payload.skinId);
  const receivedAt=performance.now();
  const accepted=interpolation.push({...p.payload,heat:p.heat,generation:p.generation},receivedAt);
  if(accepted){
   perfRemotePackets++;
   if(lastRemotePacketAt>0){const gap=receivedAt-lastRemotePacketAt;
    if(gap>=40&&gap<=1500)remotePacketGapMs=remotePacketGapMs*0.8+gap*0.2;}
   lastRemotePacketAt=receivedAt;
   interpolation.delayMs=Math.max(220,Math.min(450,remotePacketGapMs+55));
  }
 };
 const startBroadcast=async()=>{
  if(stopped||connectingBroadcast||positionBroadcast)return;
  connectingBroadcast=true;broadcastLastAttempt=performance.now();
  try{
   const connection=await connectLivePositionBroadcast(roomId,identity.id,rivalId,acceptPosition,(ready,status)=>{
    positionBroadcastStatus=ready?'Realtime Broadcast':('HTTP fallback · '+status);
   });
   if(stopped)void connection.close();else positionBroadcast=connection;
  }catch(e){console.warn('[CrafRace LIVE] Realtime unavailable, retaining HTTP fallback:',e.message);}
  finally{connectingBroadcast=false;}
 };
 void startBroadcast();
 let raceStartClock=null,lastCompletedLap=0,lapTimes=[],localFinish=null,rivalFinish=null,finishSending=false;
 const fmt=ms=>{if(!Number.isFinite(ms))return '—';const n=Math.max(0,Math.round(ms));return Math.floor(n/60000)+':'+String(Math.floor(n%60000/1000)).padStart(2,'0')+'.'+String(n%1000).padStart(3,'0');};
 let localRematch=false,rivalRematch=false,rematchBusy=false,rematchLaunching=false,restarting=false,rematchStatus='';
 const results=document.createElement('section');results.className='cr-live-results';
 results.setAttribute('role','dialog');results.setAttribute('aria-modal','true');
 results.setAttribute('aria-label','Resultados de CraftRace Live');results.setAttribute('aria-live','polite');
 const panel=document.createElement('div');panel.className='crl-score';dressResultPanel(panel);results.append(panel);document.body.append(results);
 const restartRace=()=>{
  if(restarting||!localFinish||!rivalFinish)return;
  restarting=true;
  handoffLiveSession(room,transport,identity);
  scene.scene.start('race',{
   carId:ownCarId,trackKey:room.track_id,liveRoomId:room.id,liveStartAt:null,
   liveGridSlot:identity.id===room.host_id?0:1,gameMode:'online',testMode:false
  });
 };
 const maybeStartRematch=async()=>{
  if(stopped||rematchLaunching||!localRematch||!rivalRematch||!localFinish||!rivalFinish||identity.id!==room.host_id)return;
  rematchLaunching=true;rematchStatus='PREPARANDO NUEVA SALIDA…';showResults();
  try{
   const startAt=Math.ceil((transport.serverNow()+6000)/1000)*1000;
   await transport.send('start',{countdownMs:6000,restart:false,startAt});
   restartRace();
  }catch(e){rematchLaunching=false;rematchStatus='No se pudo iniciar la revancha: '+e.message;showResults();}
 };
 const askRematch=async(accept=false)=>{
  if(rematchBusy||localRematch||!localFinish||!rivalFinish)return;
  rematchBusy=true;rematchStatus='ENVIANDO PROPUESTA…';showResults();
  try{
   await transport.send('rematch',accept?{accept:true}:{request:true});
   localRematch=true;rematchStatus='ESPERANDO CONFIRMACIÓN DEL RIVAL…';
   showResults();void maybeStartRematch();
  }catch(e){rematchStatus='No se pudo solicitar: '+e.message;showResults();}
  finally{rematchBusy=false;}
 };
 const declineRematch=async()=>{
  if(rematchBusy)return;
  rematchBusy=true;
  try{await transport.send('rematch',{accept:false});localRematch=false;rivalRematch=false;rematchStatus='REVANCHA RECHAZADA';}
  catch(e){rematchStatus='No se pudo responder: '+e.message;}
  finally{rematchBusy=false;showResults();}
 };
 const showResults=()=>{
  if(!localFinish||stopped)return;
  results.style.display='flex';panel.replaceChildren();
  const eyebrow=document.createElement('div');eyebrow.className='crl-score__eyebrow';eyebrow.textContent='CRAFT RACE STUDIO · LIVE';panel.append(eyebrow);
  const heading=document.createElement('h2');heading.textContent=rivalFinish?'RESULTADOS DE CARRERA':'META · ESPERANDO AL RIVAL';panel.append(heading);
  const intro=document.createElement('p');intro.className='crl-score__track';
  intro.textContent=getTrackPublicName(room.track_id)+' · '+targetLaps+(targetLaps===1?' VUELTA':' VUELTAS');panel.append(intro);
  const grid=document.createElement('div');grid.className='crl-score__grid';panel.append(grid);
  const rows=[{name:pilotName(ownPilot,'TÚ'),tag:'TU CARRERA',pilot:ownPilot,result:localFinish},
   {name:pilotName(rivalPilot,'RIVAL'),tag:'RIVAL',pilot:rivalPilot,result:rivalFinish}];
  if(rivalFinish)rows.sort((a,b)=>(a.result?.elapsedMs??Infinity)-(b.result?.elapsedMs??Infinity));
  if(rivalFinish)panel.insertBefore(resultHero(rows.map(x=>({name:x.name,human:x.pilot===ownPilot,time:fmt(x.result.elapsedMs)}))),grid);
  const best=rivalFinish?Math.min(localFinish.elapsedMs,rivalFinish.elapsedMs):null;
  rows.forEach((entry,index)=>{
   const card=document.createElement('article');card.className='crl-score__driver'+(rivalFinish&&index===0?' winner':'');
   const tag=document.createElement('div');tag.className='crl-score__tag';tag.textContent=rivalFinish?(index===0?'🏆 1º · '+entry.tag:'2º · '+entry.tag):entry.tag;card.append(tag);
   const head=document.createElement('div');head.className='crl-score__head';
   if(Number.isInteger(entry.pilot?.masteryLevel)&&entry.pilot.masteryLevel>0){
    const img=document.createElement('img');img.src=masteryWheelDataUri(entry.pilot.masteryLevel,{size:96});img.alt='Emblema de maestría';head.append(img);
   }
   const info=document.createElement('div');
   const name=document.createElement('div');name.className='crl-score__pilot';name.textContent=entry.name;info.append(name);
   const mastery=document.createElement('p');mastery.className='crl-score__mastery';mastery.textContent=pilotMastery(entry.pilot);info.append(mastery);
   head.append(info);card.append(head);
   const time=document.createElement('div');time.className='crl-score__time';
   time.textContent=entry.result?fmt(entry.result.elapsedMs):'EN CARRERA';card.append(time);
   const metrics=document.createElement('div');metrics.className='crl-score__metrics';
   const lap=document.createElement('span');lap.textContent='MEJOR VUELTA ';
   const lapVal=document.createElement('strong');lapVal.textContent=entry.result?fmt(Math.min(...entry.result.lapTimes)):'—';lap.append(lapVal);metrics.append(lap);
   const delta=document.createElement('span');delta.textContent='DIFERENCIA ';
   const deltaVal=document.createElement('strong');deltaVal.textContent=best===null||!entry.result?'—':'+ '+fmt(entry.result.elapsedMs-best);delta.append(deltaVal);metrics.append(delta);
   card.append(metrics);grid.append(card);
  });
  const status=document.createElement('p');status.className='crl-score__status';
  status.textContent=rematchStatus||(!rivalFinish?'Tu tiempo está cerrado; esperamos a que termine el otro piloto.':'CARRERA FINALIZADA · RESULTADO AMISTOSO');
  panel.append(status);
  const actions=document.createElement('div');actions.className='crl-score__actions';panel.append(actions);
  const makeButton=(label,fn,disabled=false)=>{
   const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;button.addEventListener('click',fn);actions.append(button);return button;
  };
  if(rivalFinish&&!rematchLaunching){
   if(rivalRematch&&!localRematch){
    makeButton('ACEPTAR REVANCHA',()=>void askRematch(true),rematchBusy);
    makeButton('RECHAZAR',()=>void declineRematch(),rematchBusy);
   }else makeButton(localRematch?'REVANCHA SOLICITADA':'PEDIR REVANCHA',()=>void askRematch(),localRematch||rematchBusy);
  }
  makeButton('VOLVER AL MENÚ',()=>scene.scene.start('menu'));
 };
 transport.onPacket=p=>{
  if(p.from!==rivalId)return;
  if(p.type==='hello'||p.type==='ready'){
   const incoming=parseLivePilot(p.payload);
   if(incoming){rivalPilot=incoming;room.rivalPilot=incoming;label.setText(pilotName(rivalPilot,'RIVAL')+' · LIVE');if(localFinish)showResults();}
  }
  if(p.type==='ready'&&p.payload?.phase==='grid'&&p.payload?.trackId===room.track_id&&p.payload?.physicsVersion===room.physics_version&&p.payload?.direction===room.direction&&p.payload?.laps===room.laps)otherReady=true;
  if(p.type==='start'&&p.payload?.restart===true&&p.from===room.host_id&&identity.id!==room.host_id&&ownReady&&otherReady&&Number.isFinite(p.payload.startAt))scene._crafRaceLiveStartAt=p.payload.startAt;
  if(p.type==='start'&&p.payload?.restart===false&&p.from===room.host_id&&localRematch&&rivalRematch&&localFinish&&rivalFinish)restartRace();
  if(p.type==='finish'&&p.payload?.laps===targetLaps){rivalFinish=p.payload;showResults();}
  if(p.type==='rematch'&&localFinish&&rivalFinish){
   if(p.payload?.request===true||p.payload?.accept===true){
    rivalRematch=true;rematchStatus=localRematch?'PREPARANDO REVANCHA…':pilotName(rivalPilot,'EL RIVAL')+' TE PROPONE UNA REVANCHA';
    showResults();void maybeStartRematch();
   }else if(p.payload?.accept===false){
    rivalRematch=false;localRematch=false;rematchStatus='EL RIVAL HA RECHAZADO LA REVANCHA';showResults();
   }
  }
  if(p.type==='position'&&!positionBroadcast?.ready)acceptPosition(p);
 };
 transport.onState=d=>{if(d.room_id!==roomId||d.host_id!==room.host_id)transport.stop();};
 transport.onError=e=>{if(!stopped)console.warn('[CrafRace LIVE DEV]',e.message);};
 const update=now=>{
  if(stopped)return;
  if(!positionBroadcast&&!connectingBroadcast&&now-broadcastLastAttempt>15000)void startBroadcast();
  // Five-second diagnostics only in LIVE races; no per-frame DOM updates.
  // Compare early and late laps on both devices before tuning renderer/physics.
  if(perfLastAt){const frameMs=Math.max(0,Math.min(1000,now-perfLastAt));perfFrames++;perfTotalMs+=frameMs;if(frameMs>33.4)perfSlowFrames++;}
  perfLastAt=now;
  if(!perfLastReport)perfLastReport=now;
  if(now-perfLastReport>=5000){
   if(scene._raceStarted&&perfFrames){
    console.info('[CrafRace LIVE perf]',{lap:Math.max(0,scene.lapCount||0),fps:Math.round(1000*perfFrames/Math.max(1,perfTotalMs)),slowFrames:perfSlowFrames,remotePackets:perfRemotePackets,remoteGapMs:Math.round(remotePacketGapMs),positionTransport:positionBroadcastStatus,iosStaticTrack:!!scene._iosStaticTrackRender});
   }
   perfFrames=0;perfSlowFrames=0;perfTotalMs=0;perfRemotePackets=0;perfLastReport=now;
  }
  // RaceScene starts in COUNTDOWN; no UI currently sets ReadyRequested=true.
  // Arm network readiness as soon as the countdown scene exists. iOS track
  // rendering can finish later; only the actual GO transition waits for it.
  // Otherwise the host can send positions forever without ever sending ready.
  if(scene._startState==='COUNTDOWN')scene._crafRaceLiveReadyRequested=true;
  // Both peers MUST announce readiness even after receiving the rival's packet.
  // Otherwise the first receiver stops transmitting and the other waits forever.
  // Repeat during handoff until the shared start timestamp is known.
  if(scene._crafRaceLiveReadyRequested&&!scene._crafRaceLiveStartAt&&!readySending&&now-lastReadySentAt>=2500){
   readySending=true;lastReadySentAt=now;
   void transport.send('ready',{...livePilotHandshake(room,ownPilot),phase:'grid'})
    .then(()=>{ownReady=true;}).catch(e=>console.warn('[CrafRace LIVE] ready:',e.message))
    .finally(()=>{readySending=false;});
  }
  if(ownReady&&otherReady&&!startSending&&identity.id===room.host_id&&transport.clockSamples>0){
   startSending=true;
   const startAt=Math.ceil((transport.serverNow()+6000)/1000)*1000;
   void transport.send('start',{countdownMs:6000,restart:true,startAt})
    .then(()=>{scene._crafRaceLiveStartAt=startAt;})
    .catch(e=>{startSending=false;console.warn('[CrafRace LIVE] start:',e.message);});
  }
  if(scene._raceStarted&&raceStartClock===null)raceStartClock=performance.now();
  if(raceStartClock!==null&&!localFinish){
   const completed=Math.max(0,Math.floor(Number(scene.lapCount)||0));
   if(completed>lastCompletedLap){
    // A single update may not legitimately account for multiple timed laps.
    if(completed===lastCompletedLap+1){
     const elapsed=Math.round(performance.now()-raceStartClock);
     const prior=lapTimes.reduce((a,b)=>a+b,0);
     const lapMs=elapsed-prior;
     if(lapMs>=500&&elapsed<=7200000)lapTimes.push(lapMs);
    }
    lastCompletedLap=completed;
   }
   if(completed>=targetLaps&&lapTimes.length===targetLaps&&!finishSending){
    finishSending=true;
    const elapsedMs=lapTimes.reduce((a,b)=>a+b,0);
    localFinish={elapsedMs,laps:targetLaps,lapTimes:[...lapTimes]};
    scene._raceStarted=false;
    scene.carBody?.body?.setVelocity?.(0,0);
    scene.carBody?.body?.setAngularVelocity?.(0);
    showResults();
    void transport.send('finish',localFinish).catch(e=>console.warn('[CrafRace LIVE] finish:',e.message));
   }
  }
  const position=interpolation.at(now);
  if(position){
   const dt=lastRenderedAt?Math.max(0,Math.min(100,now-lastRenderedAt)):16;
   lastRenderedAt=now;
   // Smooth irregular HTTP polling without making the rival translucent.
   // Smooth network jitter across frames without changing the authoritative car.
   // A longer visual time constant avoids visible steps on sparse HTTP updates.
   const blend=remote.visible?1-Math.exp(-dt/145):1;
   const x=remote.visible?remote.x+(position.x-remote.x)*blend:position.x;
   const y=remote.visible?remote.y+(position.y-remote.y)*blend:position.y;
   const targetAngle=position.angle+(scene._carVisualRotOffset||0);
   const angleDelta=Math.atan2(Math.sin(targetAngle-remote.rotation),Math.cos(targetAngle-remote.rotation));
   remote.setPosition(x,y).setRotation(remote.visible?remote.rotation+angleDelta*blend:targetAngle).setAlpha(1).setVisible(true);
   label.setPosition(x,y-45).setVisible(true);
  }
  // Publish the stationary grid position before the countdown ends, so both pilots are visible.
  // Continue sending at the existing cadence during the race; never move a local car remotely.
  // Stationary cars do not need the moving-car cadence; reduce persistent RPC writes
  // without delaying motion, countdown events, or reconnection packets.
  const velocity=scene.carBody?.body?.velocity;
  const moving=Boolean(velocity&&Math.hypot(velocity.x||0,velocity.y||0)>1);
  // An unchanged grid/parked car needs a heartbeat, not two database writes
  // per second. Preserve the 150 ms moving cadence on both platforms.
  const body=scene.carBody;
  const poseChanged=!lastPublishedPose||Math.hypot(body.x-lastPublishedPose.x,body.y-lastPublishedPose.y)>0.5||
   Math.abs(Math.atan2(Math.sin(body.rotation-lastPublishedPose.angle),Math.cos(body.rotation-lastPublishedPose.angle)))>0.02;
  const positionIntervalMs=scene._raceStarted&&moving?150:(poseChanged?500:2000);
  // Once this pilot finishes, its final position is no longer live gameplay.
  // Avoid ongoing authenticated writes while waiting for the other result.
  if(!localFinish&&!positionPending&&now-lastSent>=positionIntervalMs&&scene.carBody?.active){
   lastSent=now;
   const speed=Math.max(0,Math.hypot(body.body?.velocity?.x||0,body.body?.velocity?.y||0));
   if(Number.isFinite(body.x)&&Number.isFinite(body.y)&&Number.isFinite(body.rotation)&&Math.abs(body.x)<=100000&&Math.abs(body.y)<=100000){
    positionPending=true;
    const snapshot={x:body.x,y:body.y,angle:body.rotation};
    const payload={...snapshot,speed,lap:Math.max(0,scene.lapCount||0),tick:Math.max(0,scene.simTick||0),carId:ownCarId,skinId:ownSkinId};
    const send=positionBroadcast?.ready?positionBroadcast.send(payload):transport.send('position',payload);
    void send.then(ok=>{if(ok!==false)lastPublishedPose=snapshot;}).catch(()=>{}).finally(()=>{positionPending=false;});
   }
  }
 };
 const stop=()=>{if(stopped)return;stopped=true;if(!restarting)transport.stop();void positionBroadcast?.close();remote.destroy();label.destroy();results.remove();};
 scene.events.once('shutdown',stop);
 return {update,stop,get ownReady(){return ownReady;},get otherReady(){return otherReady;},get serverOffsetMs(){return transport.serverOffsetMs;}};
}
