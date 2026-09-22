// Reusable sample profiles. Keep these values declarative so a proven engine
// sound can be assigned to another car without reconstructing its mix by hand.
export const ENGINE_AUDIO_PROFILES = Object.freeze({
  JEEP: Object.freeze({
    id: 'JEEP',
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
