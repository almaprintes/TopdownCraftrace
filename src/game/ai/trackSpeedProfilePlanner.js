// src/game/ai/trackSpeedProfilePlanner.js
// Fase 2: perfil anticipativo sobre una trazada ya calculada.
// Solo observación/telemetría; todavía no controla acelerador ni freno.

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function buildTrackSpeedProfile(lineModel,options={}){
  const line=Array.isArray(lineModel?.racingLine)?lineModel.racingLine:[];
  const turns=Array.isArray(lineModel?.curvature)?lineModel.curvature:[];
  const n=line.length;
  if(!lineModel?.valid||n<4||turns.length!==n){
    return{valid:false,reason:'invalid_racing_line',samples:[],metrics:{}};
  }

  const spacing=Math.max(1,Number(lineModel.spacing||10));
  const maxSpeed=Math.max(80,Number(options.maxSpeed||520));
  const minCornerSpeed=clamp(Number(options.minCornerSpeed||92),20,maxSpeed);
  const lateralAccel=Math.max(50,Number(options.lateralAccel||900));
  const driveAccel=Math.max(20,Number(options.driveAccel||260));
  const brakeDecel=Math.max(20,Number(options.brakeDecel||430));
  const curvatureFloor=Math.max(1e-5,Number(options.curvatureFloor||.0015));

  // Límite local por radio: v²/r <= aceleración lateral. El giro guardado es
  // por muestra, por lo que kappa ~= deltaHeading / spacing.
  const localLimit=turns.map(turn=>{
    const kappa=Math.max(curvatureFloor,Math.abs(Number(turn)||0)/spacing);
    return clamp(Math.sqrt(lateralAccel/kappa),minCornerSpeed,maxSpeed);
  });
  const speed=localLimit.slice();

  // Pase hacia atrás: cada muestra debe poder frenar hasta la siguiente.
  // Varias vueltas estabilizan también el cierre del circuito.
  for(let cycle=0;cycle<4;cycle++){
    for(let step=0;step<n;step++){
      const i=(n-1-step+n)%n,next=(i+1)%n;
      const reachable=Math.sqrt(speed[next]*speed[next]+2*brakeDecel*spacing);
      speed[i]=Math.min(speed[i],reachable);
    }

    // Pase hacia delante: no se puede recuperar velocidad instantáneamente.
    for(let step=0;step<n;step++){
      const i=step,prev=(i-1+n)%n;
      const reachable=Math.sqrt(speed[prev]*speed[prev]+2*driveAccel*spacing);
      speed[i]=Math.min(speed[i],reachable);
    }
  }

  const samples=speed.map((targetSpeed,i)=>{
    const prev=speed[(i-1+n)%n],next=speed[(i+1)%n];
    const deltaNext=next-targetSpeed;
    const state=deltaNext<-1?'brake':deltaNext>1?'accelerate':'hold';
    return{
      x:Number(line[i].x),y:Number(line[i].y),
      targetSpeed,
      localLimit:localLimit[i],
      state,
      accelerationRequest:clamp((next*next-targetSpeed*targetSpeed)/(2*spacing),-brakeDecel,driveAccel),
      speedGradient:(next-prev)/(2*spacing)
    };
  });

  const finite=samples.every(s=>Number.isFinite(s.targetSpeed)&&Number.isFinite(s.accelerationRequest));
  const brakingSamples=samples.filter(s=>s.state==='brake').length;
  const acceleratingSamples=samples.filter(s=>s.state==='accelerate').length;
  const minSpeed=Math.min(...speed),meanSpeed=speed.reduce((a,b)=>a+b,0)/n;
  const estimatedLapSeconds=speed.reduce((sum,v,i)=>{
    const next=speed[(i+1)%n];
    return sum+spacing/Math.max(1,(v+next)*.5);
  },0);

  return{
    valid:finite,
    reason:finite?null:'non_finite_speed_profile',
    samples,
    parameters:{maxSpeed,minCornerSpeed,lateralAccel,driveAccel,brakeDecel},
    metrics:{
      pointCount:n,
      minTargetSpeed:minSpeed,
      maxTargetSpeed:Math.max(...speed),
      meanTargetSpeed:meanSpeed,
      estimatedLapSeconds,
      brakingFraction:brakingSamples/n,
      acceleratingFraction:acceleratingSamples/n
    }
  };
}
