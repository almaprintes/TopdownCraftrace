// RACE Control Phase 2: independent, server-side-ready GEOMETRY DIAGNOSTIC.
// SHADOW ONLY. Do not call this from the live publish RPC or classify old PBs.
// Official track JSON is read from a TRUSTED server checkout, not from a client.
// Uses the same ribbon builder and swept checkpoint crossings as the game.
import {createHash} from 'node:crypto';
import {buildTrackRibbon} from '../tracks/TrackBuilder.js';
import {widenAllRaceGates} from '../tracks/raceGateWidth.js';
import {loopPathMetrics,sampleLoopAt,crossesDirectedFinishGate}
  from '../tracks/closedCircuitGateOrder.js';

const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function nearestOnRoad(point,metrics){
  const {points,cumulative}=metrics;
  let best=null;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
    if(len2<1e-8)continue;
    const u=clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/len2,0,1);
    const x=a.x+u*dx,y=a.y+u*dy,d2=(point.x-x)**2+(point.y-y)**2;
    if(!best||d2<best.d2){
      const width=(Number(a.width)||66)+(Number(b.width||a.width||66)-Number(a.width||66))*u;
      best={d2,distance:Math.sqrt(d2),routeDistance:cumulative[i]+u*Math.sqrt(len2),
        width,x,y,segment:i};
    }
  }
  return best;
}
function makeGate(point,halfWidth,sign=1){
  const tangent=point.tangent;
  const nx=tangent.x*sign,ny=tangent.y*sign;
  return {
    a:{x:point.x-ny*halfWidth,y:point.y+nx*halfWidth},
    b:{x:point.x+ny*halfWidth,y:point.y-nx*halfWidth},
    normal:{x:nx,y:ny}
  };
}
function finishFromAnchor(anchor,width){
  const r=Number(anchor?.r);
  if(!finitePoint(anchor)||!Number.isFinite(r))throw Error('Missing authored finish');
  const nx=Math.cos(r),ny=Math.sin(r),half=Math.max(30,width*.5);
  return {a:{x:anchor.x+ny*half,y:anchor.y-nx*half},
    b:{x:anchor.x-ny*half,y:anchor.y+nx*half},
    normal:{x:nx,y:ny}};
}
// Strictly scoped to the two *different* Tenerife leaderboard identities.
const TENERIFE_LEGACY='karting-tenerife';
const TENERIFE_CLOCKWISE='karting-tenerife-horario';
const TENERIFE_IDS=new Set([TENERIFE_LEGACY,TENERIFE_CLOCKWISE]);
function reverseGate(gate){
  if(!gate?.normal)throw Error('Cannot reverse a gate without travel normal');
  return {...gate,normal:{x:-Number(gate.normal.x),y:-Number(gate.normal.y)}};
}

