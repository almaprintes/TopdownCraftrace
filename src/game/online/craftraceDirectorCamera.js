// Pure local drone-camera math: no Phaser, network or persistent player state.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function makeDirectorCameraState({x=0,y=0,heading=0}={}){
 if(![x,y,heading].every(Number.isFinite))throw Error('Invalid drone position');
 return {x,y,heading,speed:0,altitude:.52,auto:false};
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
const wrapPi=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Race director starts itself; never waits for the pilot's ignition/track gate.
export function directorStartPhase(now,startAt){
 const remaining=Math.max(0,Number(startAt)-Number(now));
 if(!Number.isFinite(remaining))return {started:false,seconds:3};
 return {started:remaining<=0,seconds:Math.ceil(remaining/1000)};
}
export function directorZoom(altitude){return 1.4-clamp(Number(altitude)||.52,.10,1)*1.12;}
export function stepDirectorCamera(state,input,dt,bots=[]){
 const elapsed=clamp(Number(dt)||0,0,.05),next={...state};
 const gas=clamp(Number(input?.gas)||0,0,1);
 const brake=clamp(Number(input?.brake)||0,0,1);
 const steer=clamp(Number(input?.steer)||0,-1,1);
 const stickX=clamp(Number(input?.stickX)||0,-1,1);
 const stickY=clamp(Number(input?.stickY)||0,-1,1);
 const stickActive=Math.hypot(stickX,stickY)>.14;
 const rise=clamp(Number(input?.rise)||0,0,1);
 const sink=clamp(Number(input?.sink)||0,0,1);
 if((gas||brake||Math.abs(steer)>.04||stickActive)&&next.auto)next.auto=false;
 if(next.auto){
  const interest=chooseDirectorAction(bots);
  if(interest){
   const smoothing=1-Math.exp(-3.2*elapsed);
   next.x+=(interest.x-next.x)*smoothing;
   next.y+=(interest.y-next.y)*smoothing;
   next.altitude+=(clamp(.42+interest.distance/1100,.40,.85)-next.altitude)*smoothing;
  }
  next.speed=0;
 }else{
  if(stickActive){
   // North-up map: pushing up moves toward the top of the screen.
   const desired=Math.atan2(stickY,stickX);
   const deltaAngle=wrapPi(desired-next.heading);
   next.heading+=clamp(deltaAngle,-5.8*elapsed,5.8*elapsed);
  }else{
   // A/D remains yaw for keyboard users; releasing the stick holds heading.
   next.heading+=steer*2.4*elapsed;
  }
  next.speed=clamp(next.speed+(gas*520-brake*850-next.speed*1.5)*elapsed,0,530);
  next.x+=Math.cos(next.heading)*next.speed*elapsed;
  next.y+=Math.sin(next.heading)*next.speed*elapsed;
 }
 next.altitude=clamp(next.altitude+(rise-sink)*.50*elapsed,.10,1);
 return next;
}
