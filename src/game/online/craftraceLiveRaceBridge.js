// DEV-only live visual bridge. Remote pilot never participates in local collisions.
import {RemotePilotInterpolator} from './craftraceLiveRaceModel.js';
import {takeLiveSession} from './craftraceLiveSession.js';
const validRoom=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
export function attachCrafRaceLivePilot(scene,roomId){
 if(!validRoom(roomId)||!scene?.carBody||!scene?.add)return null;
 const interpolation=new RemotePilotInterpolator({delayMs:220,maxExtrapolateMs:120});
 const remoteSprite=scene.add.sprite(0,0,'car').setAlpha(0.68);
 const remote=scene.add.container(scene.carBody.x,scene.carBody.y,[remoteSprite]).setDepth(29).setVisible(false);
 const label=scene.add.text(0,-45,'RIVAL · LIVE',{fontFamily:'system-ui',fontSize:'14px',color:'#ffffff',backgroundColor:'#16283c',padding:{x:5,y:3}}).setOrigin(0.5).setDepth(31).setVisible(false);
 let lastSent=0,stopped=false;
 const session=takeLiveSession(roomId);
 if(!session){remote.destroy();label.destroy();return null;}
 const {transport,room,identity}=session;
 const rivalId=identity.id===room.host_id?room.guest_id:room.host_id;
 transport.onPacket=p=>{
  if(p.from!==rivalId)return;
  if(p.type==='position')interpolation.push({...p.payload,heat:p.heat,generation:p.generation},performance.now());
 };
 transport.onState=d=>{if(d.room_id!==roomId||d.host_id!==room.host_id)transport.stop();};
 transport.onError=e=>{if(!stopped)console.warn('[CrafRace LIVE DEV]',e.message);};
 const update=now=>{
  if(stopped)return;
  const position=interpolation.at(now);
  if(position){remote.setPosition(position.x,position.y).setRotation(position.angle+Math.PI/2).setAlpha(position.stale?0.25:0.68).setVisible(true);
   label.setPosition(position.x,position.y-45).setVisible(true);}
  if(scene._raceStarted&&now-lastSent>=150&&scene.carBody?.active){
   lastSent=now;
   const body=scene.carBody;
   const speed=Math.max(0,Math.hypot(body.body?.velocity?.x||0,body.body?.velocity?.y||0));
   if(Number.isFinite(body.x)&&Number.isFinite(body.y)&&Number.isFinite(body.rotation)&&Math.abs(body.x)<=100000&&Math.abs(body.y)<=100000){
    void transport.send('position',{x:body.x,y:body.y,angle:body.rotation,speed,lap:Math.max(0,scene.lapCount||0),tick:Math.max(0,scene.simTick||0)}).catch(()=>{});
   }
  }
 };
 const stop=()=>{if(stopped)return;stopped=true;transport.stop();remote.destroy();label.destroy();};
 scene.events.once('shutdown',stop);
 return {update,stop,get serverOffsetMs(){return transport.serverOffsetMs;}};
}
