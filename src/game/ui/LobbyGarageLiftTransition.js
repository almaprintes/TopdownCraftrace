// DEV 1.2.207 — Orthographic garage shaft: match the actual platform artwork.
// These DOM clones stay at their ORIGINAL lobby z-index: stage 0, car 1,
// roof mastery 4. No fullscreen overlay or extra Phaser renderer work.
// Race departure (LobbyRaceDeparture.js) is entirely separate and untouched.
const IS_PROD_BUILD = typeof __TDR_PROD_BUILD__ === 'boolean' ? __TDR_PROD_BUILD__ : false;

export const GARAGE_LIFT_TIMING=Object.freeze({down:1040,up:1120});
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
function anchoredPart(root,cx,cy,zIndex){
 const rr=root.getBoundingClientRect();
 const node=document.createElement('div');
 node.className='tdr-lobby-garage-lift-part';
 Object.assign(node.style,{position:'absolute',left:(cx-rr.left)+'px',top:(cy-rr.top)+'px',
  width:'0',height:'0',zIndex:String(zIndex),overflow:'visible',pointerEvents:'none',
  transformOrigin:'0 0',willChange:'transform,opacity,filter'});
 root.appendChild(node);
 return node;
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
// No translateY or perspective skew: the camera is fully orthographic.
const LEVEL={transform:'translate3d(0,0,0) scale(1)',opacity:1,filter:'brightness(1) saturate(1)'};
const FALL={transform:'translate3d(0,0,0) scale(.88)',opacity:0,filter:'brightness(.09) saturate(.55)'};
const CAR_FALL={transform:'translate3d(0,0,0) scale(.86)',opacity:0,filter:'brightness(.07) saturate(.50)'};
const MASTERY_FALL={transform:'translate3d(0,0,0) scale(.88)',opacity:0,filter:'brightness(.1)'};
const descendingFrames={
 platform:[{...LEVEL,offset:0},
  {transform:'translate3d(0,0,0) scale(.975)',opacity:.92,filter:'brightness(.75) saturate(.85)',offset:.32},
  {transform:'translate3d(0,0,0) scale(.91)',opacity:.34,filter:'brightness(.20) saturate(.60)',offset:.73},
  {...FALL,offset:1}],
 car:[{...LEVEL,offset:0},
  {transform:'translate3d(0,0,0) scale(.97)',opacity:.95,filter:'brightness(.7) saturate(.8)',offset:.30},
  {transform:'translate3d(0,0,0) scale(.89)',opacity:.26,filter:'brightness(.12) saturate(.55)',offset:.73},
  {...CAR_FALL,offset:1}],
 mastery:[{...LEVEL,offset:0},
  {transform:'translate3d(0,0,0) scale(.95)',opacity:.30,filter:'brightness(.25)',offset:.52},
  {...MASTERY_FALL,offset:1}]
};
const liftFrames=(frames,goingDown)=>goingDown?frames:frames.map(f=>({...f,offset:1-f.offset})).reverse();
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
 const visibility=originals.map(node=>node.style.visibility);
 let well=null,rim=null,ended=false;
 const cleanup=()=>{
  if(ended)return;
  ended=true;
  for(const anim of animations){try{anim.cancel();}catch{}}
  for(const part of wrappers)part.remove();
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
  platformPart=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.platform);
  wrappers.push(platformPart);platformPart.appendChild(copyAtPivot(platform,cx,cy));
  carPart=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.car);
  wrappers.push(carPart);carPart.appendChild(copyAtPivot(car,cx,cy));
  if(originals.includes(badge)){
   masteryPart=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.mastery);
   wrappers.push(masteryPart);masteryPart.appendChild(copyAtPivot(badge,cx,cy));
  }
  originals.forEach(node=>{node.style.visibility='hidden';});
  root.classList.add('tdr-lobby-garage-lifting');
  scene?.events?.once?.('shutdown',cleanup);
  scene?.events?.once?.('destroy',cleanup);
  const goingDown=direction==='down';
  const duration=goingDown?GARAGE_LIFT_TIMING.down:GARAGE_LIFT_TIMING.up;
  const easing=goingDown?'cubic-bezier(.28,.02,.2,1)':'cubic-bezier(.2,.7,.18,1)';
  // The shaft remains centered while stage/car darken and recede. The thin
  // fixed rim covers their outer edge progressively without moving on screen.
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
   animateWait(well,wellFrames,duration,easing,animations),
   animateWait(rim,rimFrames,duration,easing,animations)
  ];
  Promise.all(progress).then(()=>{
   if(ended)return;
   cleanup();
   if(scene?.sys?.isActive?.()!==false)onComplete?.();
  }).catch(error=>{
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
