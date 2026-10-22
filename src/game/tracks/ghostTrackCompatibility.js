// Ghosts store WORLD coordinates, not screen positions. Old Atlántico (100%)
// recordings cannot safely be drawn on the published 70% circuit.
import { ATLANTICO_WORLD_SCALE } from './atlanticoWorldScale.js';
const ATLANTICO_IDS=new Set(['circuito-atlantico','circuito-atlantico-inverso']);
const SANTA_CRUZ_IDS=new Set(['santa-cruz','santa-cruz-inverso']);
const finite=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n));
const coord=n=>Math.round(Number(n)*10)/10;

// Fingerprint race-space geometry, not photo resolution, camera zoom or PB time.
export function ghostGeometryRevision(trackKey,track){
  const key=String(trackKey||'');
  if(!track||!finite(track.worldW)||!finite(track.worldH))return null;
  const line=Array.isArray(track.raceCenterline)&&track.raceCenterline.length>1
    ?track.raceCenterline:(Array.isArray(track.centerline)?track.centerline:[]);
  if(line.length<2)return null;
  const points=[];
  for(let i=0;i<16;i++){const p=line[Math.round((line.length-1)*i/15)];points.push([coord(p.x),coord(p.y)]);}
  const finish=track.finishLine?.a&&track.finishLine?.b
    ?[track.finishLine.a,track.finishLine.b].map(p=>[coord(p.x),coord(p.y)]):[];
  const value=JSON.stringify([key,coord(track.worldW),coord(track.worldH),line.length,points,finish]);
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return 'geo1:'+String(hash>>>0).padStart(10,'0');
}

function distanceSqToRoad(x,y,points){
  let best=Infinity;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y);
    const len=dx*dx+dy*dy;
    const t=len>1e-8?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/len)):0;
    const ox=x-Number(a.x)-dx*t,oy=y-Number(a.y)-dy*t;
    best=Math.min(best,ox*ox+oy*oy);
  }
  return best;
}

export function ghostReplayCompatibility(ghost,trackKey,track){
  const key=String(trackKey||''),revision=ghostGeometryRevision(key,track);
  const answer=(compatible,reason)=>({compatible,reason,geometryRevision:revision});
  if(!ghost||!Array.isArray(ghost.samples)||ghost.samples.length<2)return answer(false,'missing');
  if(ghost.trackKey&&String(ghost.trackKey)!==key)return answer(false,'track');
  if(!ghost.samples.every(p=>finite(p?.x)&&finite(p?.y)&&finite(p?.t)))return answer(false,'samples');
  if(ghost.geometryRevision)return answer(Boolean(revision)&&ghost.geometryRevision===revision,
    ghost.geometryRevision===revision?'current':'geometry-changed');

  // Santa Cruz was redrawn at different world coordinates, just like
  // Atlántico was rescaled. Unversioned ghosts from either must fit today's
  // photographed road, including online challenges and reverse layouts.
  // Leave historical recordings from all OTHER tracks untouched.
  const isAtlantic=ATLANTICO_IDS.has(key)&&
    Math.abs(Number(track?.meta?.imageNative?.worldScale)-ATLANTICO_WORLD_SCALE)<.0001;
  const isSantaCruz=SANTA_CRUZ_IDS.has(key);
  if(!isAtlantic&&!isSantaCruz)return answer(true,'legacy-unchanged');
  const road=Array.isArray(track?.raceCenterline)&&track.raceCenterline.length>2
    ?track.raceCenterline:track?.centerline;
  if(!Array.isArray(road)||road.length<3||!finite(track.trackWidth)||Number(track.trackWidth)<=0)
    return answer(false,'geometry-unavailable');
  const samples=ghost.samples,count=Math.min(32,samples.length),margin=Math.max(35,Number(track.trackWidth)*.85);
  let current=0,old=0;
  for(let i=0;i<count;i++){
    const p=samples[Math.round((samples.length-1)*i/Math.max(1,count-1))];
    const x=Number(p.x),y=Number(p.y);
    if(distanceSqToRoad(x,y,road)<=margin*margin)current++;
    if(distanceSqToRoad(x*ATLANTICO_WORLD_SCALE,y*ATLANTICO_WORLD_SCALE,road)<=margin*margin)old++;
  }
  const fit=current/count,oldFit=old/count;
  const compatible=fit>=.74&&(!isAtlantic||!(oldFit>=.8&&fit<.82));
  return answer(compatible,compatible?'legacy-current':
    isAtlantic&&oldFit>=.8&&fit<.74?'legacy-100-percent':'off-current-road');
}
