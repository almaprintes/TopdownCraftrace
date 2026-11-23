// LIVE 4 DEV G only: pilot experience + each lap's die determine how
// confidently and accurately the AI approaches curves. The physical car
// retains its original engine, power, grip, speed limits and road mask.
// All settings are neutral on straights and for a perfect pilot/roll.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function live4GDriverSkill(elo,face){
 const rating=Number(elo),die=Number(face);
 if(!Number.isFinite(rating)||!Number.isInteger(die)||die<1||die>6)
  return null;
 const experience=clamp((rating-900)/900,0,1);
 const execution=clamp((die-1)/5,0,1);
 // Experience matters over a season; each die still changes the decisions
 // of the very same pilot on this particular lap.
 const quality=.60*experience+.40*execution;
 return Object.freeze({elo:rating,die,quality,
  hesitation:1-quality});
}
export function live4GCornerDecisions(skill,curveDemand){
 if(!skill)return {aimFactor:1,steerRateFactor:1,cornerSpeedFactor:1};
 const demand=clamp(Number(curveDemand)||0,0,1);
 const hesitation=clamp(Number(skill.hesitation)||0,0,1);
 const x=demand*hesitation;
 // Less anticipation and slower corrections cause poorer line tracking;
 // earlier lift/entry caution is a deliberate driving choice in turns only,
 // not a hidden top speed penalty, fake braking or different car physics.
 return {
  aimFactor:1-.15*x,
  steerRateFactor:1-.12*x,
  cornerSpeedFactor:1-.20*x
 };
}
