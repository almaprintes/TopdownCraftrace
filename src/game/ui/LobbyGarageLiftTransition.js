// DEV 1.2.205 — Lobby ↔ Garage underground turntable.
// These DOM clones stay at their ORIGINAL lobby z-index: stage 0, car 1,
// roof mastery 4. No fullscreen overlay or extra Phaser renderer work.
// Race departure (LobbyRaceDeparture.js) is entirely separate and untouched.
import { IS_PROD_BUILD } from '../buildTarget.js';

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
  filter:computed.filter||'none',visibility:'visible',opacity:'1',pointerEvents:'none',userSelect:'none'});
 const rot=String(original.style.transform||'').match(/rotate\(([-.\d]+deg)\)/);
 if(rot)node.style.rotate=rot[1];
 else if(computed.rotate&&computed.rotate!=='none')node.style.rotate=computed.rotate;
 if(computed.scale&&computed.scale!=='none')node.style.scale=computed.scale;
 return node;
}
function createFloorWell(root,cx,cy,platformRect){
 const rr=root.getBoundingClientRect(),well=document.createElement('div');
 well.className='tdr-lobby-garage-well';
 Object.assign(well.style,{
  position:'absolute',left:(cx-rr.left)+'px',top:(cy-rr.top+platformRect.height*.1)+'px',
  width:(platformRect.width*.84)+'px',height:(platformRect.height*.62)+'px',
  transform:'translate(-50%,-50%)',borderRadius:'50%',zIndex:'0',
  pointerEvents:'none',opacity:'0',willChange:'opacity',
  background:'radial-gradient(ellipse at 50% 53%,#000407 0%,#06111a 58%,#182f3a 76%,rgba(67,136,161,.34) 90%,transparent 100%)',
  border:'2px solid rgba(85,174,200,.30)',
  boxShadow:'inset 0 16px 35px rgba(0,0,0,.98),0 0 22px rgba(0,0,0,.4)'});
 root.appendChild(well);return well;
}
const FALL={transform:'translate3d(0,16px,0) scale(.62)',opacity:.03,filter:'brightness(.10) saturate(.62)'};
const LEVEL={transform:'translate3d(0,0,0) scale(1)',opacity:1,filter:'brightness(1) saturate(1)'};
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
 const visibility=originals.map(node=>node.style.visibility);
 let well=null,ended=false,leaving=false;
 const cleanup=()=>{
  if(ended)return;
  ended=true;
  for(const anim of animations){try{anim.cancel();}catch{}}
  for(const part of wrappers)part.remove();
  well?.remove();
  originals.forEach((node,i)=>{if(node.isConnected)node.style.visibility=visibility[i];});
  root.classList.remove('tdr-lobby-garage-lifting');
  scene._garageLiftBusy=false;
  scene?.events?.off?.('shutdown',cleanup);
  scene?.events?.off?.('destroy',cleanup);
 };
 try{
  scene._garageLiftBusy=true;
  well=createFloorWell(root,cx,cy,pr);
  // After a full garage swap, the previous car asset is never cloned.
  const platformPart=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.platform);
  wrappers.push(platformPart);platformPart.appendChild(copyAtPivot(platform,cx,cy));
  const carPart=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.car);
  wrappers.push(carPart);carPart.appendChild(copyAtPivot(car,cx,cy));
  if(originals.includes(badge)){
   const shield=anchoredPart(root,cx,cy,GARAGE_LIFT_DEPTH.mastery);
   wrappers.push(shield);shield.appendChild(copyAtPivot(badge,cx,cy));
  }
  originals.forEach(node=>{node.style.visibility='hidden';});
  root.classList.add('tdr-lobby-garage-lifting');
  scene?.events?.once?.('shutdown',cleanup);
  scene?.events?.once?.('destroy',cleanup);
  const goingDown=direction==='down';
  const duration=goingDown?GARAGE_LIFT_TIMING.down:GARAGE_LIFT_TIMING.up;
  const easing=goingDown?'cubic-bezier(.28,.02,.2,1)':'cubic-bezier(.2,.7,.18,1)';
  const frames=goingDown?[LEVEL,FALL]:[FALL,LEVEL];
  const wellFrames=goingDown?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}];
  const progress=[
   ...wrappers.map(part=>animateWait(part,frames,duration,easing,animations)),
   animateWait(well,wellFrames,duration,easing,animations)
  ];
  Promise.all(progress).then(()=>{
   if(ended)return;
   leaving=true;
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
