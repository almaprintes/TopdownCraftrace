// DEV-only lobby departure: transform already-rendered DOM images, no extra
// Phaser textures, physics, canvas snapshots or track tile decoding.
// One launch after the last frame. All animations are cancelled on scene shutdown.
export const LOBBY_DEPARTURE_TIMING=Object.freeze({turn:800,hold:180,drive:520});
export function shouldUseLobbyDeparture({prod=false,storage=globalThis.localStorage}={}){
 if(prod)return false;
 try{return storage?.getItem?.('tdr2:devLobbyRaceDeparture')!=='off';}catch{return true;}
}
function visibleImage(node){
 return !!(node?.isConnected&&node?.complete&&node?.naturalWidth&&node.getBoundingClientRect().width>0);
}
function placeClone(original,cx,cy){
 const r=original.getBoundingClientRect();
 const width=original.offsetWidth||r.width,height=original.offsetHeight||r.height;
 const img=original.cloneNode(false);
 img.removeAttribute('id');img.removeAttribute('data-lobby-car');
 img.removeAttribute('data-lobby-mastery');
 img.removeAttribute('class');
 img.setAttribute('aria-hidden','true');img.alt='';img.draggable=false;
 const computed=getComputedStyle(original);
 Object.assign(img.style,{
  position:'absolute',display:'block',left:(r.left+r.width/2-cx-width/2)+'px',
  top:(r.top+r.height/2-cy-height/2)+'px',
  width:width+'px',height:height+'px',maxWidth:'none',maxHeight:'none',
  transform:'none',transformOrigin:'center center',translate:'none',scale:'none',
  rotate:'none',objectFit:computed.objectFit||'contain',opacity:computed.opacity||'1',
  pointerEvents:'none',willChange:'transform'
 });
 // Mastery shields use "translate(-50%,-50%) rotate(...)" in the regular DOM.
 // Their center was measured above; only rotation needs to be re-applied.
 const rotation=String(original.style.transform||'').match(/rotate\(([-.\d]+deg)\)/);
 if(rotation)img.style.rotate=rotation[1];
 else if(computed.rotate&&computed.rotate!=='none')img.style.rotate=computed.rotate;
 if(computed.scale&&computed.scale!=='none')img.style.scale=computed.scale;
 return img;
}
function animateAndWait(element,keyframes,options,timeoutMs){
 return new Promise(resolve=>{
  if(!element?.animate){resolve();return;}
  let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};
  let animation;
  try{animation=element.animate(keyframes,{...options,fill:'forwards'});}
  catch{resolve();return;}
  animation.finished.then(finish,finish);
  const timer=setTimeout(finish,timeoutMs);
 });
}
export function runLobbyRaceDeparture(scene,onFinished,{prod=false}={}){
 const launch=typeof onFinished==='function'?onFinished:()=>{};
 const root=scene?._lobbyDomRoot;
 const platform=root?.querySelector('.tdr-lobby-car-platform');
 const car=root?.querySelector('[data-lobby-car]');
 if(!shouldUseLobbyDeparture({prod})||!visibleImage(platform)||!visibleImage(car)||
    typeof document==='undefined'||typeof platform.animate!=='function'||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
  launch();return false;
 }
 const pr=platform.getBoundingClientRect(),cx=pr.left+pr.width/2,cy=pr.top+pr.height/2;
 const layer=document.createElement('div');
 layer.className='tdr-lobby-departure';
 Object.assign(layer.style,{position:'fixed',left:cx+'px',top:cy+'px',
  width:'0',height:'0',pointerEvents:'none',zIndex:'2147481900',
  transformOrigin:'0 0',willChange:'transform',overflow:'visible'});
 const platformClone=placeClone(platform,cx,cy);
 const movingCar=document.createElement('div');
 Object.assign(movingCar.style,{position:'absolute',left:'0',top:'0',
  width:'0',height:'0',pointerEvents:'none',willChange:'transform'});
 const carClone=placeClone(car,cx,cy);
 movingCar.appendChild(carClone);
 const badge=root.querySelector('[data-lobby-mastery]');
 const originals=[platform,car];
 if(visibleImage(badge)&&!badge.hidden){
  originals.push(badge);
  movingCar.appendChild(placeClone(badge,cx,cy));
 }
 layer.append(platformClone,movingCar);
 document.body.appendChild(layer);
 const previous=originals.map(node=>node.style.visibility);
 originals.forEach(node=>{node.style.visibility='hidden';});
 root.classList.add('tdr-lobby-departing');
 let disposed=false,launched=false;
 let warmTimer=0;
 const stop=()=>{
  if(disposed)return;
  disposed=true;
  if(warmTimer)clearTimeout(warmTimer);
  try{layer.getAnimations({subtree:true}).forEach(a=>a.cancel());}catch{}
  layer.remove();
  originals.forEach((node,i)=>{if(node.isConnected)node.style.visibility=previous[i];});
  root.classList.remove('tdr-lobby-departing');
  scene?.events?.off?.('shutdown',stop);
  scene?.events?.off?.('destroy',stop);
 };
 const next=()=>{
  if(launched||disposed)return;
  launched=true;stop();
  if(scene?.sys?.isActive?.()!==false)launch();
 };
 scene?.events?.once?.('shutdown',stop);
 scene?.events?.once?.('destroy',stop);
 // Begin warming ONLY the race code and loader modules during the turn.
 // Track textures are still loaded by the established full-screen loading scene.
 warmTimer=setTimeout(()=>{
  if(disposed)return;
  try{Promise.resolve(globalThis.__tdrWarmRaceScene?.()).catch(()=>{});}catch{}
 },180);
 (async()=>{
  try{
   await animateAndWait(layer,[{transform:'rotate(0deg)'},{transform:'rotate(90deg)'}],
    {duration:LOBBY_DEPARTURE_TIMING.turn,easing:'cubic-bezier(.35,.02,.18,1)'},LOBBY_DEPARTURE_TIMING.turn+250);
   if(disposed)return;
   layer.style.transform='rotate(90deg)';
   try{layer.getAnimations().forEach(a=>a.cancel());}catch{}
   await animateAndWait(platformClone,
    [{filter:'brightness(1)'},{filter:'brightness(1.25) drop-shadow(0 0 14px rgba(94,214,255,.48))'},{filter:'brightness(1)'}],
    {duration:LOBBY_DEPARTURE_TIMING.hold,easing:'ease-in-out'},LOBBY_DEPARTURE_TIMING.hold+150);
   if(disposed)return;
   // The stage is rotated 90° clockwise. Negative local Y is screen RIGHT.
   const distance=innerWidth+pr.width;
   await animateAndWait(movingCar,
    [{transform:'translate3d(0,0,0) scale(1)',opacity:1},
     {transform:'translate3d(0,'+(-distance)+'px,0) scale(1.1)',opacity:1}],
    {duration:LOBBY_DEPARTURE_TIMING.drive,easing:'cubic-bezier(.6,.05,.94,.45)'},LOBBY_DEPARTURE_TIMING.drive+250);
  }catch(err){console.warn('[lobby-departure] skipped:',err);}
  next();
 })();
 return true;
}
