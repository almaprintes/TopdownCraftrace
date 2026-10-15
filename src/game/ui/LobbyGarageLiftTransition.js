// DEV 1.2.210 — Slow Gaussian-profile radial fade, without a sharp iris edge.
// These DOM clones stay at their ORIGINAL lobby z-index: stage 0, car 1,
// roof mastery 4. No fullscreen overlay or extra Phaser renderer work.
// Race departure (LobbyRaceDeparture.js) is entirely separate and untouched.
const IS_PROD_BUILD = typeof __TDR_PROD_BUILD__ === 'boolean' ? __TDR_PROD_BUILD__ : false;

export const GARAGE_LIFT_TIMING=Object.freeze({down:1850,up:1900});
export const GARAGE_LIFT_DEPTH=Object.freeze({platform:0,car:1,mastery:4});
export const GARAGE_LIFT_RETURN_KEY='tdr2:garageLiftReturn:v1';
export const GARAGE_LIFT_SWITCH='tdr2:devGarageLift';
export function garageLiftEnabled({prod=IS_PROD_BUILD,storage=globalThis.localStorage}={}){
 if(prod)return false;
 try{return storage?.getItem?.(GARAGE_LIFT_SWITCH)!=='off';}catch{return true;}
}
export function markGarageLiftReturn({prod=IS_PROD_BUILD,storage=globalThis.sessionStorage}={}){
 if(!garageLiftEnabled({prod}))return false;
 try{storage?.setItem?.(GARAGE_LIFT_RETURN_KEY,'rise');return true;}catch{return false;}
}
export function consumeGarageLiftReturn({prod=IS_PROD_BUILD,storage=globalThis.sessionStorage}={}){
 let flag=null;
 try{flag=storage?.getItem?.(GARAGE_LIFT_RETURN_KEY);storage?.removeItem?.(GARAGE_LIFT_RETURN_KEY);}catch{}
 return flag==='rise'&&garageLiftEnabled({prod});
}
const ready=image=>!!(image?.isConnected&&image?.complete&&image?.naturalWidth&&image.getBoundingClientRect()?.width>0);
// Each moving layer lives behind a stationary, true circular aperture.
// Animate the aperture's clip-path separately: the floor conceals the OUTER
// edge first, while the center of the vehicle remains genuinely visible.
function anchoredPart(root,cx,cy,zIndex,footprint){
 const rr=root.getBoundingClientRect();
 const mask=document.createElement('div');
 mask.className='tdr-lobby-garage-aperture';
 Object.assign(mask.style,{
  position:'absolute',
  left:(footprint.left-rr.left)+'px',top:(footprint.top-rr.top)+'px',
  width:footprint.width+'px',height:footprint.height+'px',
  zIndex:String(zIndex),pointerEvents:'none',
  clipPath:'ellipse(51% 51% at 50% 50%)',willChange:'-webkit-mask-image,mask-image',
  '--tdr-garage-soft-radius':'145%'
 });
 const node=document.createElement('div');
 node.className='tdr-lobby-garage-lift-part';
 Object.assign(node.style,{
  position:'absolute',left:(cx-footprint.left)+'px',top:(cy-footprint.top)+'px',
  width:'0',height:'0',overflow:'visible',pointerEvents:'none',
  transformOrigin:'0 0',willChange:'transform,filter'
 });
 mask.appendChild(node);
 root.appendChild(mask);
 return {node,mask};
}
function copyAtPivot(original,cx,cy){
 const rect=original.getBoundingClientRect();
 const width=original.offsetWidth||rect.width,height=original.offsetHeight||rect.height;
 const node=original.cloneNode(false);
 node.removeAttribute('id');node.removeAttribute('class');node.removeAttribute('data-lobby-car');
 node.removeAttribute('data-lobby-mastery');
 node.alt='';node.draggable=false;node.setAttribute('aria-hidden','true');
 const computed=getComputedStyle(original);
 Object.assign(node.style,{
  position:'absolute',display:'block',left:(rect.left+rect.width/2-cx-width/2)+'px',
  top:(rect.top+rect.height/2-cy-height/2)+'px',
  width:width+'px',height:height+'px',
  transform:'none',translate:'none',scale:'none',rotate:'none',
  maxWidth:'none',maxHeight:'none',objectFit:computed.objectFit||'contain',
  filter:computed.filter||'none',visibility:'visible',opacity:computed.opacity||'1',pointerEvents:'none',userSelect:'none'});
 const rot=String(original.style.transform||'').match(/rotate\(([-.\d]+deg)\)/);
 if(rot)node.style.rotate=rot[1];
 else if(computed.rotate&&computed.rotate!=='none')node.style.rotate=computed.rotate;
 if(computed.scale&&computed.scale!=='none')node.style.scale=computed.scale;
 return node;
}
// Measure the visible alpha silhouette rather than the image element's CSS box.
// The turntable WebP has transparent margins; image box dimensions were causing
// a separate offset oval in the screenshot. 128px sampling is one-time per image.
const PLATFORM_ALPHA_SAMPLE=128;
const PLATFORM_FOOTPRINT_FALLBACK=Object.freeze({width:.81,height:.68});
const platformBoundsCache=new WeakMap();
function platformArtworkBounds(platform){
 if(platformBoundsCache.has(platform))return platformBoundsCache.get(platform);
 let bounds=null;
 try{
  const canvas=document.createElement('canvas');
  canvas.width=PLATFORM_ALPHA_SAMPLE;canvas.height=PLATFORM_ALPHA_SAMPLE;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(ctx){
   ctx.drawImage(platform,0,0,PLATFORM_ALPHA_SAMPLE,PLATFORM_ALPHA_SAMPLE);
   const data=ctx.getImageData(0,0,PLATFORM_ALPHA_SAMPLE,PLATFORM_ALPHA_SAMPLE).data;
   let left=PLATFORM_ALPHA_SAMPLE,top=PLATFORM_ALPHA_SAMPLE,right=-1,bottom=-1;
   for(let y=0;y<PLATFORM_ALPHA_SAMPLE;y++)for(let x=0;x<PLATFORM_ALPHA_SAMPLE;x++){
    if(data[(y*PLATFORM_ALPHA_SAMPLE+x)*4+3]<56)continue;
    if(x<left)left=x;if(x>right)right=x;
    if(y<top)top=y;if(y>bottom)bottom=y;
   }
   const w=right-left+1,h=bottom-top+1;
   if(w>10&&h>10&&w<PLATFORM_ALPHA_SAMPLE*.95&&h<PLATFORM_ALPHA_SAMPLE*.95)
    bounds={left:left/PLATFORM_ALPHA_SAMPLE,top:top/PLATFORM_ALPHA_SAMPLE,
      width:w/PLATFORM_ALPHA_SAMPLE,height:h/PLATFORM_ALPHA_SAMPLE};
  }
 }catch{/* Sampling is optional; preserve original garage navigation. */}
 platformBoundsCache.set(platform,bounds);
 return bounds;
}
export function garageLiftFootprint(rect,sourceWidth,sourceHeight,alphaBounds=null){
 const w=Math.max(1,Number(rect?.width)||1),h=Math.max(1,Number(rect?.height)||1);
 const x=Number(rect?.left)||0,y=Number(rect?.top)||0;
 const iw=Math.max(1,Number(sourceWidth)||w),ih=Math.max(1,Number(sourceHeight)||h);
 const scale=Math.min(w/iw,h/ih),imageW=iw*scale,imageH=ih*scale;
 const ox=x+(w-imageW)/2,oy=y+(h-imageH)/2;
 if(alphaBounds)return {left:ox+alphaBounds.left*imageW,
  top:oy+alphaBounds.top*imageH,width:Math.max(1,alphaBounds.width*imageW),
  height:Math.max(1,alphaBounds.height*imageH)};
 return {left:x+(w-w*PLATFORM_FOOTPRINT_FALLBACK.width)/2,
  top:y+(h-h*PLATFORM_FOOTPRINT_FALLBACK.height)/2,
  width:w*PLATFORM_FOOTPRINT_FALLBACK.width,
  height:h*PLATFORM_FOOTPRINT_FALLBACK.height};
}
function createFloorWell(root,footprint){
 const rr=root.getBoundingClientRect();
 const box={
  position:'absolute',
  left:(footprint.left+footprint.width/2-rr.left)+'px',
  top:(footprint.top+footprint.height/2-rr.top)+'px',
  width:(footprint.width*.99)+'px',height:(footprint.height*.99)+'px',
  transform:'translate(-50%,-50%)',borderRadius:'50%',
  pointerEvents:'none',opacity:'0',willChange:'opacity'
 };
 const well=document.createElement('div');well.className='tdr-lobby-garage-well';
 Object.assign(well.style,box,{zIndex:'0'});
 const rim=document.createElement('div');rim.className='tdr-lobby-garage-rim';
 Object.assign(rim.style,box,{zIndex:'2'});
 root.appendChild(well);root.appendChild(rim);
 return {well,rim};
}
// No fake uniform-opacity fade. Masking moves inward from the fixed floor
// ring, while the car and deck darken in the shaft and remain opaque.
const LEVEL={transform:'translate3d(0,0,0) scale(1)',opacity:1,filter:'brightness(1) saturate(1)'};
const FALL={transform:'translate3d(0,0,0) scale(.96)',opacity:1,filter:'brightness(.37) saturate(.62)'};
const CAR_FALL={transform:'translate3d(0,0,0) scale(.96)',opacity:1,filter:'brightness(.34) saturate(.62)'};
const MASTERY_FALL={transform:'translate3d(0,0,0) scale(.96)',opacity:1,filter:'brightness(.32)'};
const descendingFrames={
 platform:[{...LEVEL,offset:0},
  {transform:'translate3d(0,0,0) scale(1)',opacity:1,filter:'brightness(.92) saturate(.96)',offset:.27},
  {transform:'translate3d(0,0,0) scale(.98)',opacity:1,filter:'brightness(.63) saturate(.82)',offset:.68},
  {...FALL,offset:1}],
 car:[{...LEVEL,offset:0},
  {transform:'translate3d(0,0,0) scale(1)',opacity:1,filter:'brightness(.91) saturate(.96)',offset:.27},
  {transform:'translate3d(0,0,0) scale(.98)',opacity:1,filter:'brightness(.65) saturate(.8)',offset:.68},
  {...CAR_FALL,offset:1}],
 mastery:[{...LEVEL,offset:0},
  {transform:'translate3d(0,0,0) scale(.98)',opacity:1,filter:'brightness(.69)',offset:.55},
  {...MASTERY_FALL,offset:1}]
};
const liftFrames=(frames,goingDown)=>goingDown?frames:frames.map(f=>({...f,offset:1-f.offset})).reverse();
// The mask stays exactly on the platform outline. Its alpha follows a
// wide Gaussian CDF profile (CSS mask-image, not blur() on the car art).
// We vary only the radius so every visible region dissolves smoothly.
export function garageLiftSoftRadius(progress,goingDown){
 const t=Math.min(1,Math.max(0,Number(progress)||0));
 const eased=t*t*(3-2*t);
 return goingDown?145-190*eased:-45+190*eased;
}
export function garageLiftApertureFrames(goingDown){
 // Keep this small pure timeline for regression tests and reverse symmetry.
 return [0,.2,.5,.8,1].map(offset=>({
  offset, radius:garageLiftSoftRadius(offset,goingDown)
 }));
}
function animateSoftApertures(masks,duration,goingDown,animations){
 const layers=masks.filter(Boolean);
 let raf=0,timer=0,finished=false,resolveDone=()=>{};
 const complete=new Promise(resolve=>{resolveDone=resolve;});
 const radiusAt=progress=>garageLiftSoftRadius(progress,goingDown).toFixed(2)+'%';
 const setRadius=progress=>{
  const value=radiusAt(progress);
  for(const mask of layers)mask.style.setProperty('--tdr-garage-soft-radius',value);
 };
 const finish=()=>{
  if(finished)return;
  finished=true;
  if(raf)cancelAnimationFrame(raf);
  if(timer)clearTimeout(timer);
  setRadius(1);
  resolveDone();
 };
 const cancel=()=>{
  if(finished)return;
  finished=true;
  if(raf)cancelAnimationFrame(raf);
  if(timer)clearTimeout(timer);
  resolveDone();
 };
 animations.push({cancel});
 setRadius(0);
 if(typeof requestAnimationFrame!=='function'){finish();return complete;}
 let started=null;
 const tick=time=>{
  if(finished)return;
  if(started===null)started=time;
  const p=Math.min(1,Math.max(0,(time-started)/duration));
  setRadius(p);
  if(p<1)raf=requestAnimationFrame(tick);
  else finish();
 };
 raf=requestAnimationFrame(tick);
 // The browser can suspend rAF in background tabs: never strand navigation.
 timer=setTimeout(finish,duration+220);
 return complete;
}
function animateWait(node,frames,duration,easing,animations){
 if(typeof node?.animate!=='function')return Promise.resolve();
 try{
  const anim=node.animate(frames,{duration,easing,fill:'forwards'});
  animations.push(anim);
  return Promise.race([
   anim.finished.catch(()=>{}),
   new Promise(resolve=>setTimeout(resolve,duration+180))
  ]);
 }catch{return Promise.resolve();}
}
function startLift(scene,root,direction,onComplete){
 const platform=root?.querySelector('.tdr-lobby-car-platform');
 const car=root?.querySelector('[data-lobby-car]');
 if(!ready(platform)||!ready(car)||scene?._garageLiftBusy)return false;
 const pr=platform.getBoundingClientRect(),cx=pr.left+pr.width/2,cy=pr.top+pr.height/2;
 const badge=root.querySelector('[data-lobby-mastery]');
 const originals=[platform,car];
 if(ready(badge)&&!badge.hidden)originals.push(badge);
 const wrappers=[],animations=[];
 let platformPart=null,carPart=null,masteryPart=null;
 let platformLayer=null,carLayer=null,masteryLayer=null;
 const visibility=originals.map(node=>node.style.visibility);
 let well=null,rim=null,ended=false,recoveryTimer=0;
 const cleanup=()=>{
  if(ended)return;
  ended=true;
  if(recoveryTimer)clearTimeout(recoveryTimer);
  for(const anim of animations){try{anim.cancel();}catch{}}
  for(const mask of wrappers)mask.remove();
  well?.remove();
  rim?.remove();
  originals.forEach((node,i)=>{if(node.isConnected)node.style.visibility=visibility[i];});
  root.classList.remove('tdr-lobby-garage-lifting');
  scene._garageLiftBusy=false;
  scene?.events?.off?.('shutdown',cleanup);
  scene?.events?.off?.('destroy',cleanup);
 };
 try{
  scene._garageLiftBusy=true;
  const footprint=garageLiftFootprint(pr,platform.naturalWidth,platform.naturalHeight,platformArtworkBounds(platform));
  ({well,rim}=createFloorWell(root,footprint));
  // After a full garage swap, the previous car asset is never cloned.
  platformLayer=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.platform,footprint);
  platformPart=platformLayer.node;
  wrappers.push(platformLayer.mask);platformPart.appendChild(copyAtPivot(platform,cx,cy));
  carLayer=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.car,footprint);
  carPart=carLayer.node;
  wrappers.push(carLayer.mask);carPart.appendChild(copyAtPivot(car,cx,cy));
  if(originals.includes(badge)){
   masteryLayer=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.mastery,footprint);
   masteryPart=masteryLayer.node;
   wrappers.push(masteryLayer.mask);masteryPart.appendChild(copyAtPivot(badge,cx,cy));
  }
  originals.forEach(node=>{node.style.visibility='hidden';});
  root.classList.add('tdr-lobby-garage-lifting');
  scene?.events?.once?.('shutdown',cleanup);
  scene?.events?.once?.('destroy',cleanup);
  const goingDown=direction==='down';
  const duration=goingDown?GARAGE_LIFT_TIMING.down:GARAGE_LIFT_TIMING.up;
  const easing=goingDown?'cubic-bezier(.28,.02,.2,1)':'cubic-bezier(.2,.7,.18,1)';
  // Gaussian-profile concentric dissolution; no hard iris or whole-image fade.
  // The same soft radius is shared by platform, car and roof mastery.
  well.style.opacity=goingDown?'0':'1';
  rim.style.opacity=goingDown?'0':'1';
  const wellFrames=goingDown
   ?[{opacity:0,offset:0},{opacity:.24,offset:.18},{opacity:1,offset:.56},{opacity:1,offset:1}]
   :[{opacity:1,offset:0},{opacity:1,offset:.54},{opacity:.30,offset:.83},{opacity:0,offset:1}];
  const rimFrames=goingDown
   ?[{opacity:0,offset:0},{opacity:.30,offset:.16},{opacity:1,offset:.54},{opacity:1,offset:1}]
   :[{opacity:1,offset:0},{opacity:1,offset:.48},{opacity:.4,offset:.82},{opacity:0,offset:1}];
  const progress=[
   animateWait(platformPart,liftFrames(descendingFrames.platform,goingDown),duration,easing,animations),
   animateWait(carPart,liftFrames(descendingFrames.car,goingDown),duration,easing,animations),
   ...(masteryPart?[animateWait(masteryPart,liftFrames(descendingFrames.mastery,goingDown),duration,easing,animations)]:[]),
   animateSoftApertures(
    [platformLayer.mask,carLayer.mask,masteryLayer?.mask],
    duration,goingDown,animations
   ),
   animateWait(well,wellFrames,duration,easing,animations),
   animateWait(rim,rimFrames,duration,easing,animations)
  ];
  const finishTransition=()=>{
   if(ended)return;
   if(goingDown){
    // The original sprites MUST stay hidden after the descent. A lazy garage
    // scene can take seconds to load: cleanup on shutdown, not before start().
    try{if(scene?.sys?.isActive?.()!==false)onComplete?.();}
    catch(error){console.warn('[garage-lift] navigation failed',error);cleanup();return;}
    if(!ended)recoveryTimer=setTimeout(()=>{
     if(!ended&&scene?.sys?.isActive?.())cleanup();
    },20000);
   }else{
    cleanup();
    if(scene?.sys?.isActive?.()!==false)onComplete?.();
   }
  };
  Promise.all(progress).then(finishTransition).catch(error=>{
   console.warn('[garage-lift] animation fallback',error);
   if(ended)return;
   cleanup();
   if(scene?.sys?.isActive?.()!==false)onComplete?.();
  });
  return true;
 }catch(error){
  console.warn('[garage-lift] setup fallback',error);
  cleanup();
  return false;
 }
}
export function goToPlayerGarageWithLift(scene){
 if(scene?._garageLiftBusy)return;
 const navigate=()=>scene?.scene?.start?.('GarageScene',{mode:'player'});
 if(!garageLiftEnabled()||!startLift(scene,scene?._lobbyDomRoot,'down',navigate))navigate();
}
export function returnToLobbyFromGarage(scene,carId=null){
 if(scene?._garageReturnPending)return;
 scene._garageReturnPending=true;
 if(carId)try{localStorage.setItem('tdr2:carId',carId);}catch{}
 markGarageLiftReturn();
 scene?.scene?.start?.('menu');
}
export function beginGarageLiftRise(scene,root){
 if(!consumeGarageLiftReturn())return false;
 if(!root?.isConnected)return false;
 const platform=root.querySelector('.tdr-lobby-car-platform');
 const car=root.querySelector('[data-lobby-car]');
 const badge=root.querySelector('[data-lobby-mastery]');
 const hiding=[platform,car,...(badge&&!badge.hidden?[badge]:[])].filter(Boolean);
 const saved=hiding.map(node=>node.style.visibility);
 // Hide immediately, before the first painted lobby frame.
 hiding.forEach(node=>{node.style.visibility='hidden';});
 let finished=false,attempts=0,timeout=0;
 const restore=()=>{
  if(finished)return;
  finished=true;
  if(timeout)clearTimeout(timeout);
  scene?.events?.off?.('shutdown',restore);
  scene?.events?.off?.('destroy',restore);
  hiding.forEach((node,i)=>{if(node.isConnected)node.style.visibility=saved[i];});
 };
 const tryRise=()=>{
  if(finished||!root.isConnected)return restore();
  if(ready(platform)&&ready(car)){
   if(!startLift(scene,root,'up',restore))restore();
   return;
  }
  if(attempts++>35)return restore(); // Never strand the lobby on a failed image.
  timeout=setTimeout(tryRise,45);
 };
 scene?.events?.once?.('shutdown',restore);
 scene?.events?.once?.('destroy',restore);
 timeout=setTimeout(tryRise,35);
 return true;
}
