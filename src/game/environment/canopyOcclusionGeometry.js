// Environment Studio: the author traces ONLY foreground crowns/branches
// on the existing photographic background. These polygons are visual only.
import {validCollisionZone,pointInsidePolygon} from './FreehandCollisionZones.js';

const finite=n=>Number.isFinite(Number(n));
export function validCanopyZone(zone){
  return zone?.kind==='photo-canopy'&&validCollisionZone(zone)&&
    (zone.opacity===undefined||(finite(zone.opacity)&&Number(zone.opacity)>=.55&&Number(zone.opacity)<=1));
}
export function normalizedCanopyZones(zones,worldW=8192,worldH=8192){
  if(!Array.isArray(zones))return [];
  const w=Math.max(1,Number(worldW)||8192),h=Math.max(1,Number(worldH)||8192);
  return zones.slice(0,24).filter(validCanopyZone).filter(z=>z.points.every(p=>
    p.x>=0&&p.y>=0&&p.x<=w&&p.y<=h)).map(z=>({
      id:String(z.id||'canopy').slice(0,90),kind:'photo-canopy',
      opacity:Math.max(.55,Math.min(1,Number(z.opacity??.93))),
      points:z.points.map(p=>({x:Number(p.x),y:Number(p.y)}))
    }));
}
export function photoCanopyContains(zone,point){
  return validCanopyZone(zone)&&pointInsidePolygon(zone.points,point);
}
export function scaleCanopyZones(zones,scale){
  return (zones||[]).map(z=>({...z,points:(z.points||[]).map(p=>({
    x:Number(p.x)*scale,y:Number(p.y)*scale
  }))}));
}
