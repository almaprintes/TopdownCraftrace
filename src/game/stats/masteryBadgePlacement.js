// A mastery is an optional full-roof livery: large enough to become the
// car's identity, not a tiny bolt/tyre. Values refer to the displayed artwork
// after object-fit:contain and are proportional across phone/tablet sizes.
export function lobbyMasteryPlacement(rect,naturalWidth,naturalHeight){
  const w=Number(rect?.width)||0,h=Number(rect?.height)||0;
  if(w<=0||h<=0)return null;
  const nw=Math.max(1,Number(naturalWidth)||w),nh=Math.max(1,Number(naturalHeight)||h);
  const scale=Math.min(w/nw,h/nh);
  const paintW=nw*scale,paintH=nh*scale;
  const paintLeft=(Number(rect?.left)||0)+(w-paintW)/2;
  const paintTop=(Number(rect?.top)||0)+(h-paintH)/2;
  // Central cabin, not the rearmost badge point used by the old tiny medal.
  const x=paintLeft+paintW*.5;
  const y=paintTop+paintH*.51;
  // A shield occupies approximately the entire roof width; its visible
  // silhouette is ~87% of this square art box (SVG viewBox has small margins).
  // Keep it inside even the narrowest car and scale with the car, never screen.
  const cross=Math.min(paintW,paintH);
  const size=Math.max(19,Math.min(112,cross*.78));
  return{x,y,size,paintWidth:paintW,paintHeight:paintH};
}
// Race graphics are scaled in game units and mounted INSIDE the rotating car
// rig. A near full-roof shield (~75% of the car's narrow dimension) is used.
export function raceMasteryPlacement(displayWidth,displayHeight){
  const w=Math.max(1,Number(displayWidth)||1),h=Math.max(1,Number(displayHeight)||1);
  const cross=Math.min(w,h);
  return{
    x:0,
    y:0,
    radius:Math.max(5.3,Math.min(21,cross*.41))
  };
}
