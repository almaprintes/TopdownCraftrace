import official from './masteryRoofCalibration.json' with {type:'json'};

// One global calibration per car, shared by lobby and actual race rig.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function normalizedMasteryCalibration(raw){
  const row=raw&&typeof raw==='object'?raw:{};
  const safe=(value,bound)=>{
    const n=Number(value);
    return Number.isFinite(n)?Math.round(clamp(n,-bound,bound)*100000000)/100000000:0;
  };
  const rawAngle=Number(row.rotation)||0;
  const rotation=Number.isFinite(rawAngle)?((Math.round(rawAngle/90)%4+4)%4)*90:0;
  return {x:safe(row.x,.65),y:safe(row.y,.65),size:safe(row.size,.42),rotation};
}
// Read old schema v1 drafts: preserve lobby as canonical, race as fallback.
export function canonicalMasteryCalibration(raw){
  const row=raw&&typeof raw==='object'?raw:{};
  return normalizedMasteryCalibration(row.lobby??row.race??row);
}
export function getMasteryRoofCalibration(carId,_legacyView){
  return canonicalMasteryCalibration(official?.cars?.[String(carId||'')]);
}
export function paintedCarBounds(rect,naturalWidth,naturalHeight){
  const w=Number(rect?.width)||0,h=Number(rect?.height)||0;
  if(w<=0||h<=0)return null;
  const nw=Math.max(1,Number(naturalWidth)||w),nh=Math.max(1,Number(naturalHeight)||h);
  const scale=Math.min(w/nw,h/nh);
  const width=nw*scale,height=nh*scale;
  return {left:(Number(rect?.left)||0)+(w-width)/2,top:(Number(rect?.top)||0)+(h-height)/2,width,height};
}
// The SAME car-local anchor, size and offsets are used in both renderers.
export function carLocalMasteryPlacement(width,height,carId=null,override=null){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
  const cross=Math.min(w,h);
  const c=override?canonicalMasteryCalibration(override):getMasteryRoofCalibration(carId);
  return {
    x:c.x*cross,
    y:-.04*h+c.y*cross,
    size:clamp((.59+c.size)*cross,cross*.20,cross*.95),
    rotation:c.rotation
  };
}
export function lobbyMasteryPlacement(rect,naturalWidth,naturalHeight,carId=null,override=null){
  const paint=paintedCarBounds(rect,naturalWidth,naturalHeight);
  if(!paint)return null;
  const p=carLocalMasteryPlacement(paint.width,paint.height,carId,override);
  return {
    x:paint.left+paint.width*.5+p.x,
    y:paint.top+paint.height*.5+p.y,
    size:p.size,paintWidth:paint.width,paintHeight:paint.height,rotation:p.rotation
  };
}
export function raceMasteryPlacement(displayWidth,displayHeight,carId=null,override=null){
  const p=carLocalMasteryPlacement(displayWidth,displayHeight,carId,override);
  return {x:p.x,y:p.y,radius:p.size*.5,rotation:p.rotation};
}
