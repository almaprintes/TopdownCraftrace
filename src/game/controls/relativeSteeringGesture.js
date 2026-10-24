// Relative steering for horizontal touch input, independent of viewport or FPS.
// The previous implementation measured displacement from pointerdown, forcing a
// long return journey before changing direction. This one consumes signed motion.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createRelativeSteeringGesture(){
  let active=false,lastX=0,steer=0;
  return {
    start(x){
      active=Number.isFinite(x);
      lastX=Number.isFinite(x)?x:0;
      steer=0;
      return steer;
    },
    move(x,{sensitivity=1,inverted=false}={}){
      if(!active||!Number.isFinite(x))return steer;
      const dx=clamp(x-lastX,-70,70);
      lastX=x;
      // Ignore subpixel touch jitter, not deliberate small corrections.
      if(Math.abs(dx)<.8)return steer;
      const direction=Math.sign(dx)*(inverted?-1:1);
      const response=clamp(Number(sensitivity)||1,.5,1.5);
      // Countersteering rapidly releases existing lock, then progressively
      // applies the new direction. No need to return to the initial touch point.
      const opposing=steer*direction<-.025;
      const unitsPerPx=(opposing?1/15:1/45)*response;
      steer=clamp(steer+direction*Math.abs(dx)*unitsPerPx,-1,1);
      if(Math.abs(steer)<.02)steer=0;
      return steer;
    },
    end(){active=false;lastX=0;steer=0;return steer;},
    get value(){return steer;},
    get active(){return active;}
  };
}
