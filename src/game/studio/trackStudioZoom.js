// Phaser cameras zoom around the CENTER of their viewport, not its top-left.
// Compute the world point under a physical screen coordinate in that model.
// This file contains only math and is independently regression-tested.
export function trackCameraWorldAt(cam,screenX,screenY){
  if(!cam||!(cam.zoom>0))throw Error('Invalid editing camera');
  const halfWidth=cam.width/2,halfHeight=cam.height/2;
  return {
    x:cam.scrollX+halfWidth+(screenX-cam.x-halfWidth)/cam.zoom,
    y:cam.scrollY+halfHeight+(screenY-cam.y-halfHeight)/cam.zoom
  };
}
export function zoomTrackCameraAt(cam,screenX,screenY,factor,minZoom=0.12,maxZoom=2.5){
  if(!cam||!Number.isFinite(factor)||factor<=0||
    !Number.isFinite(screenX)||!Number.isFinite(screenY))return false;
  const oldZoom=cam.zoom;
  if(!Number.isFinite(oldZoom)||oldZoom<=0)return false;
  const nextZoom=Math.max(minZoom,Math.min(maxZoom,oldZoom*factor));
  if(Math.abs(nextZoom-oldZoom)<1e-9)return false;
  const before=trackCameraWorldAt(cam,screenX,screenY);
  cam.setZoom(nextZoom);
  // Adjust scroll in world units for the true camera pivot.
  const after=trackCameraWorldAt(cam,screenX,screenY);
  cam.scrollX+=before.x-after.x;
  cam.scrollY+=before.y-after.y;
  return true;
}
// The anchor is the world location initially between the fingertips. With
// pinch + pan together, this point must stay below the CURRENT midpoint.
export function beginTrackPinch(cam,p1,p2){
  const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;
  return {
    startDist:Math.max(1,Math.hypot(p2.x-p1.x,p2.y-p1.y)),
    startZoom:cam.zoom,
    anchor:trackCameraWorldAt(cam,mx,my)
  };
}
export function updateTrackPinch(cam,gesture,p1,p2,minZoom=0.12,maxZoom=2.5){
  if(!gesture||!cam)return false;
  const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;
  const distance=Math.max(1,Math.hypot(p2.x-p1.x,p2.y-p1.y));
  const nextZoom=Math.max(minZoom,Math.min(maxZoom,
    gesture.startZoom*distance/gesture.startDist));
  cam.setZoom(nextZoom);
  const actual=trackCameraWorldAt(cam,mx,my);
  cam.scrollX+=gesture.anchor.x-actual.x;
  cam.scrollY+=gesture.anchor.y-actual.y;
  return true;
}

// Fit an authored image or set of nodes without changing any world geometry.
// SetZoom and centerOn use Phaser's real camera transform and map bounds.
export function fitTrackCamera(cam,bounds,minZoom=0.02,maxZoom=2.5,padding=1.08){
  if(!cam||!bounds||!(bounds.width>0)||!(bounds.height>0))return false;
  if(!(cam.width>0)||!(cam.height>0))return false;
  const zoom=Math.max(minZoom,Math.min(maxZoom,
    Math.min(cam.width/(bounds.width*padding),cam.height/(bounds.height*padding))));
  cam.setZoom(zoom);
  cam.centerOn(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  return true;
}
