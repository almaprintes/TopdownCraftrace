import { RaceScene as CurrentRaceScene } from './RaceCarAudioScene.js';
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
  if(type==='concrete')return 10;
  if(type==='guardrail')return 8;
  return 9;
}

function incomingNormal(s,moveX,moveY,px,py){
  const sx=s.bx-s.ax,sy=s.by-s.ay,sl=Math.hypot(sx,sy)||1;
  let nx=-sy/sl,ny=sx/sl;
  const moveLen=Math.hypot(moveX,moveY);
  if(moveLen>.25){
    // The collision normal must face the side the car came from. This is what
    // prevents a fast car from appearing on the far side of a thin barrier.
    if(moveX*nx+moveY*ny>0){nx=-nx;ny=-ny;}
  }else{
    const q=closestPoint(px,py,s.ax,s.ay,s.bx,s.by);
    if((px-q.x)*nx+(py-q.y)*ny<0){nx=-nx;ny=-ny;}
  }
  return{nx,ny};
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    const trackId=String(this.trackKey||data?.trackKey||this.track?.id||this.track?.key||'').trim();
    const env=createTrackEnvironment(trackId);
    this._linearBarrierSegments=[];
    this._barrierPrevPositions=new WeakMap();
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
      const currentX=Number(car.x)||0,currentY=Number(car.y)||0;
      const prev=this._barrierPrevPositions.get(car)||{x:currentX,y:currentY};
      const moveX=currentX-prev.x,moveY=currentY-prev.y;
      const travel=Math.hypot(moveX,moveY);
      const shortSide=Math.min(Number(car.displayWidth||28),Number(car.displayHeight||28));
      const carRadius=clamp(shortSide*.38,9,16);

      // Sweep the complete path travelled since the previous frame. Checking only
      // the final position allows a fast car to jump from one side of a thin wall
      // to the other without ever overlapping it.
      const steps=clamp(Math.ceil(travel/4),1,18);
      let hit=false;
      for(let step=1;step<=steps&&!hit;step++){
        const t=step/steps;
        const px=prev.x+moveX*t,py=prev.y+moveY*t;
        for(const s of segments){
          const q=closestPoint(px,py,s.ax,s.ay,s.bx,s.by);
          const dx=px-q.x,dy=py-q.y;
          const dist=Math.hypot(dx,dy);
          const minDist=carRadius+s.halfWidth;
          if(dist>=minDist)continue;

          const {nx,ny}=incomingNormal(s,moveX,moveY,px,py);
          car.x=q.x+nx*(minDist+1.0);
          car.y=q.y+ny*(minDist+1.0);

          const vn=(Number(vel.x)||0)*nx+(Number(vel.y)||0)*ny;
          if(vn<0){
            const restitution=.12;
            vel.x-=(1+restitution)*vn*nx;
            vel.y-=(1+restitution)*vn*ny;
          }
          // A hard barrier should cost speed instead of behaving like a pinball wall.
          vel.x*=.78;vel.y*=.78;
          hit=true;
          break;
        }
      }

      if(car===this.carBody&&this.carRig?.scene){
        this.carRig.x=car.x;this.carRig.y=car.y;
      }
      this._barrierPrevPositions.set(car,{x:Number(car.x)||0,y:Number(car.y)||0});
    }
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._resolveLinearBarrierCollisions();
    return result;
  }
}
