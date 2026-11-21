import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {measureLateralUse,summarizeLateralUse} from '../src/game/online/craftraceRacingLineTelemetry.js';
const line={centerline:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],
 limits:[40,40,40,40]};
const center=measureLateralUse(line,50,0,1);
const half=measureLateralUse(line,50,20,1);
assert.ok(center&&Math.abs(center.fraction)<1e-8);
assert.ok(half&&Math.abs(half.absoluteFraction-.5)<1e-8);
assert.equal(measureLateralUse({},50,20),null);
assert.deepEqual(summarizeLateralUse([center,half]),
 {samples:2,meanPct:25,maxPct:50,nearEdgePct:0});
const preview=readFileSync('src/game/online/craftraceDirectorPreview.js','utf8');
for(const key of ['sampleShapeEdge','shapeIsValid','data-roadstats','data-roadreport',
  'measureLateralUse','hasAuthoredBounds','lineGraphics.destroy'])
 assert.ok(preview.includes(key),'Missing visual diagnostics '+key);
console.log('PASS authored road borders and nearest-segment physical lateral telemetry');
