// DEV 1.2.214 — Orient exit toward the true native front of each car.
// DEV browser + native Android race departure. Public web remains unchanged.
// Platform, car and roof mastery occupy the SAME
// DOM stacking levels as the original lobby objects. No viewport-high overlay.
// Rollback: localStorage.setItem('tdr2:devLobbyRaceDeparture','off').
import {Capacitor} from '@capacitor/core';
// The Android APK is built with __TDR_PROD_BUILD__=true, just like the
// garage elevator; enable this only in a real native Android WebView.
const nativeAndroidDeparture=()=>{
 try{return Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';}
 catch{return false;}
};
export const LOBBY_DEPARTURE_TIMING=Object.freeze({turn:1600,hold:180,drive:520});
export const LOBBY_DEPARTURE_DEPTH=Object.freeze({platform:0,car:1,mastery:4});
// Verified from real WebPs. These native preview images point DOWN.
export const LOBBY_DOWN_FACING_CARS=Object.freeze(['helix_comet','helix_pulse','helix_vortex']);
const downFacing=new Set(LOBBY_DOWN_FACING_CARS);
export function lobbyDepartureTurnForCar(carId,previewRotation=0){
 const deg=Number.parseFloat(String(previewRotation))||0;
 const heading=(downFacing.has(String(carId||''))?180:0)+deg;
 // Shortest signed turn to 90deg = screen-right.
 return ((90-heading+180)%360+360)%360-180;
}
export function lobbyDepartureLocalDrive(turnDegrees,distance){
 const theta=Number(turnDegrees)*Math.PI/180,d=Math.max(0,Number(distance)||0);
 const clean=n=>Math.abs(n)<1e-4?0:Math.round(n*1000)/1000;
 // CSS transform: translate executes before rotate.
 return {x:clean(d*Math.cos(theta)),y:clean(-d*Math.sin(theta))};
}
export function shouldUseLobbyDeparture({prod=false,storage=globalThis.localStorage,nativeAndroid=nativeAndroidDeparture()}={}){
 if(prod&&!nativeAndroid)return false;
 try{return storage?.getItem?.('tdr2:devLobbyRaceDeparture')!=='off';}catch{return true;}
}
function visibleImage(node){
 return !!(node?.isConnected&&node?.complete&&node?.naturalWidth&&node.getBoundingClientRect().width>0);
}
// Retain the painted size, selected skin geometry and rotation. The clone
// lives as a child of a layer anchored to the EXISTING stage center.
function placeClone(original,cx,cy){
 const r=original.getBoundingClientRect();
 const width=original.offsetWidth||r.width,height=original.offsetHeight||r.height;
 const img=original.cloneNode(false);
 img.removeAttribute('id');img.removeAttribute('data-lobby-car');
 img.removeAttribute('data-lobby-mastery');img.removeAttribute('class');
 img.setAttribute('aria-hidden','true');img.alt='';img.draggable=false;
 const computed=getComputedStyle(original);
 Object.assign(img.style,{
  position:'absolute',display:'block',
  left:(r.left+r.width/2-cx-width/2)+'px',
  top:(r.top+r.height/2-cy-height/2)+'px',
  width:width+'px',height:height+'px',maxWidth:'none',maxHeight:'none',
  transform:'none',transformOrigin:'center center',translate:'none',scale:'none',
  rotate:'none',objectFit:computed.objectFit||'contain',
  opacity:computed.opacity||'1',filter:computed.filter||'none',
  pointerEvents:'none',willChange:'transform'
 });
 const rotation=String(original.style.transform||'').match(/rotate\(([-.\d]+deg)\)/);
 if(rotation)img.style.rotate=rotation[1];
 else if(computed.rotate&&computed.rotate!=='none')img.style.rotate=computed.rotate;
 if(computed.scale&&computed.scale!=='none')img.style.scale=computed.scale;
 return img;
}
export function departureLayer(root,cx,cy,depth){
 const rr=root.getBoundingClientRect();
 const wrapper=document.createElement('div');
 wrapper.className='tdr-lobby-departure-part';
 Object.assign(wrapper.style,{
  position:'absolute',left:(cx-rr.left)+'px',top:(cy-rr.top)+'px',
  width:'0px',height:'0px',pointerEvents:'none',
  zIndex:String(depth),transformOrigin:'0 0',overflow:'visible',
  willChange:'transform'
 });
 root.appendChild(wrapper);
 return wrapper;
}
function animateAndWait(element,keyframes,options,timeoutMs,animations){
 return new Promise(resolve=>{
  if(!element?.animate){resolve();return;}
  let done=false,timer=0;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};
  try{
   const animation=element.animate(keyframes,{...options,fill:'forwards'});
   animations.push(animation);
   animation.finished.then(finish,finish);
   timer=setTimeout(finish,timeoutMs);
  }catch{clearTimeout(timer);resolve();}
 });
}

