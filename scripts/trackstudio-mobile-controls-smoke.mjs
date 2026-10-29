// Regression from iPhone DEV 1.3.55: arrows, visible +/−, fit view, and
// a single MAP action. Test the ACTUAL Scene methods, not duplicated logic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {trackCameraWorldAt,fitTrackCamera} from '../src/game/studio/trackStudioZoom.js';

const source=fs.readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const chrome=fs.readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
const menu=fs.readFileSync('src/game/studio/trackStudioSourceMenu.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/name="tdr-dev-version" content="DEV 1\.3\.61"/);

function snippet(begin,end){
  const start=source.indexOf(begin),stop=source.indexOf(end,start);
  assert.ok(start>=0&&stop>start,'Missing Scene methods '+begin);
  return source.slice(start,stop).trim();
}
const methods=[
  snippet('_frameTrackView(){','  _trackWidthStep() {'),
  snippet('  _nudgeSelectedNode(dx, dy) {','_deleteSelectedNode()')
].join('\n');
const RealSceneMethods=new Function('fitTrackCamera','return class { '+methods+' };')(fitTrackCamera);

const cam={
  x:118,y:90,width:640,height:420,scrollX:250,scrollY:1600,zoom:1,
  setZoom(z){this.zoom=z;},
  centerOn(x,y){this.centerTarget={x,y};this.scrollX=x-this.width/2;this.scrollY=y-this.height/2;},
  getWorldPoint(sx,sy){return trackCameraWorldAt(this,sx,sy);}
};
const node={x:654,y:2281,handleIn:{x:600,y:2250},handleOut:{x:700,y:2320}};
const calls=[];
const scene=Object.assign(new RealSceneMethods(),{_editCam:cam,_nodes:[node],_selectedNode:0,
  _editZoomMin:.02,_editZoomMax:2.5,
  _editorWorldW:8000,_editorWorldH:5000,
  _pushHistory(){calls.push('undo')},_autosaveRecovery(){calls.push('recovery')},
  _redrawEditor(){calls.push('redraw')},_updatePanel(){calls.push('panel')}
});
const screenX=()=>cam.x+cam.width/2+(node.x-cam.scrollX-cam.width/2)*cam.zoom;
const screenY=()=>cam.y+cam.height/2+(node.y-cam.scrollY-cam.height/2)*cam.zoom;
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,msg+': '+a+' '+b);
const oldX=node.x,oldScreenX=screenX(),oldY=node.y,oldScreenY=screenY();
assert.equal(scene._moveSelectedNodeOnScreen(10,0),true,'→ must move selected node');
assert.ok(node.x>oldX,'RIGHT must INCREASE actual authored X');
near(screenX()-oldScreenX,10,'RIGHT moves on-screen right');
near(node.handleIn.x-600,node.x-oldX,'Incoming handle follows node');
near(node.handleOut.x-700,node.x-oldX,'Outgoing handle follows node');
assert.equal(scene._moveSelectedNodeOnScreen(-10,0),true);
near(node.x,oldX,'← restores authored X');near(screenX(),oldScreenX,'← returns to initial screen X');
assert.equal(scene._moveSelectedNodeOnScreen(0,-10),true);
near(screenY()-oldScreenY,-10,'↑ moves visually UP');
assert.equal(scene._moveSelectedNodeOnScreen(0,10),true);
near(node.y,oldY,'↓ restores authored Y');
assert.equal(scene._moveSelectedNodeOnScreen(0,0),false);
assert.ok(calls.filter(x=>x==='undo').length>=4,'Each action undoable');
assert.ok(calls.filter(x=>x==='recovery').length>=4,'Each action stored for recovery');

scene._imageCanvas={width:2862,height:3435};
assert.equal(scene._frameTrackView(),true);
near(cam.centerTarget.x,1431,'Fit center image X');
near(cam.centerTarget.y,1717.5,'Fit center image Y');
assert.ok(cam.zoom>0&&cam.zoom<.3,'Fit whole photo instead of world rectangle');
scene._imageCanvas=null;
assert.equal(scene._frameTrackView(),true);
assert.ok(cam.centerTarget.x>0,'Frame nodes when no image');

assert.ok(chrome.includes("button('TODO'"),'Explicit full-view control');
assert.ok(chrome.includes('changeZoom(1.25)'),'Plus 25 percent');
assert.ok(chrome.includes('changeZoom(1/1.25)'),'Minus inverse');
assert.ok(!chrome.includes("button('IMG'"),'No duplicate IMG rail button');
assert.ok(chrome.includes("button('MAP'"),'MAP remains primary import');
assert.ok(menu.includes("['5','IMAGEN DE REFERENCIA'"),'Reference guide remains in ABRIR');
assert.ok(chrome.includes("scene._openReferenceTools=()=>"),'Reference tools not lost');
console.log('PASS: screen-right/up nudge, undo/recovery, fit photograph, zoom +/- and single MAP.');
