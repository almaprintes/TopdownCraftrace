import { RaceScene as CurrentRaceScene } from './RaceSurvivalCompetitionScene.js';

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
    // GRASS while the car is visibly on the ribbon. Keep the original geometry test
    // as authority and only add a conservative centerline-ribbon fallback for THIS track.
    const inherited=typeof this._isOnTrack==='function'?this._isOnTrack.bind(this):null;
    this._kcOriginalIsOnTrack=inherited;
    this._isOnTrack=(x,y)=>{
      if(inherited?.(x,y))return true;
      const cl=this.track?.meta?.raceCenterline||this.track?.meta?.centerline||this.track?.raceCenterline||this.track?.centerline;
      if(!Array.isArray(cl)||cl.length<2)return false;
      const fallbackW=Math.max(70,Number(this.track?.meta?.trackWidth||this.track?.trackWidth||125));
      let best=Infinity,bestW=fallbackW;
      for(let i=0;i<cl.length;i++){
        const a=xyw(cl[i],fallbackW),b=xyw(cl[(i+1)%cl.length],fallbackW);if(!a||!b)continue;
        const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;if(len2<1e-6)continue;
        const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/len2));
        const px=a.x+dx*t,py=a.y+dy*t,d2=(x-px)*(x-px)+(y-py)*(y-py);
        if(d2<best){best=d2;bestW=a.w+(b.w-a.w)*t;}
      }
      const half=Math.max(26,bestW*.5-5);
      return best<=half*half;
    };
    return result;
  }
}
