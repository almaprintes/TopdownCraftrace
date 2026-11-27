// Original local-only OBB contact solver. No Arcade colliders, no network,
// no direct movement of car centers and no changes to lap gates or stock drive.
// Normal impulses oppose closing motion; bounded velocity bias separates
// penetrations without teleporting vehicles across a checkpoint.
export const CONTACT_TUNING=Object.freeze({
 soft:Object.freeze({restitution:0.025,friction:0.12,impulseFactor:0.84,biasRate:5,maxBias:18,yaw:0,traffic:0.42}),
 full:Object.freeze({restitution:0.09,friction:0.24,impulseFactor:1,biasRate:8,maxBias:27,yaw:0.12,traffic:0.65})
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(x,y,a,b)=>x*a+y*b;
export function makeContactBox({x,y,angle=0,halfLength,halfWidth,vx=0,vy=0,mass=1}){
 if(![x,y,angle,halfLength,halfWidth,vx,vy,mass].every(Number.isFinite)||halfLength<=0||halfWidth<=0||mass<=0)return null;
 return {x,y,angle,halfLength,halfWidth,vx,vy,invMass:1/mass,fx:Math.cos(angle),fy:Math.sin(angle),radius:Math.hypot(halfLength,halfWidth)};
}
function radiusOn(b,nx,ny){
 return b.halfLength*Math.abs(dot(b.fx,b.fy,nx,ny))+b.halfWidth*Math.abs(dot(-b.fy,b.fx,nx,ny));
}
export function orientedContact(a,b){
 const dx=b.x-a.x,dy=b.y-a.y;
 if(dx*dx+dy*dy>=(a.radius+b.radius)**2)return null;
 let depth=Infinity,nx=0,ny=0;
 for(const [ax,ay] of [[a.fx,a.fy],[-a.fy,a.fx],[b.fx,b.fy],[-b.fy,b.fx]]){
  const center=dot(dx,dy,ax,ay),overlap=radiusOn(a,ax,ay)+radiusOn(b,ax,ay)-Math.abs(center);
  if(overlap<=0)return null;
  if(overlap<depth){depth=overlap;const sign=center<0?-1:1;nx=ax*sign;ny=ay*sign;}
 }
 return {nx,ny,depth};
}
// Mutates only solver velocity snapshots; caller applies them to Arcade bodies.
export function resolveContact(a,b,tuning,maxSpeed,dt){
 const hit=orientedContact(a,b);if(!hit)return null;
 const {nx,ny,depth}=hit,inv=a.invMass+b.invMass;
 const closing=dot(b.vx-a.vx,b.vy-a.vy,nx,ny);
 const bounce=closing< -35?tuning.restitution:0;
 const normal=Math.min(maxSpeed*.42,Math.max(0,-closing*(1+bounce)*tuning.impulseFactor)/inv);
 // Bias is a target separation speed, not a fresh kick every frame.
 const separation=Math.min(tuning.maxBias,maxSpeed*.06,Math.max(0,depth-1.2)*tuning.biasRate);
 const bias=Math.min(maxSpeed*.08,Math.max(0,separation-(closing+normal*inv))/inv);
 const j=normal+bias;
 a.vx-=nx*j*a.invMass;a.vy-=ny*j*a.invMass;
 b.vx+=nx*j*b.invMass;b.vy+=ny*j*b.invMass;
 const tx=-ny,ty=nx,tangent=dot(b.vx-a.vx,b.vy-a.vy,tx,ty);
 const friction=clamp(-tangent/inv,-normal*tuning.friction,normal*tuning.friction);
 a.vx-=tx*friction*a.invMass;a.vy-=ty*friction*a.invMass;
 b.vx+=tx*friction*b.invMass;b.vy+=ty*friction*b.invMass;
 // Approximate off-center deflection, capped per step. No angular acceleration
 // is retained; normal steering recovers the heading on subsequent frames.
 const armA=clamp(dot(b.x-a.x,b.y-a.y,a.fx,a.fy)/a.halfLength,-1,1);
 const armB=clamp(dot(a.x-b.x,a.y-b.y,b.fx,b.fy)/b.halfLength,-1,1);
 const yawA=clamp(-armA*dot(nx,ny,-a.fy,a.fx)*normal/maxSpeed*tuning.yaw,-.045,.045);
 const yawB=clamp(armB*dot(nx,ny,-b.fy,b.fx)*normal/maxSpeed*tuning.yaw,-.045,.045);
 return {normal,closing,yawA,yawB,depth};
}
// Local traffic assist: only a closing AI immediately behind another vehicle.
// No change to its free-air pace, difficulty, line, Elo or dice.
export function trafficAssist(a,b,tuning,dt){
 const dx=b.x-a.x,dy=b.y-a.y,front=dot(dx,dy,a.fx,a.fy),side=Math.abs(dot(dx,dy,-a.fy,a.fx));
 const clearance=front-a.halfLength-radiusOn(b,a.fx,a.fy);
 const range=a.halfLength*.85;
 if(front<=0||side>a.halfWidth+radiusOn(b,-a.fy,a.fx)*.8||clearance>range||clearance< -a.halfLength*.4)return;
 if(dot(a.fx,a.fy,b.fx,b.fy)<.45)return;
 const closing=dot(a.vx-b.vx,a.vy-b.vy,a.fx,a.fy);
 if(closing<=0)return;
 const brake=Math.min(closing,closing*tuning.traffic*clamp(dt*12,0,1)*(1-clamp(clearance/range,0,1)));
 a.vx-=a.fx*brake;a.vy-=a.fy*brake;
}
export function createOfflineContactPhysics(scene,director,config){
 const tuning=CONTACT_TUNING[config.contact];if(!tuning)throw Error('Invalid contact mode');
 const state={playerImpacts:0,update};
 const activePairs=new Set();
 const scale=clamp(Number(scene.track?.meta?.carScale)||1,.35,1.5);
 // Use stable collision scale, not async skin sprite dimensions.
 const vehicleScale=clamp(Number(scene.baseSpec?.collisionScale??scene.baseSpec?.visualScale)||1,.5,1.5);
 const halfLength=96*1.35*scale*vehicleScale*.42;
 const halfWidth=48*1.35*scale*vehicleScale*.42;
 function update(deltaMs,clock,playerFinished){
  const dt=clamp(Number(deltaMs)/1000||0,0,.05);if(!dt)return;
  const maxSpeed=Math.max(80,Number(scene.maxFwd||scene.carParams?.maxFwd)||420);
  const entries=[];
  function add(sprite,seat,human){
   const v=sprite?.body?.velocity;if(!v||sprite.body.enable===false)return;
   const box=makeContactBox({x:sprite.x,y:sprite.y,angle:sprite.rotation,halfLength,halfWidth,vx:v.x,vy:v.y});
   if(box)entries.push({...box,sprite,seat,human,yawDelta:0});
  }
  if(!playerFinished)add(scene.carBody,config.humanSeat,true);
  for(const bot of director.bots)if(!bot.finished)add(bot.plannerBody,bot.seat,false);
  const seen=new Set();
  // Only 136 pairs at 17 cars. Cheap radius rejection before SAT/traffic.
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
   const a=entries[i],b=entries[j];
   if((a.x-b.x)**2+(a.y-b.y)**2>(a.radius+b.radius+halfLength)**2)continue;
   if(!a.human)trafficAssist(a,b,tuning,dt);
   if(!b.human)trafficAssist(b,a,tuning,dt);
   const result=resolveContact(a,b,tuning,maxSpeed,dt);if(!result)continue;
   a.yawDelta+=result.yawA;b.yawDelta+=result.yawB;
   const key=Math.min(a.seat,b.seat)+':'+Math.max(a.seat,b.seat);
   seen.add(key);
   if((a.human||b.human)&&!activePairs.has(key))state.playerImpacts++;
  }
  activePairs.clear();for(const key of seen)activePairs.add(key);
  for(const e of entries){
   // Only apply changes from contact/traffic. Do not clamp the unmodified
   // existing forward speed, which can include legitimate slip/reverse.
   const v=e.sprite.body.velocity;
   if(e.vx!==v.x||e.vy!==v.y){v.x=e.vx;v.y=e.vy;}
   if(e.yawDelta)e.sprite.rotation+=clamp(e.yawDelta,-.06,.06);
  }
 }
 return state;
}
