// CrafRace LIVE: render-only remote car samples; never changes local physics.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class RemotePilotInterpolator{
 constructor({delayMs=120,maxSamples=64,maxExtrapolateMs=120}={}){
  this.delayMs=clamp(delayMs,0,500);this.maxSamples=clamp(maxSamples,4,256);
  this.maxExtrapolateMs=clamp(maxExtrapolateMs,0,250);
  this.samples=[];this.generation=null;this.heat=null;this.lastTick=-1;
 }
 reset(){this.samples=[];this.generation=null;this.heat=null;this.lastTick=-1;}
 push(sample,receivedAt){
  if(!sample||!Number.isFinite(receivedAt)||!Number.isFinite(sample.x)||!Number.isFinite(sample.y)||
    !Number.isFinite(sample.angle)||!Number.isFinite(sample.speed)||!Number.isSafeInteger(sample.tick)||
    sample.tick<0||!Number.isSafeInteger(sample.generation)||!Number.isSafeInteger(sample.heat))return false;
  if(this.generation!==sample.generation||this.heat!==sample.heat)this.reset();
  if(sample.tick<=this.lastTick)return false;
  this.generation=sample.generation;this.heat=sample.heat;this.lastTick=sample.tick;
  this.samples.push({x:sample.x,y:sample.y,angle:wrap(sample.angle),speed:sample.speed,t:receivedAt,tick:sample.tick});
  if(this.samples.length>this.maxSamples)this.samples.splice(0,this.samples.length-this.maxSamples);
  return true;
 }
 at(now){
  if(!Number.isFinite(now)||!this.samples.length)return null;
  const target=now-this.delayMs;
  while(this.samples.length>2&&this.samples[1].t<target)this.samples.shift();
  const a=this.samples[0],b=this.samples[1];
  if(!b||target<=a.t)return {...a,stale:target<a.t};
  if(target<=b.t&&b.t>a.t){
   const q=clamp((target-a.t)/(b.t-a.t),0,1);
   return {x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,
    angle:wrap(a.angle+wrap(b.angle-a.angle)*q),
    speed:a.speed+(b.speed-a.speed)*q,stale:false};
  }
  const dt=clamp(target-b.t,0,this.maxExtrapolateMs)/1000;
  return {x:b.x+Math.cos(b.angle)*b.speed*dt,
   y:b.y+Math.sin(b.angle)*b.speed*dt,angle:b.angle,speed:b.speed,
   stale:target-b.t>this.maxExtrapolateMs};
 }
}
export class MonotonicLiveClock{
 constructor(now=()=>performance.now()){this.now=now;this.startAt=null;this.pausedAt=null;this.pausedTotal=0;this.laps=[];this.lastLapStart=null;}
 start(){if(this.startAt!==null)throw Error('Clock already started');const t=this.now();if(!Number.isFinite(t))throw Error('Invalid clock');this.startAt=t;this.lastLapStart=t;}
 pause(){if(this.startAt===null||this.pausedAt!==null)return;this.pausedAt=this.now();}
 resume(){if(this.pausedAt===null)return;const t=this.now();this.pausedTotal+=Math.max(0,t-this.pausedAt);this.pausedAt=null;}
 elapsed(){if(this.startAt===null)return 0;const end=this.pausedAt??this.now();return Math.max(0,end-this.startAt-this.pausedTotal);}
 lap(){if(this.startAt===null||this.pausedAt!==null)throw Error('Clock not running');
  const t=this.elapsed();const prev=this.laps.reduce((a,b)=>a+b,0);
  const ms=Math.round(t-prev);if(ms<500)throw Error('Lap too short');
  this.laps.push(ms);return ms;}
 result(){return {elapsedMs:Math.round(this.elapsed()),laps:this.laps.length,lapTimes:[...this.laps]};}
}
