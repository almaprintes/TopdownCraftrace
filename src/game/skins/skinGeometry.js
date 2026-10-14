import official from './skinGeometry.json' with {type:'json'};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const SKIN_GEOMETRY_EXPORT='tdr-skin-geometry.json';
export function normalizeSkinGeometry(value){
 const row=value&&typeof value==='object'?value:{};
 const finite=(v,a,b)=>Number.isFinite(Number(v))?Math.round(clamp(Number(v),a,b)*100000000)/100000000:0;
 const degree=Number(row.rotation)||0;
 return {
  x:finite(row.x,-.65,.65),y:finite(row.y,-.65,.65),
  scale:finite(row.scale,-.45,.45),
  rotation:Number.isFinite(degree)?((Math.round(degree/90)%4+4)%4)*90:0
 };
}
export function skinGeometry(carId,skinId,overrides=null){
 return normalizeSkinGeometry(overrides?.[carId]?.[skinId]??official?.cars?.[carId]?.[skinId]);
}
export function skinGeometryForSprite(carId,skinId,width,height,overrides=null){
 const v=skinGeometry(carId,skinId,overrides),size=Math.max(1,Math.min(Number(width)||1,Number(height)||1));
 return{x:v.x*size,y:v.y*size,scale:1+v.scale,rotation:v.rotation};
}
export function mergeSkinGeometry(saved,draft){
 const cars={...saved?.cars};
 for(const [id,perSkin] of Object.entries(draft||{})){
  if(!perSkin||typeof perSkin!=='object')continue;
  cars[id]={...(cars[id]||{})};
  for(const [skin,row] of Object.entries(perSkin))cars[id][skin]=normalizeSkinGeometry(row);
 }
 return{schema_version:1,units:'car_short_axis_ratio',cars};
}
