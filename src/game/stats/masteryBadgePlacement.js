import official from './masteryRoofCalibration.json' with {type:'json'};

// Universal calibration, committed in this repo and bundled into every DEV build.
// Editor drafts are local ONLY until exported and merged into this JSON.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function normalizedMasteryCalibration(raw){
  const row=raw&&typeof raw==='object'?raw:{};
  const safe=(value,bound)=>{
    const n=Number(value);
    return Number.isFinite(n)?Math.round(clamp(n,-bound,bound)*100000000)/100000000:0;
  };
  return {x:safe(row.x,.65),y:safe(row.y,.65),size:safe(row.size,.42)};
}
export function getMasteryRoofCalibration(carId,view){
  if(view!=='lobby'&&view!=='race')return normalizedMasteryCalibration();
  return normalizedMasteryCalibration(official?.cars?.[String(carId||'')]?.[view]);
}
export function paintedCarBounds(rect,naturalWidth,naturalHeight){
  const w=Number(rect?.width)||0,h=Number(rect?.height)||0;
  if(w<=0||h<=0)return null;
  const nw=Math.max(1,Number(naturalWidth)||w),nh=Math.max(1,Number(naturalHeight)||h);
  const scale=Math.min(w/nw,h/nh);
  const width=nw*scale,height=nh*scale;
  return {left:(Number(rect?.left)||0)+(w-width)/2,top:(Number(rect?.top)||0)+(h-height)/2,width,height};
}
export function lobbyMasteryPlacement(rect,naturalWidth,naturalHeight,carId=null,override=null){
  const paint=paintedCarBounds(rect,naturalWidth,naturalHeight);
  if(!paint)return null;
  const cross=Math.min(paint.width,paint.height);
  const c=override?normalizedMasteryCalibration(override):getMasteryRoofCalibration(carId,'lobby');
  return{
    x:paint.left+paint.width*.5+c.x*cross,
    y:paint.top+paint.height*.46+c.y*cross,
    size:clamp(Math.max(15,Math.min(86,cross*.59))+c.size*cross,10,cross*.95),
    paintWidth:paint.width,paintHeight:paint.height
  };
}
export function raceMasteryPlacement(displayWidth,displayHeight,carId=null,override=null){
  const w=Math.max(1,Number(displayWidth)||1),h=Math.max(1,Number(displayHeight)||1);
  const cross=Math.min(w,h);
  const c=override?normalizedMasteryCalibration(override):getMasteryRoofCalibration(carId,'race');
  const baseRadius=Math.max(4.3,Math.min(16,cross*.315));
  return{
    x:c.x*cross,
    y:-Math.min(4,h*.045)+c.y*cross,
    radius:clamp(baseRadius+c.size*cross*.5,2,cross*.48)
  };
}
