// Pure local drone-camera math: no Phaser, network or persistent player state.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function makeDirectorCameraState({x=0,y=0,heading=0}={}){
 if(![x,y,heading].every(Number.isFinite))throw Error('Invalid drone position');
 return {x,y,heading,speed:0,vx:0,vy:0,altitude:.52,auto:false};
}
export function chooseDirectorAction(bots){
 const cars=(Array.isArray(bots)?bots:[]).filter(b=>b?.plannerBody&&
   Number.isFinite(b.plannerBody.x)&&Number.isFinite(b.plannerBody.y));
 if(!cars.length)return null;
 let best=null,proximity=Infinity;
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
  const a=cars[i].plannerBody,b=cars[j].plannerBody;
  const d=Math.hypot(a.x-b.x,a.y-b.y);
  if(d<proximity){proximity=d;best={x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:d};}
 }
 return best||{x:cars[0].plannerBody.x,y:cars[0].plannerBody.y,distance:0};
}
// Absolute, screen-oriented 2-axis stick. The thumb follows the finger inside
// a circular travel area instead of being pinned to the horizontal diameter.
export function directorStickVector(x,y,rect){
 const width=Math.max(1,Number(rect?.width)||1),height=Math.max(1,Number(rect?.height)||1);
 const travel=Math.max(1,Math.min(width,height)*.26);
 const dx=(Number(x)||0)-(Number(rect?.left)||0)-width/2;
 const dy=(Number(y)||0)-(Number(rect?.top)||0)-height/2;
 const radius=Math.hypot(dx,dy);
 const factor=Math.min(1,travel/Math.max(.0001,radius));
 const vx=clamp(dx*factor/travel,-1,1),vy=clamp(dy*factor/travel,-1,1);
 const magnitude=Math.hypot(vx,vy);
 // Center deadzone prevents tremble while still centering the visible thumb.
 const active=magnitude>.14;
 return {x:active?vx:0,y:active?vy:0,
  offsetX:dx*factor,offsetY:dy*factor,magnitude:active?magnitude:0};
}
// Vertical camera-height lever, spring-centered; up = higher/wider view.
export function directorAltitudeStick(y,rect){
 const height=Math.max(1,Number(rect?.height)||1);
 const travel=Math.max(1,height*.34);
 const dy=(Number(y)||0)-(Number(rect?.top)||0)-height/2;
 const axis=clamp(dy/travel,-1,1);
 return {axis:Math.abs(axis)<.08?0:axis,offsetY:clamp(dy,-travel,travel)};
}
// Race director starts itself; never waits for the pilot's ignition/track gate.
export function directorStartPhase(now,startAt){
 const remaining=Math.max(0,Number(startAt)-Number(now));
 if(!Number.isFinite(remaining))return {started:false,seconds:3};
 return {started:remaining<=0,seconds:Math.ceil(remaining/1000)};
}
export function directorZoom(altitude){return 1.4-clamp(Number(altitude)||.52,.10,1)*1.12;}
// Twin-stick drone: LEFT = translation in screen XY with analog magnitude;
// RIGHT = vertical climb/descent (and therefore zoom). No gas, brake or yaw pedal.
export function stepDirectorCamera(state,input,dt,bots=[]){
 const elapsed=clamp(Number(dt)||0,0,.05);
 const next={vx:0,vy:0,...state};
 const sx=clamp(Number(input?.stickX)||0,-1,1);
 const sy=clamp(Number(input?.stickY)||0,-1,1);
 const axis=clamp(Number(input?.altitudeAxis)||0,-1,1);
 const mag=Math.min(1,Math.hypot(sx,sy));
 const active=mag>.08;
 if(active&&next.auto)next.auto=false;
 if(next.auto){
  const interest=chooseDirectorAction(bots);
  if(interest){
   const smoothing=1-Math.exp(-3.2*elapsed);
   next.x+=(interest.x-next.x)*smoothing;
   next.y+=(interest.y-next.y)*smoothing;
   // Right stick can override auto zoom without cancelling auto framing.
   if(Math.abs(axis)<.08)
    next.altitude+=(clamp(.42+interest.distance/1100,.40,.85)-next.altitude)*smoothing;
  }
  next.vx=0;next.vy=0;next.speed=0;
 }else{
  const maxSpeed=530;
  const targetVx=active?sx*maxSpeed:0;
  const targetVy=active?sy*maxSpeed:0;
  const smoothing=1-Math.exp(-(active?13:20)*elapsed);
  next.vx+=(targetVx-next.vx)*smoothing;
  next.vy+=(targetVy-next.vy)*smoothing;
  if(Math.hypot(next.vx,next.vy)<.05){next.vx=0;next.vy=0;}
  next.x+=next.vx*elapsed;
  next.y+=next.vy*elapsed;
  next.speed=Math.hypot(next.vx,next.vy);
  if(next.speed>.1)next.heading=Math.atan2(next.vy,next.vx);
 }
 // Push lever upward (negative Y) to climb and widen the framing.
 next.altitude=clamp(next.altitude-axis*.64*elapsed,.10,1);
 return next;
}
