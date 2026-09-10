function finite(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}

function shortestAngle(a,b){
  let d=b-a;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  return d;
}

function buildGhostReference(lapMs,trace){
  const total=finite(lapMs);
  if(!total||total<=0||!Array.isArray(trace)||trace.length<2)return null;
  const clean=[];
  for(const sample of trace){
    const t=finite(sample?.t),x=finite(sample?.x),y=finite(sample?.y),a=finite(sample?.a);
    if(t===null||x===null||y===null||a===null||t<0)continue;
    const last=clean[clean.length-1];
    if(last&&t<=last.t)continue;
    clean.push({t:Math.round(t),x:Number(x.toFixed(2)),y:Number(y.toFixed(2)),a:Number(a.toFixed(5))});
  }
  if(clean.length<2)return null;
  const first=clean[0];
  if(first.t>0)clean.unshift({...first,t:0});
  const last=clean[clean.length-1];
  if(last.t<total)clean.push({...last,t:Math.round(total)});
  else last.t=Math.round(total);
  return clean.length>=3?{lapMs:Math.round(total),trace:clean}:null;
}

function interpolatePose(reference,elapsed){
  const trace=reference?.trace;
  if(!Array.isArray(trace)||trace.length<2)return null;
  const t=Math.max(0,Number(elapsed)||0);
  if(t>Number(reference.lapMs)+30)return null;
  let previous=trace[0];
  if(t<=Number(previous.t))return previous;
  for(let i=1;i<trace.length;i++){
    const next=trace[i];
    const t0=Number(previous.t),t1=Number(next.t);
    if(t<=t1){
      const f=t1>t0?Math.max(0,Math.min(1,(t-t0)/(t1-t0))):1;
      const a0=Number(previous.a),a1=Number(next.a);
      return{
        x:Number(previous.x)+(Number(next.x)-Number(previous.x))*f,
        y:Number(previous.y)+(Number(next.y)-Number(previous.y))*f,
        a:a0+shortestAngle(a0,a1)*f
      };
    }
    previous=next;
  }
  return previous;
}

function hideGhost(scene){
  try{scene._tdrLapGhostSprite?.setVisible?.(false);}catch{}
}

function destroyGhost(scene){
  try{scene._tdrLapGhostSprite?.destroy?.();}catch{}
  scene._tdrLapGhostSprite=null;
}

function ensureGhostSprite(scene){
  const current=scene._tdrLapGhostSprite;
  if(current?.scene)return current;
  const car=scene.carBody;
  const textureKey=String(car?.texture?.key||'');
  if(!car?.scene||!textureKey||textureKey==='__MISSING')return null;
  try{
    const frame=car?.frame?.name;
    const ghost=scene.add.image(Number(car.x)||0,Number(car.y)||0,textureKey,frame);
    ghost.setOrigin?.(Number(car.originX??0.5),Number(car.originY??0.5));
    ghost.setScale?.(Number(car.scaleX)||1,Number(car.scaleY)||1);
    ghost.setFlip?.(!!car.flipX,!!car.flipY);
    ghost.setAlpha?.(0.34);
    ghost.setTint?.(0x78e8ff);
    ghost.setDepth?.((Number(car.depth)||0)-0.05);
    ghost.setVisible?.(false);
    ghost.setName?.('tdr-session-lap-ghost');
    try{scene.uiCam?.ignore?.(ghost);}catch{}
    scene._tdrLapGhostSprite=ghost;
    return ghost;
  }catch{
    return null;
  }
}

