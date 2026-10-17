// DEV-only A/B. Rendering context flags are set when Phaser creates WebGL;
// never change them mid-race. Keep production and other devices untouched.
export const IOS_WEBGL_SYNC_KEY='tdr2:devIosWebglSync:v1';
export function iosDesynchronizedContext({isIos=false,isProd=true,storage=null}={}){
  if(!isIos)return false;
  if(isProd)return true;
  try{return storage?.getItem?.(IOS_WEBGL_SYNC_KEY)!=='1';}
  catch{return true;}
}