/**
 * Rear wheel contact points in the platform's unrotated DOM coordinates.
 * The established platform and car wrappers rotate together, so these traces
 * stay fixed on the platform while the car departs screen-right.
 */
export function lobbyDepartureWheelTracks(carRect,platformRect,turnAngle){
 const vector=lobbyDepartureLocalDrive(turnAngle,1);
 const magnitude=Math.hypot(vector.x,vector.y)||1;
 const forward={x:vector.x/magnitude,y:vector.y/magnitude};
 const lateral={x:-forward.y,y:forward.x};
 const x=carRect.left+carRect.width/2-platformRect.left-platformRect.width/2;
 const y=carRect.top+carRect.height/2-platformRect.top-platformRect.height/2;
 const axle=Math.max(carRect.width,carRect.height)*.285;
 const halfTread=Math.min(carRect.width,carRect.height)*.255;
 const trailLength=Math.min(platformRect.width*.33,platformRect.height*.34,110);
 const treadWidth=Math.max(2,Math.min(4,Math.min(carRect.width,carRect.height)*.028));
 return [-1,1].map(side=>({
  x:x-forward.x*axle+lateral.x*halfTread*side,
  y:y-forward.y*axle+lateral.y*halfTread*side,
  dx:forward.x,dy:forward.y,length:trailLength,width:treadWidth
 }));
}
// Finite, non-interactive DOM effects. No RAF, canvas or new assets.
// Both tracks and smoke fade inside the existing 520ms departure.
function playLobbyTireEffects(platformPart,carRect,platformRect,turnAngle,animations){
 const contacts=lobbyDepartureWheelTracks(carRect,platformRect,turnAngle);
 for(const contact of contacts){
  const streak=document.createElement('div');
  streak.className='tdr-lobby-tire-streak';
  const angle=Math.atan2(contact.dy,contact.dx)*180/Math.PI;
  Object.assign(streak.style,{
   position:'absolute',left:contact.x+'px',top:contact.y+'px',
   width:contact.length+'px',height:contact.width+'px',
   transformOrigin:'0 50%',transform:'rotate('+angle+'deg) scaleX(.02)',
   background:'linear-gradient(90deg,rgba(8,13,19,.84),rgba(8,13,19,.6) 70%,rgba(8,13,19,0))',
   borderRadius:'5px',opacity:'0',pointerEvents:'none',willChange:'transform,opacity'
  });
  platformPart.appendChild(streak);
  void animateAndWait(streak,[
   {transform:'rotate('+angle+'deg) scaleX(.02)',opacity:0},
   {transform:'rotate('+angle+'deg) scaleX(.72)',opacity:.61,offset:.58},
   {transform:'rotate('+angle+'deg) scaleX(1)',opacity:0}
  ],{duration:LOBBY_DEPARTURE_TIMING.drive,easing:'ease-out'},
  LOBBY_DEPARTURE_TIMING.drive+100,animations);
  // Three small, staggered smoke puffs behind each rear wheel.
  // These live on the platform, not in the moving car wrapper.
  for(let i=0;i<3;i++){
   const smoke=document.createElement('div');
   smoke.className='tdr-lobby-tire-smoke';
   const radius=Math.max(12,Math.min(23,Math.min(carRect.width,carRect.height)*.18));
   const offset=i*contact.length*.17;
   const sx=contact.x+contact.dx*offset-radius/2;
   const sy=contact.y+contact.dy*offset-radius/2;
   Object.assign(smoke.style,{
    position:'absolute',left:sx+'px',top:sy+'px',
    width:radius+'px',height:radius+'px',
    background:'radial-gradient(circle at 40% 45%,rgba(238,246,250,.86),rgba(168,188,198,.47) 44%,rgba(126,151,162,0) 74%)',
    borderRadius:'50%',opacity:'0',pointerEvents:'none',
    transform:'translate3d(0,0,0) scale(.5)',willChange:'transform,opacity'
   });
   platformPart.appendChild(smoke);
   const delay=i*55;
   const driftX=-contact.dx*(14+i*5)+(i-1)*contact.dy*6;
   const driftY=-contact.dy*(14+i*5)-(i-1)*contact.dx*6;
   void animateAndWait(smoke,[
    {opacity:0,transform:'translate3d(0,0,0) scale(.5)'},
    {opacity:.69,transform:'translate3d('+(driftX*.4)+'px,'+(driftY*.4)+'px,0) scale(1.3)',offset:.32},
    {opacity:0,transform:'translate3d('+driftX+'px,'+driftY+'px,0) scale(2.25)'}
   ],{duration:LOBBY_DEPARTURE_TIMING.drive-delay,delay,easing:'ease-out'},
   LOBBY_DEPARTURE_TIMING.drive+100,animations);
  }
 }
}

