import {rcAxisValue} from './rcTwinAxis.js';

// Floating one-axis steering: an invisible touch starts at neutral exactly
// where the thumb lands. Movement is absolute relative to that touch point;
// never accumulate steering across gestures or frames.
export function createInvisibleSteeringGesture({travelPx=92,sensitivity=1,inverted=false}={}){
  let active=false,anchor=0,steer=0;
  return {
    start(x){
      if(!Number.isFinite(x)){active=false;steer=0;return 0;}
      anchor=x;active=true;steer=0;return 0;
    },
    move(x){
      if(!active||!Number.isFinite(x))return steer;
      steer=rcAxisValue(x,anchor,travelPx,{deadZone:.075,sensitivity,inverted});
      return steer;
    },
    end(){active=false;steer=0;anchor=0;return 0;},
    get active(){return active;},
    get value(){return steer;}
  };
}
