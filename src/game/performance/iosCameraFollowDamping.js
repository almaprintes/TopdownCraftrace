// SlotRace-style time-based damping for Phaser's existing follow camera.
// At 60 Hz this matches the previous 0.12 lerp exactly.
export function iosCameraFollowAlpha(deltaMs,baseAlpha=0.12){
  const ms=Number(deltaMs);
  const frameMs=Number.isFinite(ms)&&ms>0?Math.min(ms,50):1000/60;
  return 1-Math.pow(1-baseAlpha,frameMs/(1000/60));
}
