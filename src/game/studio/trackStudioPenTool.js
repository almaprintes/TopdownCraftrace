// Photoshop-style pen anchors for TrackStudio. Pure functions; image coordinates
// are never rescaled. Nothing changes in the .tdrtrack schema.
export const PEN_DRAG_THRESHOLD_PX=10;

export function createPenAnchor(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid pen coordinates');
  return {x,y,handleIn:{x,y},handleOut:{x,y}};
}

export function penGestureIsCurve(startScreen,endScreen,threshold=PEN_DRAG_THRESHOLD_PX){
  return Number.isFinite(startScreen?.x)&&Number.isFinite(startScreen?.y)&&
    Number.isFinite(endScreen?.x)&&Number.isFinite(endScreen?.y)&&
    Math.hypot(endScreen.x-startScreen.x,endScreen.y-startScreen.y)>threshold;
}

export function updatePenAnchorFromDrag(anchor,startWorld,currentWorld,curved){
  const next=createPenAnchor(anchor.x,anchor.y);
  if(!curved)return next; // Tap = corner; both handles exactly at anchor.
  const dx=currentWorld.x-startWorld.x,dy=currentWorld.y-startWorld.y;
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return next;
  // Symmetric tangent: drag in the direction the centerline continues.
  next.handleIn={x:anchor.x-dx,y:anchor.y-dy};
  next.handleOut={x:anchor.x+dx,y:anchor.y+dy};
  return next;
}
