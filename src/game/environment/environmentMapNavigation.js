// Environment Studio camera maths, independent of Phaser for smoke tests.
// Extra empty screen space lets an editor place collision nodes on the very
// edge of a photo without its edge disappearing behind the viewport border.
export const EDITOR_EDGE_PAN_PX=112;

export function editorCameraPanBounds(worldW,worldH,viewW,viewH,zoom,paddingPx=EDITOR_EDGE_PAN_PX){
  const z=Math.max(.0001,Number(zoom)||1);
  const w=Math.max(1,Number(worldW)||1),h=Math.max(1,Number(worldH)||1);
  const vw=Math.max(1,Number(viewW)||1),vh=Math.max(1,Number(viewH)||1);
  const pad=Math.max(0,Number(paddingPx)||0)/z;
  const minX=-pad,minY=-pad;
  return {x:-pad,y:-pad,width:w+2*pad,height:h+2*pad,
    minX,minY,
    maxX:Math.max(minX,w+pad-vw/z),
    maxY:Math.max(minY,h+pad-vh/z)};
}

// World coordinate under the previous midpoint stays under the new one.
// If both fingers travel together, their distance and zoom stay constant,
// and this reduces to a pure map pan in both axes.
export function scrollForTwoFingerMapGesture(scrollX,scrollY,camX,camY,fromMid,toMid,oldZoom,newZoom){
  const before=Math.max(.0001,Number(oldZoom)||1);
  const after=Math.max(.0001,Number(newZoom)||1);
  return {
    x:scrollX+(fromMid.x-camX)/before-(toMid.x-camX)/after,
    y:scrollY+(fromMid.y-camY)/before-(toMid.y-camY)/after
  };
}

export function clampEditorScroll(scrollX,scrollY,bounds){
  return {
    x:Math.max(bounds.minX,Math.min(bounds.maxX,scrollX)),
    y:Math.max(bounds.minY,Math.min(bounds.maxY,scrollY))
  };
}
