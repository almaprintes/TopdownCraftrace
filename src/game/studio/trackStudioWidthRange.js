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

// Precision is an editor preference, never inferred from photo resolution.
// Previous logic forced 20/50/100px jumps on photo-based roads.
export const TRACK_STUDIO_WIDTH_STEPS=Object.freeze([1,5,10,25,50,100]);

// Keep the two original parameters for callers already passing photo and max.
export function trackStudioWidthStep(_imageCanvas, _widthMaximum, selectedStep=5) {
  const step=Number(selectedStep);
  return TRACK_STUDIO_WIDTH_STEPS.includes(step)?step:5;
}

export function nextTrackStudioWidthStep(currentStep=5) {
  const index=TRACK_STUDIO_WIDTH_STEPS.indexOf(Number(currentStep));
  return TRACK_STUDIO_WIDTH_STEPS[(index+1)%TRACK_STUDIO_WIDTH_STEPS.length];
}
