export const SPARK_IDLE_RPM = 950;
export const SPARK_REDLINE_RPM = 7200;

// The recordings are six pitch stages of the same engine. These anchors give
// each stage a stable operating range while the source playback rate closes
// the small pitch gap inside each crossfade.
export const SPARK_SAMPLE_RPM = Object.freeze([950, 1850, 2900, 4050, 5350, 7100]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function targetSparkRpm(kmh, throttle, attainableTopKmh = 60) {
  const top = Math.max(30, Number(attainableTopKmh) || 60);
  const road = clamp(Number(kmh) || 0, 0, top) / top;
  const gas = clamp(Number(throttle) || 0, 0, 1);
  const roadRpm = SPARK_IDLE_RPM + Math.pow(road, 0.82) * 5200;
  const loadRpm = Math.pow(gas, 0.72) * (1700 + road * 350);
  return clamp(roadRpm + loadRpm, SPARK_IDLE_RPM, SPARK_REDLINE_RPM);
}

export function advanceSparkRpm(currentRpm, targetRpm, throttle, elapsedSeconds) {
  const current = clamp(Number(currentRpm) || SPARK_IDLE_RPM, SPARK_IDLE_RPM, SPARK_REDLINE_RPM);
  const target = clamp(Number(targetRpm) || SPARK_IDLE_RPM, SPARK_IDLE_RPM, SPARK_REDLINE_RPM);
  const gas = clamp(Number(throttle) || 0, 0, 1);
  const dt = clamp(Number(elapsedSeconds) || 0, 0, 0.12);
  const rate = target >= current ? 4200 + gas * 1800 : 3600;
  const step = rate * dt;
  return target >= current ? Math.min(target, current + step) : Math.max(target, current - step);
}

export function sparkSampleMix(rpm, anchors = SPARK_SAMPLE_RPM) {
  const points = Array.from(anchors, Number);
  const levels = points.map(() => 0);
  const rates = points.map(() => 1);
  if (!points.length) return { levels, rates, lower: -1, upper: -1, fraction: 0 };
  if (points.length === 1 || rpm <= points[0]) {
    levels[0] = 1;
    return { levels, rates, lower: 0, upper: 0, fraction: 0 };
  }
  const last = points.length - 1;
  if (rpm >= points[last]) {
    levels[last] = 1;
    return { levels, rates, lower: last, upper: last, fraction: 0 };
  }

  let lower = 0;
  while (lower < last - 1 && rpm > points[lower + 1]) lower += 1;
  const upper = lower + 1;
  const fraction = clamp((rpm - points[lower]) / Math.max(1, points[upper] - points[lower]), 0, 1);

  // Equal-power crossfade avoids the level dip of a linear blend. A restrained
  // opposing pitch bend makes adjacent recordings meet instead of sounding
  // like two unrelated engines during the transition.
  levels[lower] = Math.cos(fraction * Math.PI * 0.5);
  levels[upper] = Math.sin(fraction * Math.PI * 0.5);
  rates[lower] = 1 + fraction * 0.08;
  rates[upper] = 0.92 + fraction * 0.08;
  return { levels, rates, lower, upper, fraction };
}
