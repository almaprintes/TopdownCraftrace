// Reusable longitudinal characters. These scale acceleration and passive drag
// together, preserving the sustainable top speed while changing how quickly
// the car builds and sheds momentum.
export const LONGITUDINAL_PROFILES = Object.freeze({
  TOURING: Object.freeze({
    longitudinalResponse: 0.30,
    coastBlendStartKmh: 12,
    coastBlendEndKmh: 45,
    coastHighSpeedDragScale: 45,
    coastEngineBrakeRestore: 0
  }),
  RACE_STARTER: Object.freeze({
    longitudinalResponse: 0.72,
    coastBlendStartKmh: 12,
    coastBlendEndKmh: 45,
    coastHighSpeedDragScale: 45,
    coastEngineBrakeRestore: 0
  })
});
