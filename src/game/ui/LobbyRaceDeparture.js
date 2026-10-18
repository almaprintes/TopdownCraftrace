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
 * Rear tire contacts in the UNROTATED lobby platform's coordinates. The
 * platform and car share the same rotation, so these remain aligned on +90,
 * -90 and custom preview headings. Track direction is opposite car travel.
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
 const trailLength=Math.max(55,Math.min(85,Math.min(platformRect.width,platformRect.height)*.23));
 const treadWidth=Math.max(4,Math.min(7,Math.min(carRect.width,carRect.height)*.052));
 return [-1,1].map((side,i)=>({
  x:x-forward.x*axle+lateral.x*halfTread*side,
  y:y-forward.y*axle+lateral.y*halfTread*side,
  dx:-forward.x,dy:-forward.y,
  length:trailLength*(i===0?.90:1),width:treadWidth*(i===0?.88:1)
 }));
}
function lobbyFxRandom(seed){
 let n=seed>>>0;
 return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
}
/**
 * Procedural broken rubber, NOT solid lines. Tiny variable-width deposits,
 * feathered ends and very faint scuffs: painted ONCE to a small transparent
 * canvas, never redrawn during frames. Color/contrast matches worn metal.
 * Exported to permit deterministic non-DOM regression tests in CI.
 */
export function paintLobbyRubber(ctx,contacts){
 const random=lobbyFxRandom(0x713b9d);
 for(const [wheel,track] of contacts.entries()){
  for(let n=0;n<86;n++){
   const t=random();
   const dist=t*track.length;
   const strength=Math.sin(Math.PI*Math.pow(t,.68))*.8+.18;
   if(random()>.55+strength*.35)continue; // irregular broken deposition
   const jitter=(random()-.5)*track.width*.92+
     Math.sin(t*8+wheel*1.3)*track.width*.14;
   const x=track.x+track.dx*dist-track.dy*jitter;
   const y=track.y+track.dy*dist+track.dx*jitter;
   const stroke=1.5+random()*(4.2+strength*3);
   const width=track.width*(.12+random()*.26);
   ctx.beginPath();
   ctx.moveTo(x,y);
   ctx.quadraticCurveTo(
    x+track.dx*stroke*.5-track.dy*(random()-.5)*1.2,
    y+track.dy*stroke*.5+track.dx*(random()-.5)*1.2,
    x+track.dx*stroke,y+track.dy*stroke
   );
   const alpha=(.12+random()*.30)*strength;
   ctx.strokeStyle='rgba(8,12,16,'+alpha.toFixed(3)+')';
   ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
  }
  // Sparse silver-gray scuffs break up dark rubber without bright outlines.
  for(let n=0;n<13;n++){
   const t=random(),dist=t*track.length;
   const jitter=(random()-.5)*track.width*.75;
   const x=track.x+track.dx*dist-track.dy*jitter;
   const y=track.y+track.dy*dist+track.dx*jitter;
   ctx.beginPath();ctx.moveTo(x,y);
   ctx.lineTo(x+track.dx*(2+random()*4),y+track.dy*(2+random()*4));
   ctx.strokeStyle='rgba(157,164,167,'+(.055+random()*.075).toFixed(3)+')';
   ctx.lineWidth=.45+random()*.8;ctx.stroke();
  }
 }
}
/**
 * One connected smoke TRAIL, rendered as many overlapping translucent wisps
 * INSIDE ONE raster plume. This avoids discrete circles and elliptical pills.
 * The plume grows behind the axle and dissolves; no sprite/textures/RAF.
 */
