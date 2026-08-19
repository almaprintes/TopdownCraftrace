import { RaceScene as CurrentRaceScene } from './RaceAuthoredEnvironmentScene.js';
import { createTrackEnvironment, hasTrackEnvironment } from '../tracks/environmentRegistry.js';

function trackId(scene){return String(scene?.trackKey||scene?.track?.id||scene?.track?.key||'');}
function control(s){return{x:Number.isFinite(+s.cpx)?+s.cpx:(+s.x1 + +s.x2)/2,y:Number.isFinite(+s.cpy)?+s.cpy:(+s.y1 + +s.y2)/2};}
function qp(s,t){const c=control(s),m=1-t;return{x:m*m*(+s.x1)+2*m*t*c.x+t*t*(+s.x2),y:m*m*(+s.y1)+2*m*t*c.y+t*t*(+s.y2)};}
function qt(s,t){const c=control(s);return{x:2*(1-t)*(c.x-(+s.x1))+2*t*((+s.x2)-c.x),y:2*(1-t)*(c.y-(+s.y1))+2*t*((+s.y2)-c.y)};}
function dot(a,b){return a.x*b.x+a.y*b.y;}
function norm(v){const d=Math.hypot(v.x,v.y)||1;return{x:v.x/d,y:v.y/d};}
function segCross(a,b,c,d){
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
  return ((ab1===0||ab2===0||ab1*ab2<0)&&(cd1===0||cd2===0||cd1*cd2<0));
}

function buildPaddockGate(scene){
  if(trackId(scene)!=='karting-tenerife'||!hasTrackEnvironment('karting-tenerife'))return null;
  const data=createTrackEnvironment('karting-tenerife');
  const finish=scene.finishLine||scene.track?.meta?.finishLine||scene.track?.meta?.finish;
  if(!finish?.a||!finish?.b)return null;

  const mid={x:(finish.a.x+finish.b.x)/2,y:(finish.a.y+finish.b.y)/2};
  let normal=finish.normal?norm(finish.normal):null;
  if(!normal){const g={x:finish.b.x-finish.a.x,y:finish.b.y-finish.a.y};normal=norm({x:-g.y,y:g.x});}
  const gateDir=norm({x:finish.b.x-finish.a.x,y:finish.b.y-finish.a.y});

  // Choose authored asphalt lane distinct from the main circuit and closest to the finish plane.
  let best=null;
  for(const s of data?.surfaces||[]){
    if(s?.visual!=='asphalt')continue;
    for(let i=0;i<=160;i++){
      const t=i/160,p=qp(s,t),plane=Math.abs(dot({x:p.x-mid.x,y:p.y-mid.y},normal));
      const side=Math.hypot(p.x-mid.x,p.y-mid.y);
      // Paddock must be clearly away from the original finish centre.
      if(side<90)continue;
      const score=plane+side*0.004;
      if(!best||score<best.score)best={s,t,p,score};
    }
  }
  if(!best||best.score>45)return null;

  // Refine nearest point to the finish plane around the coarse sample.
  let lo=Math.max(0,best.t-.03),hi=Math.min(1,best.t+.03);
  for(let k=0;k<18;k++){
    const t1=lo+(hi-lo)/3,t2=hi-(hi-lo)/3;
    const f=t=>Math.abs(dot({x:qp(best.s,t).x-mid.x,y:qp(best.s,t).y-mid.y},normal));
    if(f(t1)<f(t2))hi=t2;else lo=t1;
  }
  const t=(lo+hi)/2,p=qp(best.s,t),v=qt(best.s,t);
  // Project exactly onto the original finish plane so both gates are at the same lap position.
  const off=dot({x:p.x-mid.x,y:p.y-mid.y},normal);
  const center={x:p.x-normal.x*off,y:p.y-normal.y*off};
  const width=Math.max(24,Math.min(Number(best.s.width)||60,72));
  const half=width*.43;
  return {
    a:{x:center.x-gateDir.x*half,y:center.y-gateDir.y*half},
    b:{x:center.x+gateDir.x*half,y:center.y+gateDir.y*half},
    normal:{...normal},
    center,
    sourceSurface:best.s
  };
}

export class RaceScene extends CurrentRaceScene{
  create(){
    super.create();
    if(trackId(this)!=='karting-tenerife')return;
    this.time.delayedCall(120,()=>this._installPaddockFinish());
  }

  _installPaddockFinish(){
    const gate=buildPaddockGate(this);if(!gate)return;
    this._paddockFinishGate=gate;
    this._paddockFinishG?.destroy?.();
    const g=this.add.graphics().setDepth(18);
    // Simple white mini finish line, deliberately different from the chequered main finish.
    g.lineStyle(5,0xffffff,.95);g.beginPath();g.moveTo(gate.a.x,gate.a.y);g.lineTo(gate.b.x,gate.b.y);g.strokePath();
    this.uiCam?.ignore?.(g);this._paddockFinishG=g;
    this.events.once('shutdown',()=>{try{g.destroy();}catch{}});
  }

  update(time,delta){
    const gate=this._paddockFinishGate;
    const car=this.carBody||this.car;
    if(!gate||!car){super.update(time,delta);return;}

    const prev={x:Number(this.prevCarX ?? this._prevCarPos?.x ?? car.x),y:Number(this.prevCarY ?? this._prevCarPos?.y ?? car.y)};
    const now={x:Number(car.x),y:Number(car.y)};
    const crosses=segCross(prev,now,gate.a,gate.b);
    if(!crosses){super.update(time,delta);return;}

    const visual=this.finishLine,meta=this.track?.meta,mfl=meta?.finishLine,mf=meta?.finish;
    try{
      this.finishLine=gate;
      if(meta&&mfl)meta.finishLine=gate;
      if(meta&&mf)meta.finish=gate;
      super.update(time,delta);
    }finally{
      this.finishLine=visual;
      if(meta&&mfl)meta.finishLine=mfl;
      if(meta&&mf)meta.finish=mf;
    }
  }
}
