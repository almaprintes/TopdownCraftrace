const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function validPlan(plan,n){
  return !!plan&&Array.isArray(plan.offsets)&&plan.offsets.length===n&&plan.offsets.every(Number.isFinite);
}

function clonePlan(plan){
  return plan?{...plan,offsets:Array.isArray(plan.offsets)?plan.offsets.slice():[]}:null;
}

export function createRaceAiLapLearner({baseProfile,trackModel,saved=null}={}){
  const samples=Array.isArray(baseProfile?.samples)?baseProfile.samples:[];
  const center=Array.isArray(trackModel?.centerline)?trackModel.centerline:[];
  const n=samples.length;
  if(!baseProfile?.valid||!trackModel?.valid||n<8||center.length!==n)return null;

  const frames=samples.map((_,i)=>{
    const a=center[(i-2+n)%n]||samples[(i-2+n)%n];
    const b=center[(i+2)%n]||samples[(i+2)%n];
    const dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y);
    const len=Math.max(.001,Math.hypot(dx,dy));
    return{nx:-dy/len,ny:dx/len};
  });

  const storedBest=validPlan(saved?.bestPlan,n)?clonePlan(saved.bestPlan):null;
  const storedTeacher=validPlan(saved?.teacherPlan,n)?clonePlan(saved.teacherPlan):null;
  const bestBlend=clamp(Number(saved?.bestCpuBlend||0),0,.72);

  return{
    n,frames,
    teacherLapNo:0,
    teacherBestLapMs:Number.isFinite(Number(saved?.teacherBestLapMs))?Number(saved.teacherBestLapMs):null,
    pendingPlan:null,
    activePlan:storedBest||storedTeacher,
    bestCpuPlan:storedBest,
    currentBlend:(storedBest||storedTeacher)?bestBlend:0,
    bestCpuLapMs:Number.isFinite(Number(saved?.bestLapMs))?Number(saved.bestLapMs):null,
    bestCpuBlend:bestBlend,
    adaptiveCap:clamp(Number(saved?.adaptiveCap||Math.max(.34,bestBlend+.08)),.28,.72),
    regressionCount:Number(saved?.regressionCount||0),
    explorationStep:Math.max(0,Number(saved?.explorationStep||0)|0),
    nearestIndex:0,
    sums:new Array(n).fill(0),
    counts:new Array(n).fill(0),
    unique:0,
    lastDecision:'BASE'
  };
}

export function resetRaceAiTeacherBuffer(state){
  if(!state)return;
  state.sums.fill(0);state.counts.fill(0);state.unique=0;
}

export function recordRaceAiTeacherSample(state,{baseProfile,trackModel,x,y,speed,onTrack=true,armed=true}={}){
  if(!state||!armed||!onTrack||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(speed)||speed<12)return;
  const base=baseProfile?.samples;
  if(!Array.isArray(base)||base.length!==state.n)return;
  const n=state.n,origin=Number.isInteger(state.nearestIndex)?state.nearestIndex:0;
  let best=origin,bestD=Infinity;
  for(let d=-28;d<=42;d++){
    const i=((origin+d)%n+n)%n,p=base[i];
    const q=(Number(p.x)-x)**2+(Number(p.y)-y)**2;
    if(q<bestD){bestD=q;best=i;}
  }
  if(bestD>180*180){
    bestD=Infinity;
    for(let i=0;i<n;i++){
      const p=base[i],q=(Number(p.x)-x)**2+(Number(p.y)-y)**2;
      if(q<bestD){bestD=q;best=i;}
    }
  }
  state.nearestIndex=best;
  const center=trackModel.centerline[best],frame=state.frames[best];
  const limit=Math.max(4,Number(trackModel.limits?.[best]||45));
  const offset=clamp((x-Number(center.x))*frame.nx+(y-Number(center.y))*frame.ny,-limit*.96,limit*.96);
  if(!state.counts[best])state.unique++;
  state.sums[best]+=offset;state.counts[best]++;
}

export function finalizeRaceAiTeacherLap(state,{baseProfile,trackModel,lapMs}={}){
  if(!state)return{accepted:false};
  const coverage=state.unique/Math.max(1,state.n);
  const valid=Number.isFinite(lapMs)&&lapMs>10000&&lapMs<180000&&coverage>=.58;
  state.teacherLapNo++;
  let accepted=false,plan=null;
  if(valid&&(state.teacherBestLapMs==null||lapMs<state.teacherBestLapMs-25)){
    const raw=state.counts.map((count,i)=>count?state.sums[i]/count:null);
    const fill=raw.map((value,i)=>{
      if(Number.isFinite(value))return value;
      for(let d=1;d<=18;d++){
        const before=raw[(i-d+state.n)%state.n],after=raw[(i+d)%state.n];
        if(Number.isFinite(before)&&Number.isFinite(after))return(before+after)*.5;
        if(Number.isFinite(before))return before;
        if(Number.isFinite(after))return after;
      }
      const p=baseProfile.samples[i],c=trackModel.centerline[i],f=state.frames[i];
      return(Number(p.x)-Number(c.x))*f.nx+(Number(p.y)-Number(c.y))*f.ny;
    });
    let offsets=fill;
    for(let pass=0;pass<3;pass++){
      const copy=offsets.slice();
      offsets=offsets.map((_,i)=>(copy[(i-2+state.n)%state.n]+2*copy[(i-1+state.n)%state.n]+4*copy[i]+2*copy[(i+1)%state.n]+copy[(i+2)%state.n])/10);
    }
    offsets=offsets.map((v,i)=>clamp(v,-Math.max(4,Number(trackModel.limits?.[i]||45))*.96,Math.max(4,Number(trackModel.limits?.[i]||45))*.96));
    state.teacherBestLapMs=lapMs;
    plan={offsets,lapMs,coverage,lapNo:state.teacherLapNo};
    state.pendingPlan=plan;
    state.explorationStep=0;
    accepted=true;
  }
  resetRaceAiTeacherBuffer(state);
  return{accepted,plan,coverage};
}

