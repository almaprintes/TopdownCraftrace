// A mastery is an optional centered roof livery, sized to stay within
// the actual painted roof rather than cover the windscreen or bonnet. Values refer to the displayed artwork
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
  // Reduce the roof crest by ~15% without changing its centre or the car's scale.
  // Its visible SVG silhouette is slightly narrower than the artwork box.
  const cross=Math.min(paintW,paintH);
  const size=Math.max(16,Math.min(95,cross*.66));
  return{x,y,size,paintWidth:paintW,paintHeight:paintH};
}
// Race graphics remain mounted INSIDE the rotating car rig. Match the
// smaller lobby shield and never change chassis dimensions or driving physics.
export function raceMasteryPlacement(displayWidth,displayHeight){
  const w=Math.max(1,Number(displayWidth)||1),h=Math.max(1,Number(displayHeight)||1);
  const cross=Math.min(w,h);
  return{
    x:0,
    y:0,
    radius:Math.max(4.5,Math.min(18,cross*.35))
  };
}
