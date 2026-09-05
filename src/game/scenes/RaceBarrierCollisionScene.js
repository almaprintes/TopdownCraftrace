import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';
import { createTrackEnvironment } from '../tracks/environmentRegistry.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function closestPoint(px,py,ax,ay,bx,by){
  const abx=bx-ax,aby=by-ay;
  const len2=abx*abx+aby*aby;
  if(len2<1e-6)return{x:ax,y:ay};
  const t=clamp(((px-ax)*abx+(py-ay)*aby)/len2,0,1);
  return{x:ax+abx*t,y:ay+aby*t};
}

function barrierHalfWidth(type){
  if(type==='concrete')return 8;
  if(type==='guardrail')return 6;
  return 7;
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    const trackId=String(this.trackKey||data?.trackKey||this.track?.id||this.track?.key||'').trim();
    const env=createTrackEnvironment(trackId);
    this._linearBarrierSegments=[];
    for(const barrier of env?.linearBarriers||[]){
      const pts=Array.isArray(barrier?.points)?barrier.points:[];
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        if(!Number.isFinite(Number(a?.x))||!Number.isFinite(Number(a?.y))||!Number.isFinite(Number(b?.x))||!Number.isFinite(Number(b?.y)))continue;
        this._linearBarrierSegments.push({
          ax:Number(a.x),ay:Number(a.y),bx:Number(b.x),by:Number(b.y),
          halfWidth:barrierHalfWidth(String(barrier?.type||''))
        });
      }
    }
    return result;
  }

  _barrierCollisionBodies(){
    const out=[],seen=new Set();
    const add=(v)=>{
      if(!v||seen.has(v)||!v.scene||!v.body?.velocity)return;
      seen.add(v);out.push(v);
    };
    add(this.carBody);
    for(const key of ['cpuCars','aiCars','opponents','racers']){
      const group=this[key];
      if(Array.isArray(group))for(const item of group)add(item?.carBody||item?.bodySprite||item?.sprite||item);
      else if(group?.getChildren)for(const item of group.getChildren())add(item);
    }
    return out;
  }

  _resolveLinearBarrierCollisions(){
    const segments=this._linearBarrierSegments;
    if(!segments?.length)return;
    for(const car of this._barrierCollisionBodies()){
      const vel=car.body.velocity;
      const shortSide=Math.min(Number(car.displayWidth||28),Number(car.displayHeight||28));
      const carRadius=clamp(shortSide*.32,8,14);
      for(const s of segments){
        const q=closestPoint(car.x,car.y,s.ax,s.ay,s.bx,s.by);
        let dx=car.x-q.x,dy=car.y-q.y;
        let dist=Math.hypot(dx,dy);
        const minDist=carRadius+s.halfWidth;
        if(dist>=minDist)continue;
        if(dist<1e-5){
          const sx=s.bx-s.ax,sy=s.by-s.ay,sl=Math.hypot(sx,sy)||1;
          let nx=-sy/sl,ny=sx/sl;
          if((Number(vel.x)||0)*nx+(Number(vel.y)||0)*ny>0){nx=-nx;ny=-ny;}
          dx=nx;dy=ny;dist=1;
        }
        const nx=dx/dist,ny=dy/dist;
        const penetration=minDist-dist+0.6;
        car.x+=nx*penetration;
        car.y+=ny*penetration;
        const vn=(Number(vel.x)||0)*nx+(Number(vel.y)||0)*ny;
        if(vn<0){
          const restitution=.16;
          vel.x-=(1+restitution)*vn*nx;
          vel.y-=(1+restitution)*vn*ny;
          vel.x*=.88;vel.y*=.88;
        }
        if(car===this.carBody&&this.carRig?.scene){
          this.carRig.x=car.x;this.carRig.y=car.y;
        }
      }
    }
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._resolveLinearBarrierCollisions();
    return result;
  }
}
