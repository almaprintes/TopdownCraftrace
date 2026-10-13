// The authored 'raceDirection' field describes traversal order, not
// clockwise/anticlockwise. The registry's raceCenterline is already oriented.
// In canvas coordinates y increases downward; positive signed area is
// clockwise on screen, negative is counterclockwise.
export function trackDisplayDirection(track={}){
  if(track.closed===false)return 'stage';
  const line=Array.isArray(track.raceCenterline)&&track.raceCenterline.length>=3
    ?track.raceCenterline:track.centerline;
  if(Array.isArray(line)&&line.length>=3){
    let signedAreaTwice=0;
    for(let i=0;i<line.length;i++){
      const a=line[i],b=line[(i+1)%line.length];
      const x1=Number(a?.x),y1=Number(a?.y),x2=Number(b?.x),y2=Number(b?.y);
      if(![x1,y1,x2,y2].every(Number.isFinite))return 'unknown';
      signedAreaTwice+=x1*y2-x2*y1;
    }
    if(Math.abs(signedAreaTwice)>1)return signedAreaTwice<0?'counterclockwise':'clockwise';
  }
  return 'unknown';
}
