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
  // Una chicane real necesita dos lóbulos opuestos de entidad parecida. Exigir
  // energía a ambos lados evita interpretar una sucesión larga de curvas como
  // una chicane permanente.
  let turnSign=0,turnChanges=0,turnEnergy=0,positiveEnergy=0,negativeEnergy=0,peakTurn=0;
  for(let step=2;step<=16;step++){
    const turn=Number(samples[(nearest.index+step)%samples.length].curvature||0);
    peakTurn=Math.max(peakTurn,Math.abs(turn));
    if(Math.abs(turn)<.014)continue;
    const sign=Math.sign(turn);
    const energy=Math.abs(turn);
    turnEnergy+=energy;
    if(sign>0)positiveEnergy+=energy;else negativeEnergy+=energy;
    if(turnSign&&sign!==turnSign)turnChanges++;
    turnSign=sign;
  }
  // Las chicanes cortas pueden quedar suavizadas por debajo del umbral de
  // cada muestra. Comparar dos lóbulos contiguos permite reconocerlas sin
  // relajar la detección de secuencias largas.
  let shortChicane=false;
  for(let split=3;split<=8&&!shortChicane;split++){
    let first=0,second=0;
    for(let step=1;step<=12;step++){
      const turn=Number(samples[(nearest.index+step)%samples.length].curvature||0);
      if(step<=split)first+=turn;else second+=turn;
    }
    const larger=Math.max(Math.abs(first),Math.abs(second));
    const smaller=Math.min(Math.abs(first),Math.abs(second));
    shortChicane=first*second<0&&smaller>.030&&
      smaller/Math.max(.001,larger)>.40&&Math.abs(first-second)>.085;
  }
  const chicaneAhead=(turnChanges===1&&turnEnergy>.12&&
    Math.min(positiveEnergy,negativeEnergy)>.045)||shortChicane;
  // El plan global tiene prioridad: mantiene una salida común para toda la
  // secuencia y evita recentrar el coche entre sus vértices.
  const plannedSample=samples[nearest.index];
  const plannedId=Number(plannedSample?.maneuverId||0);
  let maneuver=bot._plannerManeuver;
  let releaseSeconds=Math.max(0,Number(bot._plannerManeuverRelease||0)-dt);
  if(maneuver){
    const remaining=forwardSteps(nearest.index,maneuver.targetIndex,samples.length);
    if(remaining<=2||remaining>36){
      bot._plannerCompletedManeuverId=maneuver.id;
      releaseSeconds=.48;
      maneuver=null;
    }
  }
  // No rearmar una maniobra cuyo objetivo acaba de quedar detrás. El bloqueo
  // desaparece únicamente al abandonar por completo su zona planificada.
  if(Number(bot._plannerCompletedManeuverId||0)&&
    plannedId!==Number(bot._plannerCompletedManeuverId)){
    bot._plannerCompletedManeuverId=0;
  }
  if(!maneuver&&plannedId>0&&
    plannedId!==Number(bot._plannerCompletedManeuverId||0)&&
    Number.isInteger(plannedSample?.maneuverTargetIndex)){
    maneuver={
      id:plannedId,
      type:String(plannedSample.maneuverType||'linked'),
      targetIndex:Number(plannedSample.maneuverTargetIndex)
    };
  }
  bot._plannerManeuver=maneuver;
  bot._plannerManeuverRelease=releaseSeconds;
  const maneuverActive=Boolean(maneuver);
  const maneuverRelease=releaseSeconds>0;

  // Fallback local para pistas sin secuencia global homologada.
  let shortcut=bot._plannerShortChicane;
  if(shortcut){
    const remaining=forwardSteps(nearest.index,shortcut.targetIndex,samples.length);
    if(remaining<=3||remaining>18)shortcut=null;
  }
  if(!shortcut&&shortChicane)shortcut={
    targetIndex:(nearest.index+12)%samples.length
  };
  bot._plannerShortChicane=shortcut;
  const committedShortChicane=Boolean(shortcut);
  const cornerFactor=clamp((peakTurn-.014)/.12,0,1);

  // En recta, perseguir cada muestra de una línea aprendida roba velocidad punta:
  // el coche convierte aceleración longitudinal en pequeños cambios de rumbo.
  // La recta se reconoce por la geometría local, con histéresis temporal, y se
  // abandona antes de la frenada para que la preparación de curva siga intacta.
  let localStraightPeak=0,approachPeak=0;
  for(let step=-3;step<=7;step++){
    localStraightPeak=Math.max(localStraightPeak,
      Math.abs(Number(samples[(nearest.index+step+samples.length)%samples.length].curvature||0)));
  }
  for(let step=8;step<=14;step++){
    approachPeak=Math.max(approachPeak,
      Math.abs(Number(samples[(nearest.index+step)%samples.length].curvature||0)));
  }
  const straightGeometry=localStraightPeak<.010&&approachPeak<.018&&
    !chicaneAhead&&!maneuverActive&&!maneuverRelease&&!committedShortChicane;
  bot._plannerStraightStable=straightGeometry
    ?Math.min(.5,Number(bot._plannerStraightStable||0)+dt)
    :0;
  const straightLock=bot._plannerStraightStable>=.12;

  const lookaheadPx=chicaneAhead
    ?clamp(48+speed*.18,58,100)
    :(straightLock
      ?clamp(74+speed*.16,84,124)
      :clamp(30+speed*.17-cornerFactor*8,28,76));
  const lookaheadSteps=Math.max(2,Math.round(lookaheadPx/spacing));
  const targetIndex=maneuverActive
    ?maneuver.targetIndex
    :(committedShortChicane?shortcut.targetIndex
      :(nearest.index+lookaheadSteps)%samples.length);
  const target=samples[targetIndex];
  const desiredHeading=Math.atan2(Number(target.y)-Number(body.y),Number(target.x)-Number(body.x));
  const headingError=wrapAngle(desiredHeading-Number(body.rotation||0));
  let rawSteer=clamp(headingError/(straightLock?.62:.48),-1,1);
  const previousSteer=Number(bot._plannerSteerCommand||0);
  const oppositeDuringRelease=maneuverRelease&&
    Math.sign(rawSteer)!==Math.sign(previousSteer)&&
    Math.abs(previousSteer)>.04;
  // En una recta estable hay zona muerta y no se acepta un cambio de signo por
  // errores minúsculos. El volante converge a cero en lugar de serpentear.
  const straightDeadband=straightLock&&Math.abs(headingError)<.035;
  const straightOppositeSuppressed=straightLock&&
    Math.sign(rawSteer)!==Math.sign(previousSteer)&&
    Math.abs(headingError)<.12;
  // Al descargar el recorte se permite volver a volante neutro, pero no cruzar
  // inmediatamente al contravolante por una desviación pequeña. Solo un error
  // angular claro puede cancelar esta histéresis de salida.
  const releaseOppositeSuppressed=oppositeDuringRelease&&
    Math.abs(headingError)<.34;
  if(releaseOppositeSuppressed||straightDeadband||straightOppositeSuppressed)rawSteer=0;
  const steerRate=straightLock?2.4:(oppositeDuringRelease?2.2:9);
  let steer=clamp(previousSteer+
    clamp(rawSteer-previousSteer,-steerRate*dt,steerRate*dt),-1,1);
  if(straightLock&&rawSteer===0){
    steer=Math.sign(steer)*Math.max(0,Math.abs(steer)-3.8*dt);
  }
  bot._plannerSteerCommand=steer;

  const maxFwd=Math.max(40,Number(params.maxFwd||420));
  const profileMax=Math.max(1,Number(profile.parameters?.maxSpeed||520));
  const baseProfileSpeed=Number(samples[nearest.index].targetSpeed||0);
  const maneuverProfileSpeed=maneuverActive
    ?Number(plannedSample?.maneuverTargetSpeed||0)
    :0;
  const profileRatio=clamp(
    Math.max(baseProfileSpeed,maneuverProfileSpeed)/profileMax,0,1
  );
  // Riesgo condicionado: si el coche llega bien colocado conserva más velocidad
  // cuanto más cerrada es la curva. Si acumula error angular o transversal,
  // renuncia progresivamente al extra en vez de insistir hasta salirse.
  const cornerRisk=clamp(Math.max(
    Number(params.cornerRisk||0),
    maneuverActive?Number(plannedSample?.maneuverRisk||0):0
  ),0,.35);
  const riskConfidence=clamp(
    1-Math.abs(headingError)/.42-Math.max(0,nearest.distance-10)/34,
    0,1
  );
  const riskScale=1+(1-profileRatio)*cornerRisk*riskConfidence;
  const targetSpeed=clamp(profileRatio*riskScale,0,1)*maxFwd;
  // Si aumenta el error angular o la distancia a la línea, reducir velocidad
  // antes de exigir más volante. Es una decisión física general, no un parche
  // por circuito: entrar algo más lento conserva agarre y evita cortar bordes.
  const controlScale=clamp(
    1-Math.abs(headingError)*.25-
      Math.max(0,nearest.distance-((maneuverActive||maneuverRelease)?28:12))*.003,
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
  body.rotation+=clamp(steer*1.35,-1,1)*yawLimit*dt;

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
    cornerRisk,
    riskConfidence,
    riskScale,
    chicaneAhead,
    shortChicane:committedShortChicane,
    maneuverActive,
    maneuverRelease,
    maneuverReleaseSeconds:releaseSeconds,
    releaseOppositeSuppressed,
    straightLock,
    straightDeadband,
    straightLocalCurvature:localStraightPeak,
    straightApproachCurvature:approachPeak,
    maneuverId:maneuver?.id||0,
    maneuverType:maneuver?.type||null,
    maneuverPhase:Number(plannedSample?.maneuverPhase||0),
    headingError,
    steer,
    throttle,
    brake
  };
}