export function runLobbyRaceDeparture(scene,onFinished,{prod=false,nativeAndroid=nativeAndroidDeparture()}={}){
 const launch=typeof onFinished==='function'?onFinished:()=>{};
 const root=scene?._lobbyDomRoot;
 const platform=root?.querySelector('.tdr-lobby-car-platform');
 const car=root?.querySelector('[data-lobby-car]');
 if(!shouldUseLobbyDeparture({prod,nativeAndroid})||!visibleImage(platform)||!visibleImage(car)||
    typeof document==='undefined'||typeof platform.animate!=='function'||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
  launch();return false;
 }
 const pr=platform.getBoundingClientRect(),cx=pr.left+pr.width/2,cy=pr.top+pr.height/2;
 const turnAngle=lobbyDepartureTurnForCar(scene?.selectedCarId,
   car.style.rotate||getComputedStyle(car).rotate||'0');
 const badge=root.querySelector('[data-lobby-mastery]');
 const originals=[platform,car];
 if(visibleImage(badge)&&!badge.hidden)originals.push(badge);
 const stages=[],animations=[];
 const cleanup=()=>{
  for(const animation of animations){try{animation.cancel();}catch{}}
  for(const part of stages)part.remove();
 };
 try{
  // Each part gets its OWN wrapper within the lobby root, at its native z-index.
  // z0 stage < z1 car < z2 wing panels / z3 buttons; the mastery retains z4.
  const platformPart=departureLayer(root,cx,cy,LOBBY_DEPARTURE_DEPTH.platform);
  stages.push(platformPart);platformPart.appendChild(placeClone(platform,cx,cy));
  const carPart=departureLayer(root,cx,cy,LOBBY_DEPARTURE_DEPTH.car);
  stages.push(carPart);carPart.appendChild(placeClone(car,cx,cy));
  let masteryPart=null;
  if(originals.includes(badge)){
   masteryPart=departureLayer(root,cx,cy,LOBBY_DEPARTURE_DEPTH.mastery);
   stages.push(masteryPart);masteryPart.appendChild(placeClone(badge,cx,cy));
  }
  const previous=originals.map(node=>node.style.visibility);
  originals.forEach(node=>{node.style.visibility='hidden';});
  root.classList.add('tdr-lobby-departing');
  let disposed=false,launched=false,warmTimer=0,warmPromise=null,starting=false;
  const stop=()=>{
   if(disposed)return;
   disposed=true;
   if(warmTimer)clearTimeout(warmTimer);
   cleanup();
   originals.forEach((node,i)=>{if(node.isConnected)node.style.visibility=previous[i];});
   root.classList.remove('tdr-lobby-departing');
   scene?.events?.off?.('shutdown',stop);
   scene?.events?.off?.('destroy',stop);
   if(!launched)scene._raceDeparturePending=false;
  };
  // A slow/mobile connection can postpone the lazy race module for seconds.
  // Keep the ORIGINAL car hidden while its exit clones remain off-screen.
  // Only release the lobby when the destination scene is actually installed.
  const prepareRace=()=>{
   if(warmPromise)return warmPromise;
   warmPromise=(async()=>{
    const prewarm=globalThis.__tdrWarmRaceScene;
    if(typeof prewarm!=='function')return true;
    try{return (await prewarm())===true;}
    catch(error){console.warn('[lobby-departure] race prewarm failed',error);return false;}
   })();
   return warmPromise;
  };
  const next=async()=>{
   if(launched||disposed||starting)return;
   starting=true;
   const raceReady=await prepareRace();
   if(disposed||launched)return;
   if(!raceReady||scene?.sys?.isActive?.()===false){
    console.warn('[lobby-departure] race module unavailable; restore lobby for retry');
    stop();return;
   }
   launched=true;
   try{
    // DO NOT call stop() before scene.start(): that used to redraw the car
    // in the middle of the lobby while the race chunk loaded over 3G.
    // scene.start('race') synchronously shuts down this menu and calls stop.
    launch();
   }catch(error){
    console.warn('[lobby-departure] race launch failed',error);
    launched=false;
    stop();
   }
  };
  scene?.events?.once?.('shutdown',stop);
  scene?.events?.once?.('destroy',stop);
  // Kick off lazy imports while the exit is playing; await them AFTER the car
  // leaves the screen instead of exposing the originals during network waits.
  warmTimer=setTimeout(()=>{if(!disposed)void prepareRace();},180);
  (async()=>{
   try{
    // The complete turntable pivots toward the nose of the selected car.
    // Native down-facing previews take -90deg rather than backing out.
    await Promise.all(stages.map(part=>animateAndWait(part,
     [{transform:'rotate(0deg)'},{transform:'rotate('+turnAngle+'deg)'}],
     {duration:LOBBY_DEPARTURE_TIMING.turn,easing:'cubic-bezier(.35,.02,.18,1)'},
     LOBBY_DEPARTURE_TIMING.turn+250,animations)));
    if(disposed)return;
    await animateAndWait(platformPart.firstElementChild,
     [{filter:'brightness(1)'},{filter:'brightness(1.25) drop-shadow(0 0 14px rgba(94,214,255,.48))'},
      {filter:'brightness(1)'}],
     {duration:LOBBY_DEPARTURE_TIMING.hold,easing:'ease-in-out'},
     LOBBY_DEPARTURE_TIMING.hold+150,animations);
    if(disposed)return;
    // Move RIGHT in viewport coordinates independently of turn direction.
    // Keep the original getaway duration/easing and 1.1 end scale.
    const distance=window.innerWidth+pr.width;
    const movement=lobbyDepartureLocalDrive(turnAngle,distance);
    const departures=[carPart,...(masteryPart?[masteryPart]:[])];
    // Temporary burn marks and smoke remain on the platform as the car leaves.
    // Optional visuals must never postpone a race or change the drive duration.
    try{playLobbyTireEffects(platformPart,car.getBoundingClientRect(),pr,turnAngle,animations);}
    catch(error){console.warn('[lobby-departure] tire effects skipped',error);}
    await Promise.all(departures.map(part=>animateAndWait(part,
     [{transform:'rotate('+turnAngle+'deg) translate3d(0,0,0) scale(1)',opacity:1},
      {transform:'rotate('+turnAngle+'deg) translate3d('+movement.x+'px,'+movement.y+'px,0) scale(1.1)',opacity:1}],
     {duration:LOBBY_DEPARTURE_TIMING.drive,easing:'cubic-bezier(.6,.05,.94,.45)'},
     LOBBY_DEPARTURE_TIMING.drive+250,animations)));
   }catch(err){console.warn('[lobby-departure] skipped:',err);}
   next();
  })();
  return true;
 }catch(err){
  cleanup();
  console.warn('[lobby-departure] fallback:',err);
  launch();return false;
 }
}