// Only a trusted server checkout supplies json and the official race edition.
// This uses the production rule: clockwise reverses CP order AND both normals.
// No other track is supported or claimed to be homologated.
export function buildTenerifeJudgeGeometry(json,{trackId=TENERIFE_LEGACY}={}){
  if(!TENERIFE_IDS.has(trackId))throw Error('Unsupported race-control track identity');
  const clockwise=trackId===TENERIFE_CLOCKWISE;
  if(json?.closed!==true||!Array.isArray(json.centerline)||json.centerline.length<30||
    !Number.isFinite(json.trackWidth)||!Number.isFinite(json.sampleStepPx)||
    json.raceDirection!=='forward'||json.checkpointMode==='authored'||
    (json.checkpointFractions||[]).length!==2)
    throw Error('Unsupported Tenerife authored geometry; manual review required');
  const source=json.centerline.map(p=>({x:Number(p.x),y:Number(p.y),
    width:Number(p.width)||json.trackWidth}));
  if(!source.every(finitePoint))throw Error('Nonfinite source points');
  const first=source[0],last=source.at(-1);
  if(distance(first,last)>1)source.push({...first});
  const ribbon=buildTrackRibbon({
    centerline:source,trackWidth:json.trackWidth,
    grassMargin:json.grassMargin||0,
    sampleStepPx:json.sampleStepPx,cellSize:json.cellSize||400,closed:true
  });
  const metrics=loopPathMetrics(ribbon.center);
  const anchor=json.finishAnchor;
  const finishPoint=nearestOnRoad(anchor,metrics);
  if(!finishPoint||finishPoint.distance>json.trackWidth)throw Error('Finish too far from road');
  const anchorDistance=finishPoint.routeDistance;
  const fractions=json.checkpointFractions.map(Number);
  if(!(fractions[0]>0.1&&fractions[0]<0.5&&fractions[1]>0.5&&fractions[1]<0.9))
    throw Error('Unexpected checkpoint fractions');
  const gates=fractions.map(frac=>{
    const at=sampleLoopAt(metrics,anchorDistance+metrics.total*frac);
    const half=Math.max(30,(Number(at.width)||json.trackWidth)*.60);
    return makeGate(at,half);
  });
  const widened=widenAllRaceGates({closed:true,trackWidth:json.trackWidth,trackShape:null,
    finishLine:finishFromAnchor(anchor,json.trackWidth),checkpoints:gates},ribbon);
  const checkpoints=clockwise?widened.checkpoints.slice().reverse().map(reverseGate)
    :widened.checkpoints;
  const finishLine=clockwise?reverseGate(widened.finishLine):widened.finishLine;
  const hash=createHash('sha256').update(JSON.stringify({
    trackId,centerline:json.centerline,finishAnchor:json.finishAnchor,
    checkpointFractions:fractions,trackWidth:json.trackWidth,
    sampleStepPx:json.sampleStepPx,closed:json.closed,raceDirection:json.raceDirection
  })).digest('hex');
  return Object.freeze({trackId,geometrySha256:hash,
    metrics,finishLine,checkpoints,clockwise,
    anchorDistance,roadWidth:json.trackWidth});
}

