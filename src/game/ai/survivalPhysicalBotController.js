// src/game/ai/survivalPhysicalBotController.js
// Fase 3: controlador físico de un único bot experimental.
// Produce dirección, gas y freno; nunca teletransporta el cuerpo durante la marcha.

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrapAngle=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
const forwardSteps=(from,to,n)=>((to-from)%n+n)%n;

function nearestSample(samples,x,y,lastIndex){
  const n=samples.length;
  let best=Number.isInteger(lastIndex)?((lastIndex%n)+n)%n:0,bestD=Infinity;
  const scan=(from,to)=>{
    for(let d=from;d<=to;d++){
      const i=((best+d)%n+n)%n,p=samples[i];
      const dx=Number(p.x)-x,dy=Number(p.y)-y,q=dx*dx+dy*dy;
      if(q<bestD){bestD=q;best=i;}
    }
  };
  if(Number.isInteger(lastIndex)){
    const origin=best;bestD=Infinity;
    for(let d=-70;d<=110;d++){
      const i=((origin+d)%n+n)%n,p=samples[i];
      const dx=Number(p.x)-x,dy=Number(p.y)-y,q=dx*dx+dy*dy;
      if(q<bestD){bestD=q;best=i;}
    }
  }
  if(!Number.isInteger(lastIndex)||bestD>240*240){
    bestD=Infinity;
    for(let i=0;i<n;i++){
      const p=samples[i],dx=Number(p.x)-x,dy=Number(p.y)-y,q=dx*dx+dy*dy;
      if(q<bestD){bestD=q;best=i;}
    }
  }
  return{index:best,distance:Math.sqrt(bestD)};
}