function sampleCurrentLap(scene,now){
  const car=scene.carBody;
  const lapStart=finite(scene.timing?.lapStart);
  if(!scene.timing?.started||!scene._raceStarted||lapStart===null||!car?.scene)return;
  if(scene._tdrLapGhostLapStart!==lapStart){
    scene._tdrLapGhostLapStart=lapStart;
    scene._tdrLapGhostCurrentTrace=[];
  }
  const elapsed=Math.max(0,Number(now)-lapStart);
  const x=finite(car.x),y=finite(car.y),a=finite(car.rotation);
  if(x===null||y===null||a===null||!Number.isFinite(elapsed))return;
  const trace=scene._tdrLapGhostCurrentTrace||(scene._tdrLapGhostCurrentTrace=[]);
  const last=trace[trace.length-1];
  if(!last||elapsed-last.t>=32){
    trace.push({t:elapsed,x,y,a});
    if(trace.length>3600)trace.splice(1,1);
  }
}

function renderGhost(scene,now){
  const reference=scene._tdrSessionLapGhostReference;
  const lapStart=finite(scene.timing?.lapStart);
  const paused=scene._tdrPauseMenuOpen===true||!!scene._experiencePauseUi?.root?.isConnected;
  const ending=scene._sessionFinalizing===true||!!scene._sessionReportModal?.isConnected||!!scene._survivalResultDom?.isConnected||!!scene._sessionRewardsDom?.isConnected;
  if(!reference||!scene.timing?.started||!scene._raceStarted||lapStart===null||paused||ending){
    hideGhost(scene);
    return;
  }
  const pose=interpolatePose(reference,Math.max(0,Number(now)-lapStart));
  if(!pose){
    hideGhost(scene);
    return;
  }
  const ghost=ensureGhostSprite(scene);
  if(!ghost)return;
  try{
    const car=scene.carBody;
    if(car?.scene){
      ghost.setScale?.(Number(car.scaleX)||1,Number(car.scaleY)||1);
      ghost.setOrigin?.(Number(car.originX??0.5),Number(car.originY??0.5));
      ghost.setFlip?.(!!car.flipX,!!car.flipY);
      ghost.setDepth?.((Number(car.depth)||0)-0.05);
    }
    ghost.setPosition?.(pose.x,pose.y);
    ghost.setRotation?.(pose.a);
    ghost.setVisible?.(true);
  }catch{}
}

export function installLapGhostRuntime(RaceScene){
  const proto=RaceScene?.prototype;
  if(!proto||proto.__tdrLapGhostRuntimeInstalled)return;
  proto.__tdrLapGhostRuntimeInstalled=true;

  const originalCreate=proto.create;
  const originalUpdate=proto.update;

  proto.create=function(...args){
    this._tdrSessionLapGhostReference=null;
    this._tdrLapGhostCurrentTrace=[];
    this._tdrLapGhostLapStart=null;
    destroyGhost(this);
    const result=originalCreate?.apply(this,args);
    const cleanup=()=>destroyGhost(this);
    try{this.events?.once?.('shutdown',cleanup);this.events?.once?.('destroy',cleanup);}catch{}
    return result;
  };

  if(typeof originalUpdate==='function'){
    proto.update=function(time,delta){
      const now=performance.now();
      const historyBefore=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
      sampleCurrentLap(this,now);
      const completedTrace=Array.isArray(this._tdrLapGhostCurrentTrace)?this._tdrLapGhostCurrentTrace.slice():[];
      const result=originalUpdate.call(this,time,delta);
      const historyAfter=Array.isArray(this.ttHistory)?this.ttHistory.length:0;

      if(historyAfter>historyBefore){
        const row=this.ttHistory[historyAfter-1];
        const lapMs=finite(row?.lapMs);
        const valid=row?.valid!==false&&row?.invalid!==true&&lapMs!==null&&lapMs>0;
        if(valid){
          const next=buildGhostReference(lapMs,completedTrace);
          const previous=this._tdrSessionLapGhostReference;
          if(next&&(!previous||Number(next.lapMs)<Number(previous.lapMs)-5))this._tdrSessionLapGhostReference=next;
        }
        this._tdrLapGhostLapStart=finite(this.timing?.lapStart);
        this._tdrLapGhostCurrentTrace=[];
      }

      renderGhost(this,performance.now());
      return result;
    };
  }
}