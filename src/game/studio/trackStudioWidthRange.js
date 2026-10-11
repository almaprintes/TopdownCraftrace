// TrackStudio width controls belong to editor geometry only.
// Larger native photographs need larger authored road widths; never scale
// the world, the player's car, the physics or the exported Bézier shape.
export const CLASSIC_TRACK_WIDTH_MAX=260;
export const NATIVE_IMAGE_TRACK_WIDTH_MAX=1600;

export function trackStudioWidthMaximum(imageCanvas, currentWidth=0) {
  if(!imageCanvas)return CLASSIC_TRACK_WIDTH_MAX;
  const w=Number(imageCanvas.width),h=Number(imageCanvas.height);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return CLASSIC_TRACK_WIDTH_MAX;
  // The shortest side defines a sensible ceiling even for vertical rally maps.
  // Round to editing-friendly increments; keep imported authored widths intact.
  const adapted=Math.round(Math.min(w,h)*.5/10)*10;
  return Math.max(CLASSIC_TRACK_WIDTH_MAX,Number(currentWidth)||0,
    Math.min(NATIVE_IMAGE_TRACK_WIDTH_MAX,adapted));
}

export function trackStudioWidthStep(imageCanvas, widthMaximum) {
  if(!imageCanvas)return 10;
  if(widthMaximum>=1000)return 100;
  if(widthMaximum>=800)return 50;
  if(widthMaximum>=400)return 20;
  return 10;
}