export function paintLobbySmoke(ctx,width,height){
 const random=lobbyFxRandom(0x94ac1);
 for(let i=0;i<58;i++){
  const t=(i+random()*.8)/58;
  const cx=12+t*(width-33)+(random()-.5)*18;
  const spread=(12+t*height*.32);
  const cy=height*.5+Math.sin(t*6.5)*height*.048+(random()-.5)*spread;
  const radius=(14+t*height*.31)*(0.75+random()*.65);
  const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
  const ink=(.042+random()*.045)*(1-t*.35);
  grad.addColorStop(0,'rgba(225,231,236,'+ink.toFixed(3)+')');
  grad.addColorStop(.48,'rgba(190,204,212,'+(ink*.55).toFixed(3)+')');
  grad.addColorStop(1,'rgba(168,187,197,0)');
  ctx.fillStyle=grad;ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);
 }
}
// Make two lightweight, one-shot textures at device-friendly resolution.
// Canvas failure is cosmetic and must never prevent the race scene.
function makeLobbyDepartureCanvas(width,height,className){
 const canvas=document.createElement('canvas');
 const ratio=Math.max(1,Math.min(1.5,Number(globalThis.devicePixelRatio)||1));
 canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
 canvas.className=className;
 Object.assign(canvas.style,{
  position:'absolute',width:width+'px',height:height+'px',
  pointerEvents:'none',willChange:'opacity,transform'
 });
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return null;
 ctx.scale(ratio,ratio);
 return {canvas,ctx};
}
function playLobbyTireEffects(platformPart,carRect,platformRect,turnAngle,animations){
 const contacts=lobbyDepartureWheelTracks(carRect,platformRect,turnAngle);
 const rubber=makeLobbyDepartureCanvas(platformRect.width,platformRect.height,
  'tdr-lobby-tire-streaks');
 const smoke=makeLobbyDepartureCanvas(175,100,'tdr-lobby-tire-smoke');
 if(!rubber||!smoke)return;
 const angle=Math.atan2(contacts[0].dy,contacts[0].dx)*180/Math.PI;
 const x=(contacts[0].x+contacts[1].x)/2;
 const y=(contacts[0].y+contacts[1].y)/2;
 // Canvas starts at the platform's top-left, but the contact geometry
 // is centered on the stage pivot: translate once before painting.
 rubber.ctx.translate(platformRect.width/2,platformRect.height/2);
 paintLobbyRubber(rubber.ctx,contacts);
 paintLobbySmoke(smoke.ctx,175,100);
 Object.assign(smoke.canvas.style,{
  left:x+'px',top:(y-50)+'px',transformOrigin:'0 50%',
  transform:'rotate('+angle+'deg) scale(.78)',
  filter:'blur(3px)',opacity:'0'
 });
 // Platform painting remains behind the car; rubber stays visible over smoke.
 platformPart.appendChild(smoke.canvas);
 Object.assign(rubber.canvas.style,{
  left:(-platformRect.width/2)+'px',top:(-platformRect.height/2)+'px',
  filter:'blur(.45px)',opacity:'0'
 });
 platformPart.appendChild(rubber.canvas);
 const drift=18;
 // Neither effect is awaited: the approved 520ms getaway is the only clock.
 void animateAndWait(rubber.canvas,[
  {opacity:0,offset:0},
  {opacity:.64,offset:.24},
  {opacity:.82,offset:.58},
  {opacity:.48,offset:.83},
  {opacity:0,offset:1}
 ],{duration:LOBBY_DEPARTURE_TIMING.drive,easing:'linear'},
 LOBBY_DEPARTURE_TIMING.drive+100,animations);
 void animateAndWait(smoke.canvas,[
  {opacity:0,transform:'rotate('+angle+'deg) translate3d(0,0,0) scale(.72)',offset:0},
  {opacity:.66,transform:'rotate('+angle+'deg) translate3d(5px,0,0) scale(.98)',offset:.28},
  {opacity:.46,transform:'rotate('+angle+'deg) translate3d(12px,0,0) scale(1.18)',offset:.64},
  {opacity:0,transform:'rotate('+angle+'deg) translate3d('+drift+'px,0,0) scale(1.38)',offset:1}
 ],{duration:LOBBY_DEPARTURE_TIMING.drive,easing:'ease-out'},
 LOBBY_DEPARTURE_TIMING.drive+100,animations);
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
