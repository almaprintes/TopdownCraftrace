import assert from 'node:assert/strict';
import { captureIosRenderAuditSnapshot, formatIosRenderAuditSnapshot } from '../src/game/performance/iosRenderAuditSnapshot.js';

const shared={id:'checkpoint',type:'Graphics',scrollFactorX:1,scrollFactorY:1,cameraFilter:0,depth:18},road={id:'curb',type:'Graphics',scrollFactorX:1,scrollFactorY:1,cameraFilter:0,depth:12},hud={id:'speed',scrollFactorX:0,scrollFactorY:0};
const carRig={cameraFilter:2,visible:true};
const tile={texture:{key:'native:karting-americas:0:0',source:[{width:1024,height:512}]}};
const uiCam={id:2,renderList:[shared,hud]},main={renderList:[road,tile,shared]};
const scene={
  game:{canvas:{width:1440,height:900},renderer:{gl:{drawingBufferWidth:1440,drawingBufferHeight:900}}},
  cameras:{main,cameras:[main,uiCam]},uiCam,
  _trackBeautyTiles:[tile],_imageNativePrepared:{trackKey:'karting-americas',tiles:[{x:0,y:0,width:1024,height:512}]},cpGfx:shared,_curbOuter:road,carRig
};
const before={main:[...main.renderList],ui:[...uiCam.renderList]};
const value=captureIosRenderAuditSnapshot(scene);
assert.equal(value.canvasWidth,1440);
assert.equal(value.canvasHeight,900);
assert.equal(value.cameraCount,2);
assert.equal(value.mainObjects,3);
assert.equal(value.uiObjects,2);
assert.equal(value.sharedObjects,1);
assert.equal(value.uiWorldObjects,1);
assert.equal(value.sharedWorldObjects,1);
assert.equal(value.namedWorldCount,3);
assert.equal(value.namedWorldUnfiltered,2);
assert.equal(value.namedWorldActuallyInUi,1);
assert.match(value.namedWorldUnfilteredExamples[0],/curbOuter/);
assert.match(value.namedWorldUnfilteredExamples[1],/cpGfx/);
assert.equal(value.namedWorldUnfilteredExamples.some(x=>x.includes('carRig')),false);
assert.match(formatIosRenderAuditSnapshot(value),/NO EXCLUIDOS DE UI 2/);
assert.equal(value.photoTiles,1);
assert.equal(value.photoInMain,1);
assert.equal(value.photoInUi,0);
assert.equal(value.photoSourceCount,1);
assert.equal(value.photoCompactCount,0);
assert.equal(value.photoFullSizeCount,1);
assert.equal(value.photoUnmatchedCount,0);
assert.match(formatIosRenderAuditSnapshot(value),/ORIGINAL 1/);
assert.equal(value.photoRgbaEstimateMiB,2.0);
assert.deepEqual(main.renderList,before.main);
assert.deepEqual(uiCam.renderList,before.ui);
assert.match(formatIosRenderAuditSnapshot(value),/NO draw calls ni tiempo GPU/);
assert.match(formatIosRenderAuditSnapshot(value),/NO memoria total GPU/);
assert.equal(captureIosRenderAuditSnapshot(null).cameraCount,0);
tile.texture.source[0]={width:666,height:333};
const small=captureIosRenderAuditSnapshot(scene);
assert.equal(small.photoCompactCount,1);
assert.equal(small.photoFullSizeCount,0);
assert.equal(small.photoUnmatchedCount,0);
assert.match(small.photoSizeExamples[0],/COMPACTA/);
tile.texture.source[0]={width:800,height:333};
assert.equal(captureIosRenderAuditSnapshot(scene).photoUnmatchedCount,1);
console.log('iOS read-only render snapshot smoke OK (25+ assertions).');
