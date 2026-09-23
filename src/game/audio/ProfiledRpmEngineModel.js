import { sparkSampleMix } from './SparkEngineModel.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function targetProfiledRpm(profile, kmh, throttle, attainableTopKmh = 60) {
  const idle = Number(profile?.idleRpm) || 950;
  const redline = Math.max(idle + 1, Number(profile?.redlineRpm) || 7200);
  const top = Math.max(30, Number(attainableTopKmh) || 60);
  const road = clamp(Number(kmh) || 0, 0, top) / top;
  const gas = clamp(Number(throttle) || 0, 0, 1);
  const roadRpm = idle + Math.pow(road, Number(profile?.roadExponent) || 0.82) * (Number(profile?.roadRpmSpan) || 5200);
  const loadSpan = Math.max(0, (Number(profile?.standingLoadRpmSpan) || 3250) - road * (Number(profile?.roadLoadReduction) || 1200));
  const loadRpm = Math.pow(gas, Number(profile?.throttleExponent) || 0.72) * loadSpan;
  return clamp(roadRpm + loadRpm, idle, redline);
}

export function advanceProfiledRpm(profile, currentRpm, targetRpm, throttle, elapsedSeconds) {
  const idle = Number(profile?.idleRpm) || 950;
  const redline = Math.max(idle + 1, Number(profile?.redlineRpm) || 7200);
  const current = clamp(Number(currentRpm) || idle, idle, redline);
  const target = clamp(Number(targetRpm) || idle, idle, redline);
  const gas = clamp(Number(throttle) || 0, 0, 1);
  const dt = clamp(Number(elapsedSeconds) || 0, 0, 0.12);
  const rate = target >= current
    ? (Number(profile?.riseRateBase) || 4200) + gas * (Number(profile?.riseRateLoad) || 1800)
    : (Number(profile?.fallRate) || 3600);
  const step = rate * dt;
  return target >= current ? Math.min(target, current + step) : Math.max(target, current - step);
}

export function profiledSampleMix(profile, rpm) {
  const mix = sparkSampleMix(rpm, profile?.sampleRpmAnchors);
  const pitchScale = Math.max(0.25, Number(profile?.pitchScale) || 1);
  return {
    ...mix,
    rates: mix.rates.map(rate => rate * pitchScale)
  };
}
