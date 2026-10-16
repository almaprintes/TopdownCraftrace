// Reusable sample profiles. Keep these values declarative so a proven engine
// sound can be assigned to another car without reconstructing its mix by hand.
import { CAR_SPECS } from '../cars/carSpecs.js';

export const ENGINE_AUDIO_PROFILES = Object.freeze({
  // DEV-wide engine trial: a single, proven CC0 racing engine bank on
  // every playable vehicle. The legacy named presets remain available in
  // production and can be restored after the driver's listening test.
  TDR_RACE_UNIVERSAL: Object.freeze({
    id: 'TDR_RACE_UNIVERSAL',
    kind: 'rpm-bank',
    sampleBank: 'SPARK_SIX',
    idleRpm: 1000,
    redlineRpm: 7500,
    sampleRpmAnchors: Object.freeze([1000, 1950, 2950, 4120, 5450, 7100]),
    roadExponent: 0.79,
    roadRpmSpan: 5400,
    throttleExponent: 0.68,
    standingLoadRpmSpan: 3700,
    roadLoadReduction: 2300,
    riseRateBase: 5050,
    riseRateLoad: 2350,
    fallRate: 4200,
    pitchScale: 0.98,
    sampleGainBase: 0.63,
    sampleLoadGain: 0.23,
    cabinFrequencyBase: 480,
    cabinFrequencyRange: 610,
    cabinGainBase: 1.35,
    cabinGainRpmReduction: 0.35,
    cabinLoadGain: 0.35,
    lowBodyGainBase: 2.8,
    lowBodyRpmReduction: 0.55,
    roofFrequencyBase: 4600,
    roofFrequencyRange: 3100,
    roofLoadRange: 520
  }),
  AVENIR_GRIPLINE: Object.freeze({
    id: 'AVENIR_GRIPLINE',
    kind: 'rpm-bank',
    sampleBank: 'SPARK_SIX',
    idleRpm: 1050,
    redlineRpm: 7600,
    sampleRpmAnchors: Object.freeze([1050, 2000, 3150, 4400, 5800, 7500]),
    roadExponent: 0.78,
    roadRpmSpan: 5700,
    throttleExponent: 0.70,
    standingLoadRpmSpan: 3600,
    roadLoadReduction: 2750,
    riseRateBase: 4700,
    riseRateLoad: 2000,
    fallRate: 4000,
    pitchScale: 1.035,
    sampleGainBase: 0.68,
    sampleLoadGain: 0.22,
    cabinFrequencyBase: 520,
    cabinFrequencyRange: 520,
    cabinGainBase: 1.4,
    cabinGainRpmReduction: 0.35,
    cabinLoadGain: 0.35,
    lowBodyGainBase: 2.0,
    lowBodyRpmReduction: 0.6,
    roofFrequencyBase: 4800,
    roofFrequencyRange: 3600,
    roofLoadRange: 650
  }),
  JEEP: Object.freeze({
    id: 'JEEP',
    kind: 'single-sample',
    sourceUrl: 'assets/audio/engine/jeep/engine.wav',
    sourceSha256: '8299d3d595fe4c6b2ed9cf73f7d4ead854e7f97470e59178e8ff9a0b15a41645',
    loop: true,
    initialPlaybackRate: 1.1,
    initialGain: 0.8,
    minPlaybackRate: 0.62,
    playbackRateRange: 1.28,
    playbackRateSmoothing: 0.045,
    baseGain: 0.62,
    loadGain: 0.25,
    coastGainReduction: 0.10,
    gainSmoothing: 0.055
  })
});

// Central DEV-only routing, pure and testable without a browser/WebAudio.
// Never change the car specs: engine sounds must NOT change handling or stats.
export function selectEngineAudioProfile(carId, requested, {dev = false} = {}) {
  const id = String(carId || '').trim();
  if (dev && Object.prototype.hasOwnProperty.call(CAR_SPECS, id)) {
    return ENGINE_AUDIO_PROFILES.TDR_RACE_UNIVERSAL;
  }
  const key = String(requested || '').trim();
  return ENGINE_AUDIO_PROFILES[key] || null;
}
