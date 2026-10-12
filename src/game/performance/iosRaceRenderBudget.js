// iPhone portrait-sized iOS panels have substantially less sustained thermal
// headroom than recent iPads. Limit only the Phaser render framebuffer;
// do not resize authored track art, world coordinates, inputs or physics.
export function compactIphoneRenderBudget({ua='',screenMin=Infinity,preset='high',dpr=1}={}){
  const iphone=/iPhone/i.test(String(ua));
  const compact=iphone&&Number.isFinite(Number(screenMin))&&Number(screenMin)>0&&Number(screenMin)<=430;
  if(!compact)return null;
  const originalDpr=Math.max(1,Number(dpr)||1);
  const caps={performance:1,medium:1,high:1.0,ultra:1.5};
  const selected=Object.prototype.hasOwnProperty.call(caps,preset)?preset:'high';
  const resolution=Math.min(originalDpr,caps[selected]);
  return {resolution,preset:selected,reason:'compact-ios-thermal-budget'};
}
