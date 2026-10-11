// TrackStudio visual controls are measured in SCREEN pixels, not world units.
// The same dimensions are used by rendering and by finger hit testing.
// No track, Bezier, image or driving data is modified by this module.
export const EDITOR_CONTROL_PIXELS=Object.freeze({
  node:9, selectedNode:12, handle:7, selectedHandle:9,
  touchNode:25, touchHandle:23, halo:2.5
});
export function worldControlRadius(screenPixels,zoomRaw){
  const zoom=Math.max(.02,Number(zoomRaw)||1);
  return screenPixels/zoom;
}
export function pickCenterlineControl(nodes,selectedIndex,world,zoomRaw){
  if(!Array.isArray(nodes)||![world?.x,world?.y].every(Number.isFinite))return null;
  const zoom=Math.max(.02,Number(zoomRaw)||1);
  const distance=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
    ?Math.hypot(p.x-world.x,p.y-world.y)*zoom:Infinity;
  // A finger should select whichever anchor is closest, rather than whichever
  // happened to be inserted last. Visible anchors outrank hidden handles.
  let nearest=null,best=EDITOR_CONTROL_PIXELS.touchNode;
  for(let i=0;i<nodes.length;i++){
    const d=distance(nodes[i]);
    if(d<=best){best=d;nearest={type:'node',index:i};}
  }
  const selected=nodes[selectedIndex];
  if(selected){
    const anchorDistance=distance(selected);
    let handle=null,handleDistance=EDITOR_CONTROL_PIXELS.touchHandle;
    for(const part of ['handleIn','handleOut']){
      const d=distance(selected[part]);
      if(d<handleDistance){handleDistance=d;handle={type:part,index:selectedIndex};}
    }
    // Anchor wins overlaps; otherwise select only a VISIBLE selected handle.
    if(handle && handleDistance+3<anchorDistance &&
       (!nearest || handleDistance+3<best))return handle;
  }
  return nearest;
}
