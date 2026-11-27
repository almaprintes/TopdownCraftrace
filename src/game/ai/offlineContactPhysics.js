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
// Measure opaque artwork once per Phaser frame. Transparent margins must
// never create invisible bumpers. Cache normalized bounds, not world scale.
const alphaBoundsCache=new WeakMap();
export function opaqueContactBounds(data,w,h,threshold=112){
 let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>=threshold){
   x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
 }
 return x1>=x0&&y1>=y0?{left:x0/w,top:y0/h,right:(x1+1)/w,bottom:(y1+1)/h}:null;
}
function artworkBounds(visual){
 const f=visual.frame;
 if(!f||typeof f!=='object')return null;
 if(alphaBoundsCache.has(f))return alphaBoundsCache.get(f);
 let bounds=null;
 try{
   const image=f.source?.image||visual.texture?.getSourceImage?.();
   const w=Number(f.cutWidth),h=Number(f.cutHeight);
   if(image&&w>0&&h>0&&typeof document!=='undefined'){
     const canvas=document.createElement('canvas');
     // Full source alpha avoids coarse sampling expanding a thin silhouette.
     canvas.width=w;canvas.height=h;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});
     if(ctx){
       ctx.drawImage(image,Number(f.cutX)||0,Number(f.cutY)||0,w,h,0,0,w,h);
       const crop=opaqueContactBounds(ctx.getImageData(0,0,w,h).data,w,h);
       if(crop){
         const rw=Number(f.realWidth)||w,rh=Number(f.realHeight)||h;
         const ox=Number(f.x)||0,oy=Number(f.y)||0;
         bounds={left:(ox+crop.left*w)/rw,top:(oy+crop.top*h)/rh,right:(ox+crop.right*w)/rw,bottom:(oy+crop.bottom*h)/rh};
       }
     }
   }
 }catch{}
 // If alpha is unavailable (e.g. canvas security), use an inset of the
 // actual displayed sprite, never the theoretical car spec dimensions.
 bounds=bounds||{left:.12,top:.12,right:.88,bottom:.88};
 alphaBoundsCache.set(f,bounds);
 return bounds;
}
// Body heading plus actual rig offset, local skin angle, scale and pivot.
// The longitudinal axis follows the longer axis of the painted rectangle.
export function contactBoxFromVisual(sprite,visual,rigOffset=0,bounds=null){
 if(!visual||visual.visible===false)return null;
 const width=Number(visual.displayWidth),height=Number(visual.displayHeight);
 if(!(width>0&&height>0))return null;
 const crop=bounds||artworkBounds(visual);if(!crop)return null;
 const originX=Number.isFinite(visual.originX)?visual.originX:.5;
 const originY=Number.isFinite(visual.originY)?visual.originY:.5;
 const localAngle=Number(visual.rotation)||0;
 const angle=sprite.rotation+rigOffset+localAngle;
 const cx=((crop.left+crop.right)/2-originX)*width;
 const cy=((crop.top+crop.bottom)/2-originY)*height;
 const rigAngle=sprite.rotation+rigOffset;
 const lx=Number(visual.x)||0,ly=Number(visual.y)||0;
 const x=sprite.x+Math.cos(rigAngle)*lx-Math.sin(rigAngle)*ly+Math.cos(angle)*cx-Math.sin(angle)*cy;
 const y=sprite.y+Math.sin(rigAngle)*lx+Math.cos(rigAngle)*ly+Math.sin(angle)*cx+Math.cos(angle)*cy;
 // Slight inset keeps transparent/antialiased edges and rounded corners
 // from causing premature contact. Same footprint in both contact modes.
 const hw=width*(crop.right-crop.left)*.46,hh=height*(crop.bottom-crop.top)*.46;
 const longX=hw>=hh;
 const v=sprite.body?.velocity;
 return makeContactBox({x,y,angle:longX?angle:angle+Math.PI/2,halfLength:Math.max(hw,hh),halfWidth:Math.min(hw,hh),vx:v?.x,vy:v?.y});
}

export function createOfflineContactPhysics(scene,director,config){
 const tuning=CONTACT_TUNING[config.contact];if(!tuning)throw Error('Invalid contact mode');
 const state={playerImpacts:0,update};
 const activePairs=new Set();
 function update(deltaMs,clock,playerFinished){
  const dt=clamp(Number(deltaMs)/1000||0,0,.05);if(!dt)return;
  const maxSpeed=Math.max(80,Number(scene.maxFwd||scene.carParams?.maxFwd)||420);
  const entries=[];
  function add(sprite,visual,seat,human){
   const v=sprite?.body?.velocity;if(!v||sprite.body.enable===false)return;
   const box=contactBoxFromVisual(sprite,visual,Number(scene._carVisualRotOffset)||0);
   if(box)entries.push({...box,sprite,seat,human,yawDelta:0});
  }
  if(!playerFinished)add(scene.carBody,scene.carRig?.list?.find(item=>item?.texture?.key),config.humanSeat,true);
  for(const bot of director.bots)if(!bot.finished)add(bot.plannerBody,bot.visual,bot.seat,false);
  const seen=new Set();
  // Only 136 pairs at 17 cars. Cheap radius rejection before SAT/traffic.
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
   const a=entries[i],b=entries[j];
   if((a.x-b.x)**2+(a.y-b.y)**2>(a.radius+b.radius)**2)continue;
   // No pre-contact braking/velocity changes. First require painted bodies to touch.
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
