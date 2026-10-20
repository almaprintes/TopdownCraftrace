import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  THERMAL_TOUCH_LEVELS,PREVIOUS_RACE_MEASUREMENT_KEY,
  loadPreviousRaceMeasurement,savePreviousRaceMeasurement,
  localMeasurementTime,formatMeasurementDuration,previousMeasurementContext
} from '../src/game/support/raceMeasurementContext.js';
const saved=new Map();
const storage={
  getItem:key=>saved.get(key)??null,
  setItem:(key,value)=>saved.set(key,value),
  removeItem:key=>saved.delete(key)
};
const epoch=Date.UTC(2026,9,20,8,0,0);
assert.equal(loadPreviousRaceMeasurement(storage,epoch),null,'No fake prior test');
assert.equal(savePreviousRaceMeasurement(storage,{finishedAt:epoch,fps:45.5,over50Percent:4,p95:50}),true);
assert.ok(saved.get(PREVIOUS_RACE_MEASUREMENT_KEY)?.includes('45.5'));
assert.equal(loadPreviousRaceMeasurement(storage,epoch+600000).fps,45.5);
assert.equal(loadPreviousRaceMeasurement(storage,epoch+600000).over50Percent,4);
assert.match(previousMeasurementContext(loadPreviousRaceMeasurement(storage,epoch+600000),epoch+600000),/10min/);
assert.match(previousMeasurementContext(null,epoch),/SIN PRUEBA GUARDADA/);
assert.equal(loadPreviousRaceMeasurement(storage,epoch+100*86400000),null,'Old samples expire');
assert.match(localMeasurementTime(epoch),/2026/);
assert.equal(formatMeasurementDuration(3661000),'1h 1min');
assert.equal(formatMeasurementDuration(55000),'55s');
assert.equal(formatMeasurementDuration(-5),'NO DISPONIBLE');
assert.deepEqual(THERMAL_TOUCH_LEVELS,['SIN INDICAR','FRÍO','TEMPLADO','CALIENTE','MUY CALIENTE']);
assert.equal(loadPreviousRaceMeasurement({getItem:()=>{throw Error('blocked');}},epoch),null);
assert.equal(savePreviousRaceMeasurement({setItem:()=>{throw Error('blocked');}},{finishedAt:epoch,fps:50}),false);
const diag=fs.readFileSync('src/game/dev/iosRaceFrameDiagnostics.js','utf8');
assert.match(diag,/loadPreviousRaceMeasurement\(localStorage,state\.measurementStartedAt\)/);
assert.match(diag,/savePreviousRaceMeasurement\(localStorage,/);
assert.match(diag,/CALOR AL TACTO \(MANUAL\)/);
assert.match(diag,/SIN SENSOR TÉRMICO/);
assert.match(diag,/FECHA INICIO/);
assert.match(diag,/FECHA ACTUAL/);
assert.match(diag,/DURACIÓN /);
assert.match(diag,/SEGUNDO PLANO /);
assert.match(diag,/addEventListener\('visibilitychange',onVisibilityChange/);
assert.match(diag,/removeEventListener\('visibilitychange',onVisibilityChange/);
assert.match(diag,/navigator\.getBattery\(\)/);
assert.match(diag,/if\(!state\.active\)return/);
assert.match(diag,/if\(state\.active&&w\.count>0&&w\.frameSum>0\)/);
console.log('PASS: opt-in performance timestamps, prior-run comparisons, manual heat, visible/background and optional battery');
