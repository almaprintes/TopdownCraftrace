// Compare complete factorial physics results before and after opt-in calibration.
import {readFileSync} from 'node:fs';
const original=JSON.parse(readFileSync('artifacts/live4-bezier-dice-physics.json','utf8')).summary;
const calibrated=JSON.parse(readFileSync('artifacts/live4-bezier-dice-calibrated.json','utf8')).summary;
const rows=original.perDie.map((before,i)=>({
 face:before.face,
 beforeSeconds:before.elapsedSeconds?.mean,
 calibratedSeconds:calibrated.perDie[i].elapsedSeconds?.mean,
 beforePlannedPx:before.planningPx?.mean,
 calibratedPlannedPx:calibrated.perDie[i].planningPx?.mean,
 beforeRouteDeviationPx:before.realizedPathOffsetPx?.mean,
 calibratedRouteDeviationPx:calibrated.perDie[i].realizedPathOffsetPx?.mean,
 completedBefore:before.completed,
 completedCalibrated:calibrated.perDie[i].completed
}));
for(const r of rows)if(r.completedCalibrated!==r.completedBefore)
 throw Error('Calibration changed finish rate: '+JSON.stringify(r));
console.log('DICE_CALIBRATION_COMPARISON='+JSON.stringify({
 rows,
 baselinePaired:original.pairedFace1vs6,
 candidatePaired:calibrated.pairedFace1vs6,
 benchmarkCount:calibrated.setup.actualRuns
}));
if(calibrated.setup.actualRuns!==1260)throw Error('Expected 1260 physical scenarios');
console.log('PASS physically safe paired comparison (not proof of timing monotonicity).');