export function updateSurvivalPhysicalBot(bot,profile,params={}){
  const samples=profile?.samples;
  const body=bot?.plannerBody;
  if(!profile?.valid||!Array.isArray(samples)||samples.length<4||!body?.body){
    return{valid:false,reason:'controller_not_ready'};
  }

  const dt=clamp(Number(params.dt||0),.001,.05);
  const velocity=body.body.velocity;
  const speed=Math.hypot(Number(velocity.x)||0,Number(velocity.y)||0);
  const nearest=nearestSample(samples,Number(body.x),Number(body.y),bot._plannerSampleIndex);
  bot._plannerSampleIndex=nearest.index;

  const spacing=Math.max(1,Number(params.spacing||10));
  // Analizar la secuencia como una maniobra completa. Una chicane no debe
  // recalcular su salida cada frame: se fija un objetivo posterior a la segunda
  // curva y se conserva hasta atravesarlo.
  let turnSign=0,turnChanges=0,turnEnergy=0,peakTurn=0,lastTurnStep=0;
  for(let step=2;step<=20;step++){
    const turn=Number(samples[(nearest.index+step)%samples.length].curvature||0);
    peakTurn=Math.max(peakTurn,Math.abs(turn));
    if(Math.abs(turn)<.012)continue;
    const sign=Math.sign(turn);
    turnEnergy+=Math.abs(turn);
    lastTurnStep=step;
    if(turnSign&&sign!==turnSign)turnChanges++;
    turnSign=sign;
  }
  const detectedChicane=turnChanges>0&&turnEnergy>.10;
  let committed=bot._plannerManeuver;
  if(committed){
    const remaining=forwardSteps(nearest.index,committed.targetIndex,samples.length);
    if(remaining<=2||remaining>Math.min(samples.length*.45,36))committed=null;
  }
  if(!committed&&detectedChicane){
    const exitSteps=clamp(lastTurnStep+4,10,24);
    committed={
      kind:'chicane',
      targetIndex:(nearest.index+exitSteps)%samples.length
    };
  }
  bot._plannerManeuver=committed;
  const chicaneAhead=committed?.kind==='chicane';
  const cornerFactor=clamp((peakTurn-.012)/.12,0,1);
  const normalLookaheadPx=clamp(24+speed*.15-cornerFactor*18,22,62);
  const lookaheadSteps=Math.max(2,Math.round(normalLookaheadPx/spacing));
  const targetIndex=chicaneAhead
    ?committed.targetIndex
    :(nearest.index+lookaheadSteps)%samples.length;
  const target=samples[targetIndex];
  const desiredHeading=Math.atan2(Number(target.y)-Number(body.y),Number(target.x)-Number(body.x));
  const headingError=wrapAngle(desiredHeading-Number(body.rotation||0));
  const rawSteer=clamp(headingError/.48,-1,1);
  // Amortiguar la orden, no la posición. Limita los contravolantes visibles sin
  // introducir un carril ni desplazar artificialmente el coche.
  const previousSteer=Number(bot._plannerSteerCommand||0);
  const steerStep=clamp(rawSteer-previousSteer,-2.8*dt,2.8*dt);
  const steer=clamp(previousSteer+steerStep,-1,1);
  bot._plannerSteerCommand=steer;

  const maxFwd=Math.max(40,Number(params.maxFwd||420));
  const profileMax=Math.max(1,Number(profile.parameters?.maxSpeed||520));
  const targetSpeed=clamp(Number(samples[nearest.index].targetSpeed||0)/profileMax,0,1)*maxFwd;
  // Si aumenta el error angular o la distancia a la línea, reducir velocidad
  // antes de exigir más volante. Es una decisión física general, no un parche
  // por circuito: entrar algo más lento conserva agarre y evita cortar bordes.
  const controlScale=clamp(
    1-Math.abs(headingError)*.25-Math.max(0,nearest.distance-12)*.003,
    .58,1
  );
  const controlledTargetSpeed=targetSpeed*controlScale;
  const speedError=controlledTargetSpeed-speed;
  const throttle=clamp((speedError-2)/34,0,1);
  const brake=clamp((-speedError-3)/30,0,1);

  const accel=Math.max(0,Number(params.accel||520));
  const brakeForce=Math.max(0,Number(params.brakeForce||720));
  const linearDrag=Math.max(0,Number(params.linearDrag||.004));
  const turnRate=Math.max(.1,Number(params.turnRate||2.4));
  const steering=params.steering||{};
  const yawSpeedMin=Math.max(1,Number(steering.yawSpeedMin||12));
  const speed01=clamp(speed/maxFwd,0,1);
  const steerSat=Math.max(.05,Number(steering.steerSat||.45));
  const lowSpeedSteer=clamp(Number(steering.lowSpeedSteer||.35),0,1);
  const highSpeedLimit=clamp(Number(steering.highSpeedLimit||.75),.1,1);
  const steerT=clamp(speed01/steerSat,0,1);
  let turnFactor=(lowSpeedSteer+(1-lowSpeedSteer)*steerT)*(1-(1-highSpeedLimit)*speed01);
  if(speed<yawSpeedMin)turnFactor*=speed/yawSpeedMin;
  const yawLimit=turnRate*turnFactor;
  const yawCommand=steer*yawLimit;
  body.rotation+=yawCommand*dt;

  const fx=Math.cos(body.rotation),fy=Math.sin(body.rotation);
  const rx=-fy,ry=fx;
  const forward=velocity.x*fx+velocity.y*fy;
  const accelCurve=1-Math.pow(clamp(Math.abs(forward)/maxFwd,0,1),1.8);
  const drive=accel*accelCurve*throttle;
  velocity.x+=fx*drive*dt;
  velocity.y+=fy*drive*dt;
  if(brake>0){
    const next=Math.max(0,forward-brakeForce*brake*dt);
    const dv=next-forward;
    velocity.x+=fx*dv;velocity.y+=fy*dv;
  }

  const drag=Math.exp(-linearDrag*dt*60);
  velocity.x*=drag;velocity.y*=drag;

  // El agarre reduce deriva lateral de forma continua, igual que el concepto
  // FRONT-STEER del coche del jugador, pero proporcional al mando aplicado.
  const lateral=velocity.x*rx+velocity.y*ry;
  const grip=Math.max(0,Number(steering.lateralGrip||6));
  const lateralKeep=1-clamp(grip*(.25+.75*Math.abs(steer))*dt,0,1);
  const forwardAfter=velocity.x*fx+velocity.y*fy;
  velocity.x=fx*forwardAfter+rx*lateral*lateralKeep;
  velocity.y=fy*forwardAfter+ry*lateral*lateralKeep;

  const finalSpeed=Math.hypot(velocity.x,velocity.y);
  if(finalSpeed>maxFwd){
    const scale=maxFwd/finalSpeed;velocity.x*=scale;velocity.y*=scale;
  }

  return{
    valid:true,
    nearestIndex:nearest.index,
    targetIndex,
    distanceToLine:nearest.distance,
    speed,
    targetSpeed:controlledTargetSpeed,
    profileTargetSpeed:targetSpeed,
    chicaneAhead,
    maneuverKind:committed?.kind||null,
    headingError,
    steer,
    throttle,
    brake
  };
}
