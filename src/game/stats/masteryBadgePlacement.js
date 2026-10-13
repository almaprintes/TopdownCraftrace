// Position a mastery emblem against the PAINTED car, not the transparent
// letterbox of an <img> using object-fit:contain. Device independent.
export function lobbyMasteryPlacement(rect,naturalWidth,naturalHeight){
  const w=Number(rect?.width)||0,h=Number(rect?.height)||0;
  if(w<=0||h<=0)return null;
  const nw=Math.max(1,Number(naturalWidth)||w),nh=Math.max(1,Number(naturalHeight)||h);
  const scale=Math.min(w/nw,h/nh);
  const paintW=nw*scale,paintH=nh*scale;
  const paintLeft=(Number(rect?.left)||0)+(w-paintW)/2;
  const paintTop=(Number(rect?.top)||0)+(h-paintH)/2;
  // Slightly toward the cabin / rear, avoiding glass and windscreen.
  const x=paintLeft+paintW*.5;
  const y=paintTop+paintH*.57;
  const size=Math.max(15,Math.min(31,paintW*.205));
  return{x,y,size,paintWidth:paintW,paintHeight:paintH};
}
// The race sprite is centred in the visual rig, and the rig is rotated with
// the car. The longer texture axis points along the chassis.
export function raceMasteryPlacement(displayWidth,displayHeight){
  const w=Math.max(1,Number(displayWidth)||1),h=Math.max(1,Number(displayHeight)||1);
  const longVertical=h>=w;
  const cross=Math.min(w,h);
  return{
    x:longVertical?0:-w*.075,
    y:longVertical?h*.075:0,
    radius:Math.max(3.4,Math.min(6.7,cross*.135))
  };
}
