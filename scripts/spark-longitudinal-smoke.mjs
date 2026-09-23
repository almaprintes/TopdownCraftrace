import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CAR_SPECS } from '../src/game/cars/carSpecs.js';
import { LONGITUDINAL_PROFILES } from '../src/game/cars/longitudinalProfiles.js';
import { attainableTopSpeedKmh } from '../src/game/cars/speedUnits.js';

const DT = 1 / 60;
const root = fileURLToPath(new URL('../', import.meta.url));
const publishedOverrides = JSON.parse(await readFile(`${root}public/community/car-overrides.json`, 'utf8'));
const publishedSpark = publishedOverrides?.cars?.helix_spark;
assert.ok(publishedSpark, 'the published Spark override must exist');
const spark = {
  ...CAR_SPECS.helix_spark,
  ...publishedSpark,
  maxFwd: publishedSpark.maxFwd * 1.40
};
assert.equal(LONGITUDINAL_PROFILES.TOURING.longitudinalResponse, 0.30, 'the approved touring response must remain reusable');
assert.equal(spark.longitudinalResponse, 0.72, 'Spark must use the race starter response');
for (const [carId, spec] of Object.entries(CAR_SPECS)) {
  if (carId !== 'helix_spark') {
    assert.equal(spec.longitudinalResponse, undefined, `${carId} must retain its established longitudinal response`);
  }
}
const response = spark.longitudinalResponse;
const effectiveAccel = spark.accel * response;
const effectiveDrag = spark.linearDrag * response;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep01 = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function accelerationMarks(seconds = 30) {
  const marks = new Map([[15, null], [45, null], [55, null], [80, null], [84, null]]);
  let speed = 0;
  const frames = Math.round(seconds / DT);
  for (let frame = 0; frame < frames; frame += 1) {
    const speed01 = clamp(speed / spark.maxFwd, 0, 1);
    speed += effectiveAccel * (1 - Math.pow(speed01, 1.8)) * DT;
    speed *= Math.exp(-effectiveDrag * DT * 60);
    const kmh = speed * 0.185;
    for (const target of marks.keys()) {
      if (marks.get(target) === null && kmh >= target) marks.set(target, frame * DT);
    }
  }
  return marks;
}

function coastSeconds(startKmh, targetKmh) {
  let speed = startKmh / 0.185;
  let elapsed = 0;
  while (speed * 0.185 > targetKmh && elapsed < 30) {
    speed = Math.max(0, speed - spark.engineBrake * 0.05 * DT);
    speed *= Math.exp(-effectiveDrag * DT * 60);
    const kmh = speed * 0.185;
    const blend = smoothstep01(
      (kmh - spark.coastBlendStartKmh) /
      (spark.coastBlendEndKmh - spark.coastBlendStartKmh)
    );
    const coastScale = 60 + (spark.coastHighSpeedDragScale - 60) * blend;
    speed *= Math.exp(effectiveDrag * DT * (60 - coastScale));
    const restoreRate = spark.engineBrake * (0.05 - 0.008) * spark.coastEngineBrakeRestore * blend;
    speed += Math.min(speed * 0.08, restoreRate * DT);
    elapsed += DT;
  }
  return elapsed;
}

const marks = accelerationMarks();
assert.ok(marks.get(15) >= 0.20 && marks.get(15) <= 0.35, `0–15 km/h must feel immediate but progressive (${marks.get(15)} s)`);
assert.ok(marks.get(45) >= 0.85 && marks.get(45) <= 1.2, `0–45 km/h must feel like a race car (${marks.get(45)} s)`);
assert.ok(marks.get(55) >= 1.2 && marks.get(55) <= 1.7, `the approach through 55 km/h must remain progressive (${marks.get(55)} s)`);
assert.ok(marks.get(80) >= 3.3 && marks.get(80) <= 4.1, `the approach through 80 km/h must take time (${marks.get(80)} s)`);
assert.ok(marks.get(84) >= 5.8 && marks.get(84) <= 7.0, `0–84 km/h must remain progressive (${marks.get(84)} s)`);

const highCoast = coastSeconds(45, 15);
const lowCoast = coastSeconds(15, 0.5);
assert.ok(highCoast >= 1.8 && highCoast <= 2.4, `45–15 coast must be controlled (${highCoast} s)`);
assert.ok(lowCoast >= 2.3 && lowCoast <= 2.9, `15–0 coast must not collapse abruptly (${lowCoast} s)`);
assert.ok(Math.abs(highCoast - lowCoast) < 0.8, 'coast timing must remain continuous around 15 km/h');

const top = attainableTopSpeedKmh(spark, 40);
assert.ok(top >= 83.5 && top <= 85.5, `attainable top speed must remain at the published 84 km/h (${top} km/h)`);

console.log(
  `Spark longitudinal smoke: OK · 0–45 ${marks.get(45).toFixed(2)} s · 0–84 ${marks.get(84).toFixed(2)} s · 45–15 ${highCoast.toFixed(2)} s · 15–0 ${lowCoast.toFixed(2)} s · top ${top.toFixed(1)} km/h`
);
