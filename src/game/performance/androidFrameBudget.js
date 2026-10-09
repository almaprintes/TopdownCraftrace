// Phaser fps.target is a hint, not an actual frame-rate cap.
// On Android, honor the existing video presets using fps.limit so the GPU
// does not draw as often in battery/performance mode. Keep iOS/web unchanged.
const FPS_BY_PRESET=Object.freeze({performance:30,medium:45,high:60,ultra:60});
export function androidFrameBudget(preset,isAndroid){
  if(!isAndroid)return {targetFps:60,limit:0};
  const key=Object.prototype.hasOwnProperty.call(FPS_BY_PRESET,preset)?preset:'high';
  const targetFps=FPS_BY_PRESET[key];
  return {targetFps,limit:targetFps};
}