// Crossing exactly matches swept car-segment geometry; require normal direction.
// Samples are assumed to be decoded with the existing native ghost codec.
export function reviewTenerifeGhost(ghost,trusted){
  const reasons=[],diagnostics={};
  if(!trusted||!TENERIFE_IDS.has(trusted.trackId)||!trusted.metrics||
    !trusted.finishLine||trusted.checkpoints?.length!==2)
    return {status:'unsupported',reasons:['untrusted_geometry']};
  if(ghost?.trackKey!==trusted.trackId)return {status:'invalid',reasons:['track_mismatch']};
  const samples=ghost?.samples;
  if(!Array.isArray(samples)||samples.length<5||samples.length>20000||
    !Number.isInteger(ghost.lapMs)||ghost.lapMs<=1000)
    return {status:'invalid',reasons:['invalid_recording']};
  if(samples.some((s,i)=>!finitePoint(s)||!Number.isFinite(s.t)||
    s.t<0||s.t>ghost.lapMs||(i>0&&s.t<=samples[i-1].t)))
    return {status:'invalid',reasons:['invalid_sample_time_or_position']};
  if(samples.at(-1).t!==ghost.lapMs)return {status:'invalid',reasons:['finish_time_mismatch']};
  const geo=trusted.metrics,binCount=12,visited=new Set();
  let farSamples=0,shortcutSegments=0,furthest=0,maxSegmentPx=0;
  let maxRawSpeed=0,max100msSpeed=0,veryShortGaps=0;
  let windowStart=0;
  let state=0,finishSeen=false,outOfOrder=false;
  const gates=[...trusted.checkpoints,trusted.finishLine];
  let previousProjection=null;
  for(let i=0;i<samples.length;i++){
    const curr=samples[i],near=nearestOnRoad(curr,geo);
    if(!near)return {status:'unsupported',reasons:['empty_official_road']};
    const allowed=Math.max(12,near.width*.5+8);
    if(near.distance>allowed)farSamples++;
    const forwardAlong=((near.routeDistance-trusted.anchorDistance+geo.total)%geo.total);
    const along=trusted.clockwise?(geo.total-forwardAlong)%geo.total:forwardAlong;
    const fraction=along/geo.total;
    visited.add(Math.min(binCount-1,Math.floor(fraction*binCount)));
    if(previousProjection!==null){
      // Large forward route skips or reverse jumps require human review.
      const delta=((along-previousProjection+geo.total)%geo.total);
      if(delta>geo.total*.12&&delta<geo.total*.88)furthest++;
    }
    previousProjection=along;
    if(i===0)continue;
    const prev=samples[i-1];
    const seg=distance(prev,curr),dt=curr.t-prev.t;
    maxSegmentPx=Math.max(maxSegmentPx,seg);
    maxRawSpeed=Math.max(maxRawSpeed,1000*seg/dt);
    if(dt<8)veryShortGaps++;
    // A 1-ms clock irregularity in an existing rally ghost proves why
    // single-frame speed is unsuitable as an automatic ban. Use a 100-ms
    // window as *diagnostic*, pending car-physics calibration.
    while(windowStart+1<i&&curr.t-samples[windowStart+1].t>=100)
      windowStart++;
    const windowDt=curr.t-samples[windowStart].t;
    if(windowDt>=100){
      max100msSpeed=Math.max(max100msSpeed,
        1000*distance(curr,samples[windowStart])/windowDt);
    }
    const mid={x:(prev.x+curr.x)*.5,y:(prev.y+curr.y)*.5};
    const midNear=nearestOnRoad(mid,geo);
    if(midNear.distance>Math.max(12,midNear.width*.5+8))shortcutSegments++;
    const velocity={x:curr.x-prev.x,y:curr.y-prev.y};
    const crossed=gates.map(g=>crossesDirectedFinishGate(g,prev,curr,velocity));
    if(crossed[0]){
      if(state===0)state=1;
      else if(state===2)outOfOrder=true;
    }
    if(crossed[1]){
      if(state===1)state=2;
      else outOfOrder=true;
    }
    if(crossed[2]){
      if(state===2)finishSeen=true;
      else outOfOrder=true;
    }
  }
  diagnostics.geometrySha256=trusted.geometrySha256;
  diagnostics.samples=samples.length;
  diagnostics.gateSequenceReached=state;
  diagnostics.finishSeen=finishSeen;
  diagnostics.coverageBins=visited.size;
  diagnostics.outsideRoadSamples=farSamples;
  diagnostics.offRoadShortcuts=shortcutSegments;
  diagnostics.routeJumps=furthest;
  diagnostics.maxStepPx=Math.round(maxSegmentPx*100)/100;
  diagnostics.maxRawSpeedPxPerSecond=Math.round(maxRawSpeed);
  diagnostics.max100msSpeedPxPerSecond=Math.round(max100msSpeed);
  diagnostics.shortTimestampGaps=veryShortGaps;
  diagnostics.variant=trusted.clockwise?'clockwise':'legacy';
  if(farSamples>samples.length*.15)reasons.push('geometry_revision_unknown');
  // Provisional screening margin only, never an official physics limit.
  // Must be calibrated with genuine races and per-car physics first.
  if(max100msSpeed>2500)reasons.push('motion_anomaly_needs_physics_review');
  if(outOfOrder)reasons.push('wrong_gate_order');
  if(state<2)reasons.push('missing_checkpoint');
  if(!finishSeen)reasons.push('finish_not_observed');
  if(visited.size<10)reasons.push('incomplete_route_coverage');
  if(farSamples>0||shortcutSegments>0)reasons.push('road_corridor_anomaly');
  if(furthest>0)reasons.push('route_jump');
  return {status:reasons.length?'review':'pass',reasons,diagnostics};
}
