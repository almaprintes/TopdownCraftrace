import { RaceScene as CurrentRaceScene } from './RaceKartingCanariasSurfaceFixScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function pt(raw){
  if(Array.isArray(raw))return {x:Number(raw[0]),y:Number(raw[1])};
  return {x:Number(raw?.x),y:Number(raw?.y)};
}

export class RaceScene extends CurrentRaceScene {
  _initSurvival(){
    super._initSurvival();
    for(const b of this._survivalBots||[]){
      if(!Number.isFinite(b._trafficNominalLane))b._trafficNominalLane=Number(b.baseLane||0);
      b._trafficLane=Number(b.baseLane||0);
      b._trafficSide=(Math.sign(Number(b.baseLane||0))||((Math.random()<.5)?-1:1));
    }
  }

  _trafficPlayerState(){
    if(!this.carBody?.scene)return null;
    const x=Number(this.carBody.x),y=Number(this.carBody.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    const raw=this._survivalCenterline?.()||[];
    if(raw.length<2)return null;

    let bestD2=Infinity,bestLane=0;
    for(let i=0;i<raw.length;i++){
      const a=pt(raw[i]),b=pt(raw[(i+1)%raw.length]);
      if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(b.x)||!Number.isFinite(b.y))continue;
      const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;if(l2<1e-6)continue;
      const t=clamp(((x-a.x)*vx+(y-a.y)*vy)/l2,0,1);
      const qx=a.x+vx*t,qy=a.y+vy*t,dx=x-qx,dy=y-qy,d2=dx*dx+dy*dy;
      if(d2<bestD2){
        bestD2=d2;
        const len=Math.sqrt(l2),nx=-vy/len,ny=vx/len;
        bestLane=dx*nx+dy*ny;
      }
    }
    return {id:'TÚ',progress:Number(this._survivalPlayerRaceDistance?.()||0),lane:bestLane,player:true};
  }

  _applySurvivalTrafficAvoidance(deltaMs){
    const bots=(this._survivalBots||[]).filter(b=>b?.active);
    if(!this._survivalMode||!this._raceStarted||!bots.length)return [];

    const dt=clamp(Number(deltaMs||16.67)/1000,0.001,0.05);
    const player=this._trafficPlayerState();
    const entries=bots.map(b=>({id:b.id,progress:Number(b.absProgress||0),lane:Number(b._trafficLane??b.baseLane??0),bot:b}));
    if(player)entries.push(player);

    const saved=[];
    for(const b of bots){
      if(!Number.isFinite(b._trafficNominalLane))b._trafficNominalLane=Number(b.baseLane||0);
      if(!Number.isFinite(b._trafficLane))b._trafficLane=Number(b.baseLane||0);
      const meP=Number(b.absProgress||0),meLane=Number(b._trafficLane||0);
      const trackW=Math.max(80,Number(b.trackW||this.track?.meta?.trackWidth||140));
      const safeLane=Math.max(16,Math.min(trackW*.20,34));
      const maxLane=Math.max(safeLane,trackW*.34);
      const warnGap=.030;
      const panicGap=.014;

      let nearest=null;
      for(const e of entries){
        if(e.bot===b)continue;
        let gap=Number(e.progress)-meP;
        if(gap<-0.5)gap+=1;
        if(gap>0.5)gap-=1;
        if(gap<=0||gap>warnGap)continue;
        const latGap=Math.abs(Number(e.lane||0)-meLane);
        if(latGap>safeLane*1.7)continue;
        if(!nearest||gap<nearest.gap)nearest={...e,gap,latGap};
      }

      let target=Number(b._trafficNominalLane||0);
      let speedScale=1;
      if(nearest){
        const otherLane=Number(nearest.lane||0);
        let side=Math.sign(meLane-otherLane);
        if(!side)side=Number(b._trafficSide||1);
        b._trafficSide=side;
        target=clamp(otherLane+side*safeLane*1.35,-maxLane,maxLane);
        const urgency=clamp((warnGap-nearest.gap)/(warnGap-panicGap),0,1);
        speedScale=1-(0.12+0.46*urgency);
        if(nearest.gap<panicGap)speedScale=Math.min(speedScale,.42);
      }else{
        // Side-by-side cars still repel gently so they do not merge into one sprite.
        for(const e of entries){
          if(e.bot===b)continue;
          let gap=Math.abs(Number(e.progress)-meP);gap=Math.min(gap,Math.abs(gap-1));
          const lat=Number(e.lane||0)-meLane;
          if(gap<.010&&Math.abs(lat)<safeLane){
            const side=Math.sign(-lat)||Number(b._trafficSide||1);
            target=clamp(meLane+side*safeLane*.75,-maxLane,maxLane);
            speedScale=Math.min(speedScale,.86);
            break;
          }
        }
      }

      const laneLerp=nearest?clamp(dt*5.5,0,1):clamp(dt*1.8,0,1);
      b._trafficLane+=(target-b._trafficLane)*laneLerp;
      saved.push({b,targetRate:b.targetRate,baseLane:b.baseLane});
      b.baseLane=b._trafficLane;
      b.targetRate=Number(b.targetRate||0)*speedScale;
    }
    return saved;
  }

  _restoreSurvivalTraffic(saved){
    for(const s of saved||[]){
      s.b.targetRate=s.targetRate;
      // Keep the smoothed traffic lane as the base for the next frame; the nominal
      // lane is stored separately and is where the car gradually returns when clear.
      s.b.baseLane=Number(s.b._trafficLane||s.baseLane||0);
    }
  }

  _updateSurvivalBots(deltaMs){
    const saved=this._applySurvivalTrafficAvoidance(deltaMs);
    try{return super._updateSurvivalBots(deltaMs);}finally{this._restoreSurvivalTraffic(saved);}
  }
}
