// All race gates must cross the FULL authored road, including asymmetric
// Bézier-photo road edges. Never alter the course, gate center, travel normal,
// order, physics, or source Track Studio projects.
import {sampleShapeEdge,shapeIsValid} from '../studio/trackShapeGeometry.js';

const valid=p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y));
const vec=p=>Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p?.x),y:Number(p?.y)};
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const EPS=1e-6;

// Road geometry can come from the hand-adjusted photo-native Bézier shape or
// the actual procedural ribbon rendered by TrackBuilder (not a guessed width).
export function roadGateEdges(track,ribbon){
  if(shapeIsValid(track?.trackShape)){
    const shape=track.trackShape;
    return {left:sampleShapeEdge(shape.leftEdge,shape.closed,24),
      right:sampleShapeEdge(shape.rightEdge,shape.closed,24),
      closed:shape.closed,source:'bezier'};
  }
  const left=(ribbon?.left||[]).map(vec),right=(ribbon?.right||[]).map(vec);
  return {left,right,closed:track?.closed!==false,source:'ribbon'};
}

export function gateRoadCrossings(gate,road){
  if(!valid(gate?.a)||!valid(gate?.b))return null;
  const a=vec(gate.a),b=vec(gate.b),vx=b.x-a.x,vy=b.y-a.y;
  const span=Math.hypot(vx,vy);
  if(!(span>1))return null;
  const dir={x:vx/span,y:vy/span};
  const mid={x:(a.x+b.x)*.5,y:(a.y+b.y)*.5};
  const hits=[];
  for(const side of ['left','right']){
    const pts=road?.[side];
    if(!Array.isArray(pts)||pts.length<2)continue;
    const segments=road.closed?pts.length:pts.length-1;
    for(let i=0;i<segments;i++){
      const p=pts[i],q=pts[(i+1)%pts.length];
      if(!valid(p)||!valid(q))continue;
      const edge={x:q.x-p.x,y:q.y-p.y},det=cross(dir,edge);
      if(Math.abs(det)<EPS)continue;
      const delta={x:p.x-mid.x,y:p.y-mid.y};
      const u=cross(delta,dir)/det;
      if(u<-.00001||u>1.00001)continue;
      const t=cross(delta,edge)/det;
      if(Number.isFinite(t))hits.push({t,side});
    }
  }
  const negative=hits.filter(h=>h.t<-.001).sort((a,b)=>b.t-a.t)[0];
  const positive=hits.filter(h=>h.t>.001).sort((a,b)=>a.t-b.t)[0];
  if(!negative||!positive||negative.side===positive.side)return null;
  return {mid,dir,span,negative,positive};
}

export function widenGateToRoad(gate,road,{pad=4,trackWidth=80}={}){
  const hits=gateRoadCrossings(gate,road);
  if(!hits)return {gate,ok:false,reason:'no matching opposite road edges'};
  const {mid,dir,span,negative,positive}=hits;
  // Reject remote intersections with another nearby road segment. We only
  // extend across the CURRENT lane, never through hairpins or another road.
  const limit=Math.max(100,span*2.1,Number(trackWidth||80)*2.5);
  if(Math.max(-negative.t,positive.t)>limit)
    return {gate,ok:false,reason:'ambiguous remote edge intersection'};
  const half=span*.5;
  const from=Math.min(-half,negative.t-pad),to=Math.max(half,positive.t+pad);
  if(from>=-half-.001&&to<=half+.001)return {gate,ok:true,extended:false,roadWidth:positive.t-negative.t};
  return {gate:{...gate,
    a:{...gate.a,x:mid.x+dir.x*from,y:mid.y+dir.y*from},
    b:{...gate.b,x:mid.x+dir.x*to,y:mid.y+dir.y*to}},
    ok:true,extended:true,roadWidth:positive.t-negative.t};
}

// Called once when reading every circuit into the registry. Avoid changing
// image-native source files because installers deterministically regenerate them.
export function widenAllRaceGates(track,ribbon){
  if(!track||!track.finishLine)return track;
  const road=roadGateEdges(track,ribbon);
  const width=Number(track.trackWidth)||80;
  const widen=gate=>gate?.a&&gate?.b?widenGateToRoad(gate,road,{trackWidth:width}).gate:gate;
  return {...track,
    finishLine:widen(track.finishLine),
    startLine:widen(track.startLine),
    checkpoints:(track.checkpoints||[]).map(widen)};
}
