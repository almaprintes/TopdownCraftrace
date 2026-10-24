// Virtual horizontal steering position with a genuine stable neutral.
// 1.3.12 unwound full lock in ~15px: impossible to settle on a straight.
// 70px from neutral to full lock, 5px detent, 1.8 power curve.
// Up to 22px retains original 1.3.14 near-center feel; deeper turns are softer.
// tiny thumb corrections have little impact; wide strokes can still turn fully.
// Independent of framerate; a stationary finger keeps its requested steering.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const TRAVEL_PX=70; // Slight further reduction in medium/deep corners; small corrections unchanged
const PREVIOUS_TRAVEL_PX=60;
const FINE_CONTROL_END_PX=22; // Preserve the already-approved near-neutral feel
const CENTER_DETENT_PX=5;
const FINE_CONTROL_END_NORM=(FINE_CONTROL_END_PX-CENTER_DETENT_PX)/(PREVIOUS_TRAVEL_PX-CENTER_DETENT_PX);
export function createRelativeSteeringGesture(){
  let active=false,lastX=0,position=0,steer=0;
  return {
    start(x){
      active=Number.isFinite(x);
      lastX=active?x:0;
      position=0;
      steer=0;
      return steer;
    },
    move(x,{sensitivity=1,inverted=false}={}){
      if(!active||!Number.isFinite(x))return steer;
      const dx=x-lastX;
      lastX=x;
      const sensitivityGain=clamp(Number(sensitivity)||1,.5,1.5);
      const direction=inverted?-1:1;
      // Accumulate finger displacement rather than summing shaped steering
      // deltas. Small subpixel events cannot cause cumulative input drift.
      position=clamp(position+dx*sensitivityGain*direction,-TRAVEL_PX,TRAVEL_PX);
      const magnitude=Math.abs(position);
      // Stable straight: 5 physical px around the virtual center always
      // yields exactly zero; tiny reversals don't wobble the car.
      // Keep the previously approved precision for small straight corrections.
      // Above 22px, spread the rest of the turn over 48px instead of 44px (DEV 1.3.15).
      // This eases medium/strong corner input while keeping full lock reachable.
      const normalized=magnitude<=FINE_CONTROL_END_PX
        ? clamp((magnitude-CENTER_DETENT_PX)/(PREVIOUS_TRAVEL_PX-CENTER_DETENT_PX),0,1)
        : clamp(FINE_CONTROL_END_NORM+
            (magnitude-FINE_CONTROL_END_PX)*(1-FINE_CONTROL_END_NORM)/(TRAVEL_PX-FINE_CONTROL_END_PX),0,1);
      // Low travel is deliberately gentle for straight-line corrections;
      // large travel smoothly reaches full steering for tight corners.
      // Only one Math.pow per pointermove; no track geometry or background loop.
      steer=normalized===0?0:Math.sign(position)*Math.pow(normalized,1.8);
      return steer;
    },
    end(){active=false;lastX=0;position=0;steer=0;return steer;},
    get value(){return steer;},
    get active(){return active;}
  };
}