export function observeRaceAiCpuLap(state,lapMs){
  if(!state||!Number.isFinite(lapMs)||lapMs<=1000)return{decision:'INVALID'};
  const blend=clamp(Number(state.currentBlend||0),0,.72);
  const previousBest=state.bestCpuLapMs;
  if(previousBest==null||lapMs<previousBest-20){
    state.bestCpuLapMs=lapMs;
    state.bestCpuBlend=blend;
    if(state.activePlan)state.bestCpuPlan=clonePlan(state.activePlan);
    state.adaptiveCap=Math.min(.72,Math.max(.34,blend+.08));
    state.explorationStep=0;
    state.lastDecision=previousBest==null?'BASELINE':'ACCEPT';
    return{decision:state.lastDecision,bestLapMs:state.bestCpuLapMs,bestBlend:state.bestCpuBlend};
  }
  if(Math.abs(blend-state.bestCpuBlend)>.035&&lapMs>previousBest+50){
    state.regressionCount++;
    if(state.bestCpuPlan)state.activePlan=clonePlan(state.bestCpuPlan);
    state.currentBlend=state.bestCpuBlend;
    state.adaptiveCap=Math.max(.28,state.bestCpuBlend);
    state.lastDecision='ROLLBACK';
    return{decision:'ROLLBACK',bestLapMs:previousBest,bestBlend:state.bestCpuBlend};
  }
  state.lastDecision='HOLD';
  return{decision:'HOLD',bestLapMs:previousBest,bestBlend:state.bestCpuBlend};
}

function nextExplorationBlend(state){
  const best=clamp(Number(state.bestCpuBlend||0),0,.72);
  // Explora alrededor del mejor valor conocido. Una sola variante por vuelta,
  // siempre fija durante toda la vuelta para evitar oscilaciones de dirección.
  const deltas=[-.06,.04,-.12,-.03,.08,-.09,.02];
  for(let tries=0;tries<deltas.length;tries++){
    const index=(state.explorationStep+tries)%deltas.length;
    const candidate=clamp(best+deltas[index],.20,.72);
    if(Math.abs(candidate-best)>=.015){
      state.explorationStep=(index+1)%deltas.length;
      return candidate;
    }
  }
  return best;
}

export function activateRaceAiPlanForNextLap(state){
  if(!state)return{active:false};
  const replaced=!!state.pendingPlan;
  if(state.pendingPlan){
    state.activePlan=state.pendingPlan;
    state.pendingPlan=null;
    // Una nueva mejor vuelta humana merece una prueba propia, pero no saltamos
    // a una intensidad arbitraria distinta en mitad del aprendizaje.
    state.currentBlend=clamp(Math.max(.34,state.bestCpuBlend||.34),.20,.72);
    state.explorationStep=0;
  }
  if(!state.activePlan){state.currentBlend=0;return{active:false,replaced:false,blend:0};}

  if(!replaced){
    if(state.lastDecision==='ROLLBACK'){
      state.currentBlend=state.bestCpuBlend;
    }else if(state.lastDecision==='HOLD'){
      state.currentBlend=nextExplorationBlend(state);
    }else{
      state.currentBlend=Math.min(.72,state.adaptiveCap);
    }
  }
  return{active:true,replaced,blend:state.currentBlend,teacherLap:state.activePlan.lapNo||0};
}

export function applyRaceAiPlanToProfile(state,{baseProfile,trackModel,workingProfile}={}){
  if(!state||!workingProfile?.samples||!baseProfile?.samples)return workingProfile;
  const blend=clamp(Number(state.currentBlend||0),0,.72);
  const plan=state.activePlan;
  for(let i=0;i<state.n;i++){
    const out=workingProfile.samples[i],source=baseProfile.samples[i];
    if(!out||!source)continue;
    if(plan&&Number.isFinite(plan.offsets?.[i])&&blend>0){
      const c=trackModel.centerline[i],f=state.frames[i];
      const taughtX=Number(c.x)+f.nx*plan.offsets[i];
      const taughtY=Number(c.y)+f.ny*plan.offsets[i];
      out.x=Number(source.x)+(taughtX-Number(source.x))*blend;
      out.y=Number(source.y)+(taughtY-Number(source.y))*blend;
    }else{
      out.x=Number(source.x);out.y=Number(source.y);
    }
    out.targetSpeed=Number(source.targetSpeed);
    if(Number.isFinite(source.maneuverTargetSpeed))out.maneuverTargetSpeed=Number(source.maneuverTargetSpeed);
  }
  return workingProfile;
}

export function raceAiLearnerPersistence(state){
  if(!state)return{};
  return{
    bestLapMs:state.bestCpuLapMs,
    bestCpuBlend:state.bestCpuBlend,
    adaptiveCap:state.adaptiveCap,
    regressionCount:state.regressionCount,
    explorationStep:state.explorationStep,
    teacherBestLapMs:state.teacherBestLapMs,
    teacherPlan:clonePlan(state.pendingPlan||state.activePlan),
    bestPlan:clonePlan(state.bestCpuPlan)
  };
}
