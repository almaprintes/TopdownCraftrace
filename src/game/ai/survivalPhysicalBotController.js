// src/game/ai/survivalPhysicalBotController.js
// Fase 3: controlador físico de un único bot experimental.
// Produce dirección, gas y freno; nunca teletransporta el cuerpo durante la marcha.

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrapAngle=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

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
  const lookaheadPx=clamp(24+speed*.24,28,105);
  const lookaheadSteps=Math.max(2,Math.round(lookaheadPx/spacing));
  const targetIndex=(nearest.index+lookaheadSteps)%samples.length;
  const target=samples[targetIndex];
  const desiredHeading=Math.atan2(Number(target.y)-Number(body.y),Number(target.x)-Number(body.x));
  const headingError=wrapAngle(desiredHeading-Number(body.rotation||0));
  const steer=clamp(headingError/.48,-1,1);

  const maxFwd=Math.max(40,Number(params.maxFwd||420));
  const profileMax=Math.max(1,Number(profile.parameters?.maxSpeed||520));
  const targetSpeed=clamp(Number(samples[nearest.index].targetSpeed||0)/profileMax,0,1)*maxFwd;
  const speedError=targetSpeed-speed;
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
  body.rotation+=clamp(headingError*2.25,-yawLimit,yawLimit)*dt;

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
    targetSpeed,
    headingError,
    steer,
    throttle,
    brake
  };
}
