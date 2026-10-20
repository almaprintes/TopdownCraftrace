// DEV-only, iPhone-only framebuffer A/B. Never modify authored track
// image resolution, game world scale, physics, Android or production.
export const IOS_DEV_RESOLUTION_KEY='tdr2:devIosFramebufferScale:v1';

export function resolveIosDevResolution({baseResolution=1,isIphone=false,isProd=true,storage=null}={}){
  const raw=Number(baseResolution);
  const base=Number.isFinite(raw)&&raw>0?raw:1;
  const unchanged={resolution:base,baseResolution:base,mode:'BASE'};
  if(!isIphone||isProd||base<=1)return unchanged;
  try{
    if(storage?.getItem?.(IOS_DEV_RESOLUTION_KEY)==='1.0')
      return {resolution:1,baseResolution:base,mode:'LOW'};
  }catch{}
  return unchanged;
}
