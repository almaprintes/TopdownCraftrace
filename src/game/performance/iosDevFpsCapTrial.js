// DEV-only, opt-in iPhone A/B trial of the Phaser render/update FPS cap.
// Defaults preserve the existing behavior; never affect production, Android,
// iPad, safe mode, or a lower limit already selected by the current preset.
// Switching modes requires a game reload because Phaser selects its main
// TimeStep implementation when the game is constructed.
export const IOS_DEV_FPS_CAP_KEY='tdr2:devIosFpsCap60:v1';
export const IOS_DEV_FPS_CAP_TTL_MS=20*60*1000;
// A/B experiments expire automatically; the old persistent '1' is invalid.

export function resolveIosDevFpsCap({baseLimit=0,isIphone=false,isProd=true,safeMode=false,storage=null,now=Date.now()}={}){
  const raw=Number(baseLimit);
  const baseline=Number.isFinite(raw)&&raw>=0?raw:0;
  const unchanged={limit:baseline,baseLimit:baseline,mode:'BASE'};
  if(!isIphone||isProd||safeMode||(baseline>0&&baseline<=60))return unchanged;
  try{
    const expiry=Number(storage?.getItem?.(IOS_DEV_FPS_CAP_KEY));
    if(Number.isFinite(expiry)&&expiry>now&&expiry<=now+IOS_DEV_FPS_CAP_TTL_MS)
      return {limit:60,baseLimit:baseline,mode:'CAP_60'};
  }catch{}
  return unchanged;
}
