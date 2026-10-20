// Reversible DEV-only Phaser loop-driver A/B for iPhone.
// Baseline remains rAF with SAFE NO, just as before this trial.
// Keep Android, iPad and production on their established scheduling paths.
export const IOS_DEV_TIMEOUT_KEY='tdr2:devIosTimeoutLoop:v1';
export function resolveIosDevLoopDriver({
  isIphone=false,isProd=true,safeMode=false,forceRaf=false,storage=null
}={}){
  // Preserve the existing rescue path and its legacy force-RAF override.
  const baseline=!!safeMode&&!forceRaf;
  if(isProd||!isIphone||safeMode)
    return {forceSetTimeOut:baseline,mode:safeMode?(baseline?'SAFE TIMEOUT':'SAFE RAF'):'RAF'};
  try{
    if(storage?.getItem?.(IOS_DEV_TIMEOUT_KEY)==='1')
      return {forceSetTimeOut:true,mode:'TIMEOUT'};
  }catch{}
  return {forceSetTimeOut:false,mode:'RAF'};
}
