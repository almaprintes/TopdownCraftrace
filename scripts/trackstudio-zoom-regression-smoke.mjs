// Prevent regressions from screenshot DEV 1.3.54:
// +/- must have opposite zoom directions, and a two-finger pinch must keep
// the WORLD point under the fingertips' CURRENT midpoint exactly fixed.
import assert from 'node:assert/strict';
import {trackCameraWorldAt,zoomTrackCameraAt,beginTrackPinch,updateTrackPinch}
  from '../src/game/studio/trackStudioZoom.js';
import fs from 'node:fs';
const fake=()=>({
  x:118,y:90,width:660,height:460,scrollX:3590,scrollY:2130,zoom:.67,
  setZoom(v){this.zoom=v}
});
const near=(a,b,why)=>assert.ok(Math.abs(a-b)<1e-8,why+': '+a+' vs '+b);
const cam=fake(),mx=cam.x+cam.width/2,my=cam.y+cam.height/2;
const anchor=trackCameraWorldAt(cam,mx,my),old=cam.zoom;
assert.equal(zoomTrackCameraAt(cam,mx,my,1.15,.12,2.5),true);
assert.ok(cam.zoom>old,'PLUS must increase zoom');
near(trackCameraWorldAt(cam,mx,my).x,anchor.x,'PLUS x anchor');
near(trackCameraWorldAt(cam,mx,my).y,anchor.y,'PLUS y anchor');
const afterPlus=cam.zoom;
assert.equal(zoomTrackCameraAt(cam,mx,my,1/1.15,.12,2.5),true);
assert.ok(cam.zoom<afterPlus,'MINUS must DECREASE zoom');
near(cam.zoom,old,'PLUS then MINUS restores initial zoom');
near(trackCameraWorldAt(cam,mx,my).x,anchor.x,'MINUS x anchor');
near(trackCameraWorldAt(cam,mx,my).y,anchor.y,'MINUS y anchor');
// A pinch away from the viewport center: the bug pushed map left because
// camera.x and camera.width/2 were not included in the camera transform.
const pinchCam=fake();
const p1={x:460,y:250},p2={x:640,y:360};
const gesture=beginTrackPinch(pinchCam,p1,p2);
const before={...gesture.anchor},start=pinchCam.zoom;
updateTrackPinch(pinchCam,gesture,{x:440,y:230},{x:670,y:390},.12,2.5);
assert.ok(pinchCam.zoom>start,'Spread must zoom IN');
let midX=(440+670)/2,midY=(230+390)/2;
near(trackCameraWorldAt(pinchCam,midX,midY).x,before.x,'pinch zoom IN x anchor');
near(trackCameraWorldAt(pinchCam,midX,midY).y,before.y,'pinch zoom IN y anchor');
updateTrackPinch(pinchCam,gesture,{x:490,y:275},{x:600,y:340},.12,2.5);
assert.ok(pinchCam.zoom<start,'Pinch together must zoom OUT');
midX=(490+600)/2;midY=(275+340)/2;
near(trackCameraWorldAt(pinchCam,midX,midY).x,before.x,'pinch OUT x anchor');
near(trackCameraWorldAt(pinchCam,midX,midY).y,before.y,'pinch OUT y anchor');
// Both fingers translating with unchanged distance must PAN at fixed zoom.
const panCam=fake(),panG=beginTrackPinch(panCam,p1,p2);
const panZoom=panCam.zoom;
updateTrackPinch(panCam,panG,{x:p1.x+70,y:p1.y+40},{x:p2.x+70,y:p2.y+40});
near(panCam.zoom,panZoom,'translate no zoom');
near(trackCameraWorldAt(panCam,550+70,305+40).x,panG.anchor.x,'pan x anchor');
near(trackCameraWorldAt(panCam,550+70,305+40).y,panG.anchor.y,'pan y anchor');
// Clamping must not flip a zoom-out gesture into a zoom-in gesture.
const clamped=fake();clamped.zoom=.12;
assert.equal(zoomTrackCameraAt(clamped,mx,my,1/1.15,.12,2.5),false);
near(clamped.zoom,.12,'min zoom clamp');
const scene=fs.readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const shell=fs.readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
const shape=fs.readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const image=fs.readFileSync('src/game/studio/installImageMode.js','utf8');
assert.ok(scene.includes('updateTrackPinch(this._editCam,this._mapGesture,p1,p2'));
assert.ok(scene.includes('zoomTrackCameraAt(cam,midpointX,midpointY,multiplier'));
assert.ok(shell.includes("scene._openCanvasImagePicker?.()"));
assert.ok(shell.includes('ts-lab__notice'));
assert.ok(shell.includes('this._msgText?.destroy?.()'));
assert.ok(shape.includes("if(!s._imageCanvas?.imageId)"));
assert.ok(image.includes('s._openCanvasImagePicker=()=>'));
console.log('PASS Track Studio: +/- directions, centered pinch, two-finger pan, clamping, master photo and DOM notifications');
