// DEV 1.2.204 — One-time optical softening for IN-RACE car sprites.
// Intentionally separate from original skins, lobby, garage and workshop art.
// Avoid global MSAA, WebGL post-FX, camera resolution changes and per-frame work.
export const RACE_CAR_LOOK=Object.freeze({
 maxTextureEdge:320,
 prefilterEdge:640,
 microBlurPixels:0.85,
 filterModeLinear:1
});
export const RACE_CAR_LOOK_SWITCH='tdr2:devRaceCarLook';
export function raceCarLookEnabled({prod=false,storage=globalThis.localStorage}={}){
 if(prod)return false; // Google Play/public build retains previously approved artwork.
 try{return storage?.getItem?.(RACE_CAR_LOOK_SWITCH)!=='off';}catch{return true;}
}
export function raceCarLookKey(original){return String(original)+'__raceSoft204';}
const sizeOf=image=>{
 const w=Number(image?.naturalWidth||image?.videoWidth||image?.width||0);
 const h=Number(image?.naturalHeight||image?.videoHeight||image?.height||0);
 return Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0?{w,h}:null;
};
const scaled=(w,h,limit)=>{
 const scale=Math.min(1,limit/Math.max(w,h));
 return{w:Math.max(1,Math.round(w*scale)),h:Math.max(1,Math.round(h*scale))};
};
const makeContext=(createCanvas,w,h)=>{
 const canvas=createCanvas();
 if(!canvas)return null;
 canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext?.('2d',{alpha:true,willReadFrequently:false});
 if(!ctx)return null;
 ctx.imageSmoothingEnabled=true;
 try{ctx.imageSmoothingQuality='high';}catch{}
 return{canvas,ctx};
};
export function raceCarLookTexture(scene,original,{
 prod=false,storage=globalThis.localStorage,
 createCanvas=()=>globalThis.document?.createElement?.('canvas')
}={}){
 if(!raceCarLookEnabled({prod,storage}))return original;
 const textures=scene?.textures;
 if(!original||!textures?.exists?.(original))return original;
 const key=raceCarLookKey(original);
 if(textures.exists(key))return key;
 let intermediate=null;
 try{
  const src=textures.get(original)?.getSourceImage?.();
  const dimensions=sizeOf(src);
  if(!dimensions)return original;
  const {w,h}=dimensions;
  // Two-stage area-reduction avoids a very sharp minification of large WebPs.
  // Intermediate size is capped to limit iPhone RAM and temporary allocations.
  let paintedSource=src;
  if(Math.max(w,h)>RACE_CAR_LOOK.prefilterEdge){
   const pre=scaled(w,h,RACE_CAR_LOOK.prefilterEdge);
   intermediate=makeContext(createCanvas,pre.w,pre.h);
   if(!intermediate)return original;
   intermediate.ctx.drawImage(src,0,0,pre.w,pre.h);
   paintedSource=intermediate.canvas;
  }
  const target=scaled(w,h,RACE_CAR_LOOK.maxTextureEdge);
  const output=makeContext(createCanvas,target.w,target.h);
  if(!output)return original;
  // Only the car's static pixels are softened; NEVER blur the race renderer.
  // Safari engines without Canvas2D.filter still get high-quality downsampling.
  try{output.ctx.filter='blur('+RACE_CAR_LOOK.microBlurPixels+'px)';}catch{}
  output.ctx.drawImage(paintedSource,0,0,target.w,target.h);
  const tex=textures.addCanvas?.(key,output.canvas);
  if(!tex)return original;
  // Linear texture sampling on rotation/scale; do not change global antialias.
  try{tex.setFilter?.(RACE_CAR_LOOK.filterModeLinear);}catch{}
  try{tex.source?.[0]?.setFilter?.(RACE_CAR_LOOK.filterModeLinear);}catch{}
  return key;
 }catch(error){
  try{console.warn('[race-car-look] original texture retained',error);}catch{}
  return original;
 }finally{
  // Release the temporary 640 px canvas after the final downsampling pass.
  if(intermediate?.canvas){intermediate.canvas.width=0;intermediate.canvas.height=0;}
 }
}
