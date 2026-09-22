import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  SPARK_IDLE_RPM,
  SPARK_REDLINE_RPM,
  advanceSparkRpm,
  sparkSampleMix,
  targetSparkRpm
} from '../src/game/audio/SparkEngineModel.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['loop_0.wav', 'loop_1_0.wav', 'loop_2_0.wav', 'loop_3_0.wav', 'loop_4_0.wav', 'loop_5_0.wav'];
const hashes = [
  '69d74b106509037ce547429e4c3f9ae906b0fffe88d0bb8b3b5a8b0cfc239048',
  '0bc6bf7e1ad33d347ed805b4f2b55d1f79e38f892006f98acbe85a3177ff77a2',
  'e26bef6f1804670aba02b6b9a8c5485cf05a6a1e902a5a50c098230ace49967f',
  '015aee5cd2dec394b28ff0994360c780cfbe29c3cddfb16dba8df81b4a68eea2',
  'fadf4420104d9273e6cc0a1c4583d863937af382382866251fc2b8dc005f9369',
  'e0c65476764931770e46308dec744a196d8ecf996f8c7675f125805d28609b34'
];

assert.equal(targetSparkRpm(0, 0), SPARK_IDLE_RPM, 'stationary idle must remain at idle');
const stationaryRev = targetSparkRpm(0, 1, 84);
assert.ok(stationaryRev >= 2500 && stationaryRev <= 3000, 'stationary throttle must rev clearly without jumping to redline');
assert.ok(targetSparkRpm(15, 1, 84) < targetSparkRpm(45, 1, 84), 'moving RPM must rise with real road speed');
assert.equal(targetSparkRpm(84, 1, 84), SPARK_REDLINE_RPM, 'full throttle at attainable top speed must reach redline');
assert.ok(targetSparkRpm(45, 1, 84) > targetSparkRpm(45, 0, 84), 'throttle must add engine load at the same speed');
assert.ok(advanceSparkRpm(1000, 7000, 1, 0.05) > 1000, 'RPM must rise under throttle');
assert.ok(advanceSparkRpm(7000, 2000, 0, 0.05) < 7000, 'RPM must fall when throttle is released');

const mix = sparkSampleMix(3475);
assert.equal(mix.levels.filter(level => level > 0).length, 2, 'only adjacent sample layers may be audible');
const power = mix.levels.reduce((sum, level) => sum + level * level, 0);
assert.ok(Math.abs(power - 1) < 1e-9, 'crossfade must preserve constant power');

for (const [index, name] of names.entries()) {
  const path = `${root}public/assets/audio/engine/spark/${name}`;
  const info = await stat(path);
  assert.ok(info.size > 50_000, `${name} must contain the real WAV asset`);
  const header = await readFile(path, { encoding: null });
  assert.equal(header.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must be RIFF/WAV`);
  assert.equal(header.subarray(8, 12).toString('ascii'), 'WAVE', `${name} must be RIFF/WAV`);
  assert.equal(createHash('sha256').update(header).digest('hex'), hashes[index], `${name} must be the audited source asset`);
}

const runtime = await readFile(`${root}src/game/audio/CarEngineSampleRuntime.js`, 'utf8');
assert.ok(!runtime.includes('raw.githubusercontent.com/yashimosh'), 'Spark must not depend on GitHub Raw at runtime');
assert.ok(!runtime.includes('new Audio('), 'Spark must not use independent HTML media clocks');
assert.ok(runtime.includes('createBufferSource'), 'Spark must use WebAudio buffer sources');
assert.ok(runtime.includes('attainableTopSpeedKmh'), 'Spark RPM must use the car attainable speed');

console.log('Spark engine audio smoke: OK');
