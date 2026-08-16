import { RaceScene as CurrentRaceScene } from './RaceSurvivalReliableScene.js';

function isKartingCanarias(scene){
  const key=String(scene?.trackKey||'').toLowerCase();
  const name=String(scene?.track?.meta?.name||scene?.track?.name||'').toLowerCase();
  return key.includes('karting-canarias')||key.includes('karting_canarias')||name.includes('karting canarias');
}

function xyw(raw, fallbackW){
  if(Array.isArray(raw)){
    const x=Number(raw[0]),y=Number(raw[1]),w=Number(raw[2]);
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y,w:Number.isFinite(w)&&w>20?w:fallbackW}:null;
  }
  const x=Number(raw?.x),y=Number(raw?.y),w=Number(raw?.width);
  return Number.isFinite(x)&&Number.isFinite(y)?{x,y,w:Number.isFinite(w)&&w>20?w:fallbackW}:null;
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    if(!isKartingCanarias(this))return result;

    // Karting Canarias has a few tiny holes/seams in the generated polygon cells.
    // The rendered asphalt is continuous, but the legacy cell test can briefly return
    // GRASS while the car is visibly on the ribbon.  Keep the original geometry test
    // as authority and only add a conservative centerline-ribbon fallback for THIS track.
    const inherited=typeof this._isOnTrack==='function'?this._isOnTrack.bind(this):null;
    this._kcOriginalIsOnTrack=inherited;
    this._isOnTrack=(x,y)=>{
      if(inherited?.(x,y))return true;
      return this._kcAsphaltRibbonContains(Number(x),Number(y));
    };
    return result;
  }

  _kcAsphaltRibbonContains(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    const raw=this.track?.geom?.center||this.track?.meta?.raceCenterline||this.track?.meta?.centerline||[];
    if(!Array.isArray(raw)||raw.length<2)return false;
    const fallbackW=Math.max(80,Number(this.track?.meta?.trackWidth||this.track?.trackWidth||160));

    let bestD2=Infinity,bestHalf=fallbackW*.5;
    const n=raw.length;
    for(let i=0;i<n;i++){
      const a=xyw(raw[i],fallbackW),b=xyw(raw[(i+1)%n],fallbackW);
      if(!a||!b)continue;
      const vx=b.x-a.x,vy=b.y-a.y,len2=vx*vx+vy*vy;
      if(len2<1e-6)continue;
      const t=Math.max(0,Math.min(1,((x-a.x)*vx+(y-a.y)*vy)/len2));
      const qx=a.x+vx*t,qy=a.y+vy*t,dx=x-qx,dy=y-qy,d2=dx*dx+dy*dy;
      if(d2<bestD2){
        bestD2=d2;
        const localW=a.w+(b.w-a.w)*t;
        // 46% of authored width: enough to bridge cell seams but deliberately
        // inside the visible edge, so genuine grass/off-track driving is untouched.
        bestHalf=Math.max(34,localW*.46);
      }
    }
    return bestD2<=bestHalf*bestHalf;
  }
}
