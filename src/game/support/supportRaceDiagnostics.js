// Opt-in support diagnostics for any device. This is NOT a security
// boundary: the tap gesture only prevents accidental exposure to players.
// Keeping permission in sessionStorage (with TTL) survives a game reload for
// a supported A/B test without changing account, save, or video settings.
export const SUPPORT_DIAGNOSTICS_KEY='tdr2:supportRaceDiagnosticsUntil:v1';
export const SUPPORT_DIAGNOSTICS_DURATION_MS=30*60*1000;
export const SUPPORT_TAP_COUNT=7;
export const SUPPORT_TAP_WINDOW_MS=5000;

export function supportDiagnosticsEnabled(storage,now=Date.now()){
  try{
    const expiry=Number(storage?.getItem?.(SUPPORT_DIAGNOSTICS_KEY)||0);
    return Number.isFinite(expiry)&&expiry>now;
  }catch{return false;}
}
export function setSupportDiagnosticsEnabled(storage,enabled,now=Date.now()){
  try{
    if(!enabled){storage?.removeItem?.(SUPPORT_DIAGNOSTICS_KEY);return true;}
    storage?.setItem?.(SUPPORT_DIAGNOSTICS_KEY,String(now+SUPPORT_DIAGNOSTICS_DURATION_MS));
    return supportDiagnosticsEnabled(storage,now);
  }catch{return false;}
}
export function advanceSupportUnlockTap(state,now=Date.now()){
  const prev=state||{count:0,lastAt:0};
  const within=Number.isFinite(now)&&now>=prev.lastAt&&(now-prev.lastAt)<=SUPPORT_TAP_WINDOW_MS;
  const count=(within?prev.count:0)+1;
  return {count:count>=SUPPORT_TAP_COUNT?0:count,lastAt:now,unlocked:count>=SUPPORT_TAP_COUNT};
}
