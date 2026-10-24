// DEV RC radio-style twin single-axis sticks: absolute position, no accumulated
// gestures, circuit geometry, timers or updates between pointer events.
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function rcAxisValue(position,center,halfTravel,{deadZone=.07,inverted=false,sensitivity=1}={}){
  if(![position,center,halfTravel].every(Number.isFinite)||halfTravel<=0)return 0;
  const gain=clamp(Number(sensitivity)||1,.5,1.5);
  const signed=clamp((position-center)/halfTravel*gain*(inverted?-1:1),-1,1);
  const magnitude=Math.abs(signed);
  if(magnitude<=deadZone)return 0;
  return Math.sign(signed)*Math.pow(clamp((magnitude-deadZone)/(1-deadZone),0,1),1.15);
}
export function rcThrottleBrake(vertical){
  const amount=clamp(Number(vertical)||0,-1,1);
  // Positive=up=throttle; negative=down=brake/reverse. Never both.
  return {throttle:amount>0?amount:0,brake:amount<0?-amount:0};
}
