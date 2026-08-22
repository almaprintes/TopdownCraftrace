// src/game/ai/trackManeuverPlanner.js
// Fase 3B: convierte curvatura local en secuencias conducibles comprometidas.

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mod=(i,n)=>((i%n)+n)%n;

function smoothCurvature(samples){
  const n=samples.length,raw=samples.map(s=>Number(s?.curvature||0));
  return raw.map((_,i)=>(
    raw[mod(i-2,n)]+2*raw[mod(i-1,n)]+3*raw[i]+
    2*raw[(i+1)%n]+raw[(i+2)%n]
  )/9);
}

function chooseQuietBreak(signs){
  const n=signs.length;let origin=0,best=-1;
  for(let i=0;i<n;i++){
    if(signs[i])continue;
    let len=0;while(len<n&&!signs[(i+len)%n])len++;
    if(len>best){best=len;origin=(i+len)%n;}
    i+=Math.max(0,len-1);
  }
  return origin;
}

export function buildTrackManeuverPlan(profile,options={}){
  const samples=Array.isArray(profile?.samples)?profile.samples:[];
  const n=samples.length;
  if(!profile?.valid||n<8)return{valid:false,reason:'invalid_speed_profile',samples:[],maneuvers:[],maneuverMetrics:{}};

  const threshold=clamp(Number(options.curvatureThreshold||.006),.003,.03);
  const curve=smoothCurvature(samples);
  const signs=curve.map(v=>Math.abs(v)>=threshold?Math.sign(v):0);
  const origin=chooseQuietBreak(signs),lobes=[];
  let u=0;
  while(u<n){
    const sign=signs[mod(origin+u,n)];
    if(!sign){u++;continue;}
    const start=u;let energy=0,peak=0;
    while(u<n&&signs[mod(origin+u,n)]===sign){
      const amount=Math.abs(curve[mod(origin+u,n)]);
      energy+=amount;peak=Math.max(peak,amount);u++;
    }
    lobes.push({start,end:u-1,sign,energy,peak});
  }

  const maneuvers=[];
  for(let i=0;i<lobes.length-1;i++){
    const first=lobes[i],second=lobes[i+1];
    const gap=second.start-first.end-1;
    const span=second.end-first.start+1;
    const low=Math.min(first.energy,second.energy);
    const high=Math.max(first.energy,second.energy);
    const balance=low/Math.max(.001,high);
    if(first.sign===second.sign||gap>5||span>24||low<.035||balance<.28)continue;
    const approach=clamp(Math.round(Number(options.approachSamples||5)),3,8);
    const release=clamp(Math.round(Number(options.releaseSamples||4)),3,8);
    maneuvers.push({
      id:maneuvers.length+1,type:'linked',
      start:first.start-approach,end:second.end+release,
      target:second.end+release,
      lobeCount:2,energy:first.energy+second.energy,balance
    });
    i++;
  }

  const planned=samples.map(s=>({...s,
    maneuverId:0,maneuverType:null,maneuverTargetIndex:null,
    maneuverPhase:null,maneuverRisk:0
  }));
  for(const maneuver of maneuvers){
    const length=Math.max(1,maneuver.end-maneuver.start);
    for(let step=maneuver.start;step<=maneuver.end;step++){
      const index=mod(origin+step,n);
      planned[index]={...planned[index],
        maneuverId:maneuver.id,
        maneuverType:maneuver.type,
        maneuverTargetIndex:mod(origin+maneuver.target,n),
        maneuverPhase:clamp((step-maneuver.start)/length,0,1),
        maneuverRisk:clamp(.22+maneuver.balance*.13,0,.35)
      };
    }
    maneuver.startIndex=mod(origin+maneuver.start,n);
    maneuver.endIndex=mod(origin+maneuver.end,n);
    maneuver.targetIndex=mod(origin+maneuver.target,n);
    delete maneuver.start;delete maneuver.end;delete maneuver.target;
  }

  const linkedSamples=planned.filter(s=>s.maneuverId).length;
  return{...profile,valid:true,reason:null,samples:planned,maneuvers,
    maneuverMetrics:{
      count:maneuvers.length,linkedSamples,
      linkedFraction:linkedSamples/n,
      maxEnergy:maneuvers.length?Math.max(...maneuvers.map(m=>m.energy)):0
    }
  };
}
