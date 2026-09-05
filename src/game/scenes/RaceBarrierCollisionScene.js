import { RaceScene as CurrentRaceScene } from './RaceCarAudioScene.js';
import { createTrackEnvironment, getTrackEnvironmentKeys } from '../tracks/environmentRegistry.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function closestPoint(px,py,ax,ay,bx,by){
  const abx=bx-ax,aby=by-ay;
  const len2=abx*abx+aby*aby;
  if(len2<1e-6)return{x:ax,y:ay,t:0};
  const t=clamp(((px-ax)*abx+(py-ay)*aby)/len2,0,1);
  return{x:ax+abx*t,y:ay+aby*t,t};
}

function cross(ax,ay,bx,by){return ax*by-ay*bx;}

// Exact segment/segment crossing. Returns the fraction travelled by the car.
function movementCrossing(px,py,qx,qy,ax,ay,bx,by){
  const rx=qx-px,ry=qy-py,sx=bx-ax,sy=by-ay;
  const den=cross(rx,ry,sx,sy);
  if(Math.abs(den)<1e-8)return null;
  const apx=ax-px,apy=ay-py;
  const t=cross(apx,apy,sx,sy)/den;
  const u=cross(apx,apy,rx,ry)/den;
  if(t<0||t>1||u<0||u>1)return null;
  return t;
}

function barrierHalfWidth(barrier){
  const thickness=Number(barrier?.thickness);
  if(Number.isFinite(thickness)&&thickness>0)return clamp(thickness*.5,7,32);
  const type=String(barrier?.type||'');
  if(type==='concrete')return 13;
  if(type==='guardrail')return 10;
  return 11;
}

function envForRace(scene,data){
  const raw=[
    scene?.trackKey,
    data?.trackKey,
    scene?.track?.id,
    scene?.track?.key,
    data?.track?.id,
    data?.track?.key,
    scene?.selectedTrackId,
    scene?._trackId
  ];
  const candidates=[];
  for(const value of raw){
    const id=String(value??'').trim();
    if(id&&!candidates.includes(id))candidates.push(id);
  }
  const keys=getTrackEnvironmentKeys?.()||[];
  for(const id of candidates){
    const env=createTrackEnvironment(id);
    if(env)return{id,env,candidates,keys};
    const exact=keys.find(k=>String(k).toLowerCase()===id.toLowerCase());
    if(exact){const matched=createTrackEnvironment(exact);if(matched)return{id:exact,env:matched,candidates,keys};}
  }
  return{id:'',env:null,candidates,keys};
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    const resolved=envForRace(this,data);
    const env=resolved.env;
    this._linearBarrierSegments=[];
    this._linearBarrierPrevPositions=new WeakMap();
    for(const barrier of env?.linearBarriers||[]){
      const pts=Array.isArray(barrier?.points)?barrier.points:[];
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        if(!Number.isFinite(Number(a?.x))||!Number.isFinite(Number(a?.y))||!Number.isFinite(Number(b?.x))||!Number.isFinite(Number(b?.y)))continue;
        const ax=Number(a.x),ay=Number(a.y),bx=Number(b.x),by=Number(b.y);
        const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
        this._linearBarrierSegments.push({
          ax,ay,bx,by,
          nx:-dy/len,ny:dx/len,
          halfWidth:barrierHalfWidth(barrier)
        });
      }
    }
    console.info('[TDR barriers]',{environment:resolved.id,candidates:resolved.candidates,registry:resolved.keys,segments:this._linearBarrierSegments.length});
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

  _placeBarrierBody(car,x,y){
    if(typeof car.setPosition==='function')car.setPosition(x,y);
    else{car.x=x;car.y=y;}
    try{car.body?.updateFromGameObject?.();}catch{}
    if(car===this.carBody&&this.carRig?.scene){this.carRig.x=x;this.carRig.y=y;}
  }

  _removeInwardVelocity(car,nx,ny){
    const vel=car.body.velocity;
    const vn=(Number(vel.x)||0)*nx+(Number(vel.y)||0)*ny;
    // Remove the normal component completely. Tangential motion is retained so
    // the car can scrape/slide along the barrier but can never drive through it.
    vel.x-=vn*nx;
    vel.y-=vn*ny;
    vel.x*=.82;vel.y*=.82;
  }

  _resolveLinearBarrierCollisions(){
    const segments=this._linearBarrierSegments;
    if(!segments?.length)return;
    const prevMap=this._linearBarrierPrevPositions||(this._linearBarrierPrevPositions=new WeakMap());

    for(const car of this._barrierCollisionBodies()){
      const nowX=Number(car.x)||0,nowY=Number(car.y)||0;
      const stored=prevMap.get(car);
      if(!stored){prevMap.set(car,{x:nowX,y:nowY});continue;}
      const prevX=stored.x,prevY=stored.y;
      const shortSide=Math.min(Number(car.displayWidth||28),Number(car.displayHeight||28));
      const carRadius=clamp(shortSide*.36,9,16);

      let earliest=null;
      for(const s of segments){
        // Absolute anti-tunnelling guard: a centre-line crossing is caught
        // mathematically, regardless of speed, frame time or travelled distance.
        const t=movementCrossing(prevX,prevY,nowX,nowY,s.ax,s.ay,s.bx,s.by);
        if(t!=null&&(!earliest||t<earliest.t))earliest={t,s,crossing:true};

        // Capsule overlap catches contact with the visible physical thickness
        // before the car centre reaches the barrier centre line.
        const q=closestPoint(nowX,nowY,s.ax,s.ay,s.bx,s.by);
        const dx=nowX-q.x,dy=nowY-q.y,dist=Math.hypot(dx,dy);
        const minDist=carRadius+s.halfWidth;
        if(dist<minDist&&(!earliest||1<earliest.t))earliest={t:1,s,crossing:false,q,dist,minDist};
      }

      if(earliest){
        const s=earliest.s;
        let nx=s.nx,ny=s.ny;
        // Always push back toward the side occupied in the previous safe frame.
        const prevSide=(prevX-s.ax)*nx+(prevY-s.ay)*ny;
        if(prevSide<0){nx=-nx;ny=-ny;}

        let x,y;
        if(earliest.crossing){
          const contactT=clamp(earliest.t-.002,0,1);
          const cx=prevX+(nowX-prevX)*contactT;
          const cy=prevY+(nowY-prevY)*contactT;
          const q=closestPoint(cx,cy,s.ax,s.ay,s.bx,s.by);
          const clearance=carRadius+s.halfWidth+1.5;
          x=q.x+nx*clearance;y=q.y+ny*clearance;
        }else{
          const q=earliest.q;
          const clearance=earliest.minDist+1.5;
          x=q.x+nx*clearance;y=q.y+ny*clearance;
        }

        this._placeBarrierBody(car,x,y);
        this._removeInwardVelocity(car,nx,ny);
      }

      prevMap.set(car,{x:Number(car.x)||0,y:Number(car.y)||0});
    }
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._resolveLinearBarrierCollisions();
    return result;
  }
}
