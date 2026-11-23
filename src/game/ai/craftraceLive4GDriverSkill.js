// LIVE 4 DEV G only: pilot experience + each lap's die determine how
// confidently and accurately the AI approaches curves. The physical car
// retains its original engine, power, grip, speed limits and road mask.
// All settings are neutral on straights and for a perfect pilot/roll.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function live4GDriverSkill(elo,face){
 const rating=Number(elo),die=Number(face);
 if(elo===null||elo===undefined||!Number.isFinite(rating)||
    !Number.isInteger(die)||die<1||die>6)
  return null;
 const experience=clamp((rating-900)/900,0,1);
 const execution=clamp((die-1)/5,0,1);
 // A driver's stable competence dominates; each die still changes the decisions
 // of the very same pilot on this particular lap.
 const quality=.72*experience+.28*execution;
 return Object.freeze({elo:rating,die,quality,
  hesitation:1-quality});
}
export function live4GCornerDecisions(skill,curveDemand){
 if(!skill)return {aimFactor:1,steerRateFactor:1,cornerSpeedFactor:1,throttleFactor:1};
 const demand=clamp(Number(curveDemand)||0,0,1);
 const hesitation=clamp(Number(skill.hesitation)||0,0,1);
 const x=demand*hesitation;
 // Less anticipation and slower corrections cause poorer line tracking;
 // earlier lift/entry caution is a deliberate driving choice in turns only,
 // not a hidden top speed penalty, fake braking or different car physics.
 return {
  aimFactor:1-.15*x,
  steerRateFactor:1-.12*x,
  cornerSpeedFactor:1-.20*x,
  // On powerful cars the old speed target could remain above the real
  // drag-limited pace: every AI then held full throttle despite distinct
  // target percentages. Less confident drivers now genuinely lift the
  // accelerator as they turn. No added braking, torque or grip modifiers.
  throttleFactor:1-.15*x
 };
}


// A tiny racecraft timing model, in physical milliseconds converted to
// distance at the CURRENT car speed. Novices lift before the entry and hold
// that lift briefly after the exit; experts can brake later/reapply earlier.
// It never changes acceleration, maximum speed, grip, steering limit or
// checkpoint time. At 60 Hz a 16.67 ms frame is the timing resolution.
export function live4GCornerTiming(skill,samples,index,spacing,speed){
 const neutral={entryLeadMs:0,exitLagMs:0,entryPhase:0,exitPhase:0,
  throttleFactor:1,brakeThresholdRelaxPxS:0};
 if(!skill||!Array.isArray(samples)||samples.length<5||
    !Number.isInteger(index))return neutral;
 const hesitation=clamp(Number(skill.hesitation)||0,0,1);
 if(hesitation===0)return neutral;
 const speedPxS=Math.max(0,Number(speed)||0);
 const sampleStep=Math.max(1,Number(spacing)||10);
 const entryLeadMs=16+84*hesitation;
 const exitLagMs=12+72*hesitation;
 // Timing (in ms) becomes a preview/delay distance; this is not a
 // permanent speed modifier or a racing-line teleport.
 const toSteps=ms=>Math.max(1,Math.round(speedPxS*ms/1000/sampleStep));
 const n=samples.length;
 const peak=(offset)=>{
  let out=0;
  for(let d=-1;d<=1;d++){
   const k=((index+offset+d)%n+n)%n;
   out=Math.max(out,Math.abs(Number(samples[k]?.curvature)||0));
  }
  return clamp((out-.009)/.075,0,1);
 };
 const current=peak(0),ahead=peak(toSteps(entryLeadMs)),
  behind=peak(-toSteps(exitLagMs));
 // A *rising* curvature signal is corner entry; falling curvature is exit.
 // The skill-specific look-ahead/back offsets make the driver lift earlier
 // or keep off the gas longer. No lift penalty on a stable straight.
 const entryPhase=clamp((ahead-current)*2,0,1);
 const exitPhase=clamp((behind-current)*2,0,1);
 return {
  entryLeadMs,exitLagMs,entryPhase,exitPhase,
  throttleFactor:1-.10*hesitation*(entryPhase+exitPhase),
  // Only when the unmodified controller already wants to decelerate:
  // a nervous driver may initiate the real brake a fraction earlier.
  brakeThresholdRelaxPxS:1.5*hesitation*entryPhase
 };
}
