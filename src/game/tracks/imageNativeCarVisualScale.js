// Size of the player car on image-native maps.
// Geometry/render scale is not a car tuning parameter. Leave Arcade body,
// collision radius, top speed, steering, wheelbase and original car specs alone.
import { KARTING_IMAGE_PREVIEW_KEY } from './imageNativeTrackIdentity.js';

export function raceImageCarVisualScale(trackKey,worldScale){
  if(trackKey!==KARTING_IMAGE_PREVIEW_KEY)return 1;
  const n=Number(worldScale);
  return Number.isFinite(n)?Math.max(1,Math.min(4,n)):1;
}

// RaceBicycleHandlingScene must NOT infer a different physics wheelbase from
// a render-only enlarged sprite.
export function unscaledCarVisualLength(width,visualMultiplier){
  const w=Number(width),scale=Number(visualMultiplier);
  if(!Number.isFinite(w)||w<=0)return 0;
  return w/(Number.isFinite(scale)&&scale>0?scale:1);
}
