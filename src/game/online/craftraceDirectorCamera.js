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
export function directorZoom(altitude){return 1.4-clamp(Number(altitude)||.52,.10,1)*1.12;}
export function stepDirectorCamera(state,input,dt,bots=[]){
 const elapsed=clamp(Number(dt)||0,0,.05),next={...state};
 const gas=clamp(Number(input?.gas)||0,0,1);
 const brake=clamp(Number(input?.brake)||0,0,1);
 const steer=clamp(Number(input?.steer)||0,-1,1);
 const rise=clamp(Number(input?.rise)||0,0,1);
 const sink=clamp(Number(input?.sink)||0,0,1);
 if((gas||brake||Math.abs(steer)>.04)&&next.auto)next.auto=false;
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
  next.heading+=steer*2.4*elapsed;
  next.speed=clamp(next.speed+(gas*520-brake*850-next.speed*1.5)*elapsed,0,530);
  next.x+=Math.cos(next.heading)*next.speed*elapsed;
  next.y+=Math.sin(next.heading)*next.speed*elapsed;
 }
 next.altitude=clamp(next.altitude+(rise-sink)*.50*elapsed,.10,1);
 return next;
}
