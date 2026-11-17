// DEV-only live visual bridge. Remote pilot never participates in local collisions.
import {RemotePilotInterpolator} from './craftraceLiveRaceModel.js';
import {takeLiveSession} from './craftraceLiveSession.js';
import {CAR_SPECS} from '../cars/carSpecs.js';
import {getEquippedCarSkin,availableCarSkins} from '../skins/carSkins.js';
const validRoom=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
export function attachCrafRaceLivePilot(scene,roomId){
 if(!validRoom(roomId)||!scene?.carBody||!scene?.add)return null;
 const interpolation=new RemotePilotInterpolator({delayMs:400,maxExtrapolateMs:250});
 const localSprite=scene.carRig?.list?.find?.(item=>item?.texture?.key);
 if(!localSprite)return null;
 const remoteSprite=scene.add.sprite(0,0,'car').setAlpha(1);
 remoteSprite.setOrigin(localSprite.originX,localSprite.originY).setScale(localSprite.scaleX,localSprite.scaleY);
 const remote=scene.add.container(scene.carBody.x,scene.carBody.y,[remoteSprite]).setDepth(29).setVisible(false);
 const label=scene.add.text(0,-45,'RIVAL · LIVE',{fontFamily:'system-ui',fontSize:'14px',color:'#ffffff',backgroundColor:'#16283c',padding:{x:5,y:3}}).setOrigin(0.5).setDepth(31).setVisible(false);
 let lastSent=0,stopped=false,positionPending=false,remoteAppearance=null;
 let lastRemotePacketAt=0,remotePacketGapMs=350,lastRenderedAt=0;
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
 transport.onPacket=p=>{
  if(p.from!==rivalId)return;
  if(p.type==='ready'&&p.payload?.phase==='grid'&&p.payload?.trackId===room.track_id&&p.payload?.physicsVersion===room.physics_version&&p.payload?.direction===room.direction&&p.payload?.laps===room.laps)otherReady=true;
  if(p.type==='start'&&p.payload?.restart===true&&p.from===room.host_id&&identity.id!==room.host_id&&ownReady&&otherReady&&Number.isFinite(p.payload.startAt))scene._crafRaceLiveStartAt=p.payload.startAt;
  if(p.type==='position'){
   if(typeof p.payload?.carId==='string'&&typeof p.payload?.skinId==='string')loadAppearance(p.payload.carId,p.payload.skinId);
   const receivedAt=performance.now();
   const accepted=interpolation.push({...p.payload,heat:p.heat,generation:p.generation},receivedAt);
   if(accepted){
    if(lastRemotePacketAt>0){
     const gap=receivedAt-lastRemotePacketAt;
     if(gap>=100&&gap<=1500)remotePacketGapMs=remotePacketGapMs*0.8+gap*0.2;
    }
    lastRemotePacketAt=receivedAt;
    interpolation.delayMs=Math.max(300,Math.min(500,remotePacketGapMs+70));
   }
  }
 };
 transport.onState=d=>{if(d.room_id!==roomId||d.host_id!==room.host_id)transport.stop();};
 transport.onError=e=>{if(!stopped)console.warn('[CrafRace LIVE DEV]',e.message);};
 const update=now=>{
  if(stopped)return;
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
   void transport.send('ready',{phase:'grid',trackId:room.track_id,physicsVersion:room.physics_version,direction:room.direction,laps:room.laps})
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
  const position=interpolation.at(now);
  if(position){
   const dt=lastRenderedAt?Math.max(0,Math.min(100,now-lastRenderedAt)):16;
   lastRenderedAt=now;
   // Smooth irregular HTTP polling without making the rival translucent.
   const blend=remote.visible?1-Math.exp(-dt/75):1;
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
  const positionIntervalMs=scene._raceStarted&&moving?150:500;
  if(!positionPending&&now-lastSent>=positionIntervalMs&&scene.carBody?.active){
   lastSent=now;
   const body=scene.carBody;
   const speed=Math.max(0,Math.hypot(body.body?.velocity?.x||0,body.body?.velocity?.y||0));
   if(Number.isFinite(body.x)&&Number.isFinite(body.y)&&Number.isFinite(body.rotation)&&Math.abs(body.x)<=100000&&Math.abs(body.y)<=100000){
    positionPending=true;
    void transport.send('position',{x:body.x,y:body.y,angle:body.rotation,speed,lap:Math.max(0,scene.lapCount||0),tick:Math.max(0,scene.simTick||0),carId:ownCarId,skinId:ownSkinId}).catch(()=>{}).finally(()=>{positionPending=false;});
   }
  }
 };
 const stop=()=>{if(stopped)return;stopped=true;transport.stop();remote.destroy();label.destroy();};
 scene.events.once('shutdown',stop);
 return {update,stop,get ownReady(){return ownReady;},get otherReady(){return otherReady;},get serverOffsetMs(){return transport.serverOffsetMs;}};
}
