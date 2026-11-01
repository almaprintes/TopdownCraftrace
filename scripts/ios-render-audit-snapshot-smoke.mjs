import assert from 'node:assert/strict';
import { captureIosRenderAuditSnapshot, formatIosRenderAuditSnapshot } from '../src/game/performance/iosRenderAuditSnapshot.js';

const shared={id:'hud'},road={id:'ground'},hud={id:'speed'};
const tile={texture:{key:'photo:0',source:[{width:1024,height:512}]}};
const uiCam={renderList:[shared,hud]},main={renderList:[road,tile,shared]};
const scene={
  game:{canvas:{width:1440,height:900},renderer:{gl:{drawingBufferWidth:1440,drawingBufferHeight:900}}},
  cameras:{main,cameras:[main,uiCam]},uiCam,
  _trackBeautyTiles:[tile]
};
const before={main:[...main.renderList],ui:[...uiCam.renderList]};
const value=captureIosRenderAuditSnapshot(scene);
assert.equal(value.canvasWidth,1440);
assert.equal(value.canvasHeight,900);
assert.equal(value.cameraCount,2);
assert.equal(value.mainObjects,3);
assert.equal(value.uiObjects,2);
assert.equal(value.sharedObjects,1);
assert.equal(value.photoTiles,1);
assert.equal(value.photoInMain,1);
assert.equal(value.photoInUi,0);
assert.equal(value.photoSourceCount,1);
assert.equal(value.photoRgbaEstimateMiB,2.0);
assert.deepEqual(main.renderList,before.main);
assert.deepEqual(uiCam.renderList,before.ui);
assert.match(formatIosRenderAuditSnapshot(value),/NO draw calls ni tiempo GPU/);
assert.match(formatIosRenderAuditSnapshot(value),/NO memoria total GPU/);
assert.equal(captureIosRenderAuditSnapshot(null).cameraCount,0);
console.log('iOS read-only render snapshot smoke OK (16 assertions).');
