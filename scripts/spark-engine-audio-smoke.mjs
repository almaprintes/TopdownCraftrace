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
import { ENGINE_AUDIO_PROFILES } from '../src/game/audio/EngineAudioProfiles.js';
import {
  advanceProfiledRpm,
  profiledSampleMix,
  targetProfiledRpm
} from '../src/game/audio/ProfiledRpmEngineModel.js';
import { CAR_SPECS } from '../src/game/cars/carSpecs.js';

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
assert.ok(stationaryRev >= 4000 && stationaryRev <= 4400, 'stationary throttle must rev like a race car without jumping to redline');
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

const jeep = ENGINE_AUDIO_PROFILES.JEEP;
assert.equal(CAR_SPECS.helix_vortex.engineAudioProfile, 'JEEP', 'Vortex must keep the approved Jeep audio profile');
assert.equal(jeep.sourceUrl, 'assets/audio/engine/jeep/engine.wav');
assert.equal(jeep.sourceSha256, '8299d3d595fe4c6b2ed9cf73f7d4ead854e7f97470e59178e8ff9a0b15a41645');
assert.equal(jeep.initialPlaybackRate, 1.1);
assert.equal(jeep.initialGain, 0.8);
assert.equal(jeep.minPlaybackRate, 0.62);
assert.equal(jeep.playbackRateRange, 1.28);
assert.equal(jeep.playbackRateSmoothing, 0.045);
assert.equal(jeep.baseGain, 0.62);
assert.equal(jeep.loadGain, 0.25);
assert.equal(jeep.coastGainReduction, 0.10);
assert.equal(jeep.gainSmoothing, 0.055);
assert.ok(runtime.includes("ENGINE_AUDIO_PROFILES[requested]"), 'sample cars must resolve their named audio profile');
assert.ok(!runtime.includes('const VORTEX_URL'), 'Vortex sample settings must not remain as loose constants');

const jeepPath = `${root}public/${jeep.sourceUrl}`;
const jeepInfo = await stat(jeepPath);
assert.ok(jeepInfo.size > 300_000, 'Jeep profile must contain the real local WAV asset');
const jeepBytes = await readFile(jeepPath, { encoding: null });
assert.equal(jeepBytes.subarray(0, 4).toString('ascii'), 'RIFF', 'Jeep profile must be RIFF/WAV');
assert.equal(jeepBytes.subarray(8, 12).toString('ascii'), 'WAVE', 'Jeep profile must be RIFF/WAV');
assert.equal(createHash('sha256').update(jeepBytes).digest('hex'), jeep.sourceSha256, 'Jeep WAV must match the preserved source');

const gripline = ENGINE_AUDIO_PROFILES.AVENIR_GRIPLINE;
assert.equal(CAR_SPECS.avenir_gripline.engineAudioProfile, 'AVENIR_GRIPLINE', 'Gripline must declare its RPM-bank profile');
assert.equal(gripline.kind, 'rpm-bank');
assert.equal(gripline.sampleBank, 'SPARK_SIX');
assert.equal(gripline.idleRpm, 1050);
assert.equal(gripline.redlineRpm, 7600);
assert.equal(gripline.sampleRpmAnchors.length, names.length, 'Gripline must map every audited RPM sample');
assert.ok(gripline.pitchScale > 1, 'Gripline must sound brighter than the starter');
assert.equal(targetProfiledRpm(gripline, 0, 0, 90), gripline.idleRpm, 'Gripline stationary idle must remain stable');
const griplineStationaryRev = targetProfiledRpm(gripline, 0, 1, 90);
assert.ok(griplineStationaryRev >= 4500 && griplineStationaryRev <= 4800, 'Gripline must rev eagerly while stationary without jumping to redline');
assert.equal(targetProfiledRpm(gripline, 90, 1, 90), gripline.redlineRpm, 'Gripline must reach redline at attainable top speed');
assert.ok(advanceProfiledRpm(gripline, 1100, 7000, 1, 0.05) > 1100, 'Gripline RPM must rise under throttle');
assert.ok(advanceProfiledRpm(gripline, 7000, 2000, 0, 0.05) < 7000, 'Gripline RPM must fall after throttle release');
const griplineMix = profiledSampleMix(gripline, 3750);
assert.equal(griplineMix.levels.filter(level => level > 0).length, 2, 'Gripline may only crossfade adjacent layers');
const griplinePower = griplineMix.levels.reduce((sum, level) => sum + level * level, 0);
assert.ok(Math.abs(griplinePower - 1) < 1e-9, 'Gripline crossfade must preserve constant power');
assert.ok(griplineMix.rates.some(rate => rate > 1), 'Gripline pitch calibration must be applied');
assert.ok(runtime.includes("mode === 'rpm-bank'"), 'runtime must build and update profiled RPM banks');

console.log('Spark + Gripline engine audio smoke: OK');
