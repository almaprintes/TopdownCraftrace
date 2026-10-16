import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPenAnchor,penGestureIsCurve,updatePenAnchorFromDrag} from '../src/game/studio/trackStudioPenTool.js';
function cubic(a,b,t) {
  const u=1-t;
  return {
    x:u*u*u*a.x+3*u*u*t*a.handleOut.x+3*u*t*t*b.handleIn.x+t*t*t*b.x,
    y:u*u*u*a.y+3*u*u*t*a.handleOut.y+3*u*t*t*b.handleIn.y+t*t*t*b.y
  };
}
// Tap, tap -> cubic with collapsed handles is mathematically a line.
const first=createPenAnchor(100,100),second=createPenAnchor(500,100);
assert.deepEqual(first.handleIn,{x:100,y:100});
assert.deepEqual(second.handleOut,{x:500,y:100});
for(const t of [0,.1,.25,.5,.75,1])assert.equal(cubic(first,second,t).y,100,'Tap-tap is straight');
// Tap and drag while holding creates symmetric Photoshop-style handles.
const third=updatePenAnchorFromDrag(createPenAnchor(600,400),
  {x:600,y:400},{x:720,y:340},true);
assert.deepEqual(third.handleIn,{x:480,y:460});
assert.deepEqual(third.handleOut,{x:720,y:340});
assert.notEqual(cubic(second,third,.5).y,250,'Tapped and dragged next node bends the segment');
assert.equal(penGestureIsCurve({x:100,y:100},{x:108,y:103}),false,'Minor finger jitter counts as tap');
assert.equal(penGestureIsCurve({x:100,y:100},{x:115,y:106}),true,'Dragging counts as curve');
const original=JSON.stringify(second);
const tap=updatePenAnchorFromDrag(second,{x:500,y:100},{x:570,y:180},false);
assert.deepEqual(tap,second,'Tapping preserves corner geometry');
assert.equal(JSON.stringify(second),original,'Pure model never mutates the original point');
assert.throws(()=>createPenAnchor(Infinity,2));
const scene=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const palette=readFileSync('src/game/studio/trackStudioGateControls.js','utf8');
for(const requirement of [
  "installTrackStudioGateControls(this)",
  "_setTool(tool) {",
  "if(this._tool==='pen' && !this._shapeEditing)",
  "this._penGesture={",
  "const curved=penGestureIsCurve(g.startScreen",
  "this._pushHistory();\n      this._nodes.push(node);",
  "this._autosaveRecovery();",
  "if(this._penGesture){",
  "this._cancelPenGesture();\n      if (this._guideDragging)",
  "const candidate=updatePenAnchorFromDrag(",
  "this._sampleCubicBezier(prev,prev.handleOut,candidate.handleIn,candidate,24)",
  "this._cancelPenGesture();\n    if(tool==='pen' && this._shapeEditing)"
])assert.ok(scene.includes(requirement),'Missing pen workflow: '+requirement);
assert.ok(palette.includes("make('pen','PLUMA')") && palette.includes("btn.setAttribute('aria-pressed',String(chosen))"),'Pen selection must be visible in the dock');
assert.ok(scene.includes("this._penPreviewGfx"),'Interactive curve preview must be rendered separately');
assert.ok(scene.includes("this._gestureWasMultiTouch=true;"),'Multitouch cancels pen and retains pinch');
console.log('TrackStudio PL: straight corners, drag-to-curve symmetry, preview, undo/autosave, pinch cancel, editable original geometry: OK');
