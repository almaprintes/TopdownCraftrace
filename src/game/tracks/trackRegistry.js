import { buildTrackRibbon } from './TrackBuilder.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';

const trackModules = import.meta.glob('./library/*/track.json', { eager: true });

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function wrapPi(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }

function normalizeCenterline(centerline, fallbackWidth = 80) {
  if (!Array.isArray(centerline)) return [];
  return centerline.map((p) => {
    if (Array.isArray(p) && p.length >= 2) return { x:Number(p[0]), y:Number(p[1]), width:fallbackWidth };
    if (p && typeof p.x === 'number' && typeof p.y === 'number') return { x:Number(p.x), y:Number(p.y), width:Number.isFinite(Number(p.width)) ? Number(p.width) : fallbackWidth };
    return null;
  }).filter(Boolean);
}

function ensureClosedCenterline(centerline, closed, fallbackWidth) {
  const out = centerline.map(p => ({ ...p }));
  if (!closed || out.length < 2) return out;
  const a=out[0], b=out[out.length-1];
  if (Math.hypot(a.x-b.x,a.y-b.y)>1) out.push({x:a.x,y:a.y,width:Number(a.width)||fallbackWidth});
  return out;
}

function normalizeDirection(v){ return String(v||'forward').toLowerCase()==='reverse' ? 'reverse' : 'forward'; }

function normalizeExplicitFinishAnchor(anchor){
  const x=Number(anchor?.x),y=Number(anchor?.y),r=Number(anchor?.r);
  return [x,y,r].every(Number.isFinite)?{x,y,r}:null;
}

function deriveSegmentHint(centerline,index,t=.5){
  if(!Array.isArray(centerline)||centerline.length<2)return null;
  const max=centerline.length-2;
  const i=Math.max(0,Math.min(max,Number(index)|0));
  const a=centerline[i],b=centerline[i+1],vx=b.x-a.x,vy=b.y-a.y;
  if(Math.hypot(vx,vy)<1)return null;
  const k=Math.max(.05,Math.min(.95,Number.isFinite(Number(t))?Number(t):.5));
  return {x:a.x+vx*k,y:a.y+vy*k};
}

function projectToSmoothCenter(hint, center){
  const hx=Number(hint?.x),hy=Number(hint?.y);
  if(!Number.isFinite(hx)||!Number.isFinite(hy)||!Array.isArray(center)||center.length<2)return null;
  let best=null;
  for(let i=0;i<center.length;i++){
    const a=center[i],b=center[(i+1)%center.length],vx=b.x-a.x,vy=b.y-a.y,len2=vx*vx+vy*vy;
    if(len2<1e-6)continue;
    const t=Math.max(0,Math.min(1,((hx-a.x)*vx+(hy-a.y)*vy)/len2));
    const x=a.x+vx*t,y=a.y+vy*t,d2=(hx-x)**2+(hy-y)**2;
    if(!best||d2<best.d2)best={x,y,r:Math.atan2(vy,vx),segIndex:i,segT:t,d2};
  }
  return best;
}

function deriveLongestStraightAnchor(center) {
  if (!Array.isArray(center) || center.length < 8) return null;
  let best=null;
  for(let i=0;i<center.length;i++){
    const p=center[(i-3+center.length)%center.length],a=center[i],b=center[(i+1)%center.length],n=center[(i+4)%center.length];
    const r0=Math.atan2(a.y-p.y,a.x-p.x), r1=Math.atan2(b.y-a.y,b.x-a.x), r2=Math.atan2(n.y-b.y,n.x-b.x);
    const len=Math.hypot(b.x-a.x,b.y-a.y); if(len<1)continue;
    const bend=Math.abs(wrapPi(r1-r0))+Math.abs(wrapPi(r2-r1));
    const score=len*Math.pow(Math.max(.02,1-bend/Math.PI),5);
    if(!best||score>best.score)best={score,x:(a.x+b.x)*.5,y:(a.y+b.y)*.5,r:r1,segIndex:i,segT:.5};
  }
  return best?{x:best.x,y:best.y,r:best.r,segIndex:best.segIndex,segT:best.segT}:null;
}

function makeFinishLineFromAnchor(anchor, trackWidth) {
  const x=Number(anchor?.x),y=Number(anchor?.y),r=Number(anchor?.r);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(r))return null;
  const half=Math.max(30,Number(trackWidth)*0.50),px=-Math.sin(r),py=Math.cos(r);
  return {a:{x:x-px*half,y:y-py*half},b:{x:x+px*half,y:y+py*half},normal:{x:Math.cos(r),y:Math.sin(r)}};
}

function makeSpawnBehindFinish(anchor,distance=120){
  const x=Number(anchor?.x),y=Number(anchor?.y),r=Number(anchor?.r);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(r))return anchor||{x:400,y:400,r:0};
  return {x:x-Math.cos(r)*distance,y:y-Math.sin(r)*distance,r};
}

function loopMetrics(center){
  const n=center?.length||0,cum=new Array(n+1).fill(0);
  for(let i=0;i<n;i++)cum[i+1]=cum[i]+Math.hypot(center[(i+1)%n].x-center[i].x,center[(i+1)%n].y-center[i].y);
  return {cum,total:cum[n]||1};
}

function distanceAtProjection(proj,metrics,center){
  const i=Math.max(0,Math.min(center.length-1,proj?.segIndex|0));
  const a=center[i],b=center[(i+1)%center.length];
  return metrics.cum[i]+Math.hypot(b.x-a.x,b.y-a.y)*Math.max(0,Math.min(1,Number(proj?.segT)||0));
}

function pointAtLoopDistance(center,metrics,distance){
  const total=metrics.total; let d=((distance%total)+total)%total;
  for(let i=0;i<center.length;i++){
    const a=center[i],b=center[(i+1)%center.length],seg=Math.hypot(b.x-a.x,b.y-a.y);
    if(d<=seg||i===center.length-1){
      const t=seg>1e-6?d/seg:0;
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,r:Math.atan2(b.y-a.y,b.x-a.x),width:(Number(a.width)||Number(b.width)||80)};
    }
    d-=seg;
  }
  return null;
}

function makeGateAt(point,width,directionSign=1,safety=.10){
  if(!point)return null;
  const r=wrapPi(point.r+(directionSign<0?Math.PI:0));
  const half=Math.max(30,(Number(width)||80)*(.5+safety)),px=-Math.sin(r),py=Math.cos(r);
  return {a:{x:point.x-px*half,y:point.y-py*half},b:{x:point.x+px*half,y:point.y+py*half},normal:{x:Math.cos(r),y:Math.sin(r)}};
}

function reverseGate(g){
  if(!g?.a||!g?.b)return g;
  return {...g,a:{...g.a},b:{...g.b},normal:g.normal?{x:-Number(g.normal.x||0),y:-Number(g.normal.y||0)}:g.normal};
}

function normalizeAuthoredCheckpoints(list,direction){
  if(!Array.isArray(list)||!list.length)return null;
  const out=list.map(g=>clone(g));
  if(direction==='reverse')return out.reverse().map(reverseGate);
  return out;
}

function normalizeCheckpointFractions(value){
  const src=Array.isArray(value)&&value.length ? value : [1/3,2/3];
  const out=src.map(Number).filter(v=>Number.isFinite(v)&&v>0&&v<1).sort((a,b)=>a-b);
  return out.length ? out : [1/3,2/3];
}

// Per-track physical normalization. Karting Tenerife was authored at an accidental
// giant world scale (~27k px around the lap). Keep the exact shape but rescale all
// world dimensions so the player-facing lap is a realistic 750 m kart circuit.
const TARGET_TRACK_METERS={
  'karting-tenerife':750
};

function rawLoopLength(center){
  if(!Array.isArray(center)||center.length<2)return 0;
  let total=0;
  for(let i=0;i<center.length;i++){
    const a=center[i],b=center[(i+1)%center.length];
    total+=Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y));
  }
  return total;
}

function scaleTrackAuthoring(slug,json,centerline,fallbackWidth){
  const targetM=Number(TARGET_TRACK_METERS[slug]);
  if(!Number.isFinite(targetM)||targetM<=0)return {
    centerline,
    trackWidth:fallbackWidth,
    worldW:Number(json.worldW)||8000,
    worldH:Number(json.worldH)||5000,
    grassMargin:Number(json.grassMargin)||120,
    sampleStepPx:Number(json.sampleStepPx)||12,
    cellSize:Number(json.cellSize)||400,
    shoulderPx:Number(json.shoulderPx)||10,
    startOffset:Number(json.startOffset)||120,
    authorScale:1
  };

  const rawPx=rawLoopLength(centerline);
  const targetPx=targetM/Math.max(1e-9,METERS_PER_PX);
  const s=rawPx>1 ? targetPx/rawPx : 1;
  const scalePoint=p=>({...p,x:Number(p.x)*s,y:Number(p.y)*s,width:Math.max(48,Number(p.width||fallbackWidth)*s)});

  return {
    centerline:centerline.map(scalePoint),
    trackWidth:Math.max(48,fallbackWidth*s),
    worldW:Math.max(1800,(Number(json.worldW)||8000)*s),
    worldH:Math.max(1400,(Number(json.worldH)||5000)*s),
    grassMargin:Math.max(120,(Number(json.grassMargin)||120)*s),
    sampleStepPx:Math.max(6,(Number(json.sampleStepPx)||12)*s),
    cellSize:Math.max(180,(Number(json.cellSize)||400)*s),
    shoulderPx:Math.max(8,(Number(json.shoulderPx)||10)*s),
    startOffset:Math.max(70,(Number(json.startOffset)||120)*s),
    authorScale:s
  };
}

function buildRegistry(){
  const out={};
  for(const [path,mod] of Object.entries(trackModules)){
    const json=mod?.default??mod;if(!json||typeof json!=='object')continue;
    const m=path.match(/\/library\/([^/]+)\/track\.json$/);if(!m)continue;

    const slug=m[1],fallbackWidth=Number(json.trackWidth)||80,isClosed=json.closed!==false;
    const direction=normalizeDirection(json.raceDirection);
    const directionSign=direction==='reverse'?-1:1;
    const normalized=normalizeCenterline(json.centerline,fallbackWidth);
    const authored=scaleTrackAuthoring(slug,json,normalized,fallbackWidth);
    const scaledFallbackWidth=authored.trackWidth;
    const centerline=ensureClosedCenterline(authored.centerline,isClosed,scaledFallbackWidth);

    const geom=buildTrackRibbon({
      centerline,
      trackWidth:scaledFallbackWidth,
      grassMargin:authored.grassMargin,
      sampleStepPx:authored.sampleStepPx,
      cellSize:authored.cellSize
    });
    const smooth=(geom?.center||[]).map(p=>({x:Number(p.x),y:Number(p.y),width:Number(p.width)||scaledFallbackWidth}));

    let explicit=normalizeExplicitFinishAnchor(json.finishAnchor);
    if(explicit&&authored.authorScale!==1)explicit={x:explicit.x*authored.authorScale,y:explicit.y*authored.authorScale,r:explicit.r};
    let finishAnchor=null,finishProjection=null;

    if(explicit){
      finishAnchor={...explicit,r:wrapPi(explicit.r+(directionSign<0?Math.PI:0))};
      finishProjection=projectToSmoothCenter(explicit,smooth);
    } else {
      const hint=Number.isFinite(Number(json.finishSegment)) ? deriveSegmentHint(centerline,Number(json.finishSegment),json.finishT) : null;
      finishProjection=hint ? projectToSmoothCenter(hint,smooth) : deriveLongestStraightAnchor(smooth);
      if(!finishProjection){
        const startHint=json.start ? {x:Number(json.start.x)*authored.authorScale,y:Number(json.start.y)*authored.authorScale} : centerline[0];
        finishProjection=projectToSmoothCenter(startHint,smooth);
      }
      if(finishProjection)finishAnchor={x:finishProjection.x,y:finishProjection.y,r:wrapPi(finishProjection.r+(directionSign<0?Math.PI:0))};
    }

    if(!finishAnchor)finishAnchor={x:400,y:400,r:directionSign<0?Math.PI:0};

    const raceStart=makeSpawnBehindFinish(finishAnchor,authored.startOffset);
    const metrics=loopMetrics(smooth);
    const anchorProjection=finishProjection||projectToSmoothCenter(finishAnchor,smooth);
    const finishDist=anchorProjection?distanceAtProjection(anchorProjection,metrics,smooth):0;
    const checkpointFractions=normalizeCheckpointFractions(json.checkpointFractions);

    let checkpoints=null;
    if(String(json.checkpointMode||'').toLowerCase()==='authored'){
      checkpoints=normalizeAuthoredCheckpoints(json.checkpoints,direction);
      if(checkpoints&&authored.authorScale!==1){
        checkpoints=checkpoints.map(g=>({
          ...g,
          a:{x:Number(g.a.x)*authored.authorScale,y:Number(g.a.y)*authored.authorScale},
          b:{x:Number(g.b.x)*authored.authorScale,y:Number(g.b.y)*authored.authorScale}
        }));
      }
    }
    if(!checkpoints&&smooth.length>3){
      checkpoints=checkpointFractions.map(frac=>{
        const p=pointAtLoopDistance(smooth,metrics,finishDist+directionSign*metrics.total*frac);
        return makeGateAt(p,Number(p?.width)||scaledFallbackWidth,directionSign,.10);
      }).filter(Boolean);
    }

    const raceCenterline=direction==='reverse' ? smooth.slice().reverse() : smooth.slice();

    out[slug]={
      id:slug,key:slug,name:json.name||slug.toUpperCase(),brand:json.brand||'CUSTOM',category:json.category||'Nuevo',difficulty:json.difficulty||'Media',lengthLabel:targetTrackLabel(slug,json.lengthLabel),
      worldW:authored.worldW,worldH:authored.worldH,trackWidth:scaledFallbackWidth,grassMargin:authored.grassMargin,sampleStepPx:authored.sampleStepPx,cellSize:authored.cellSize,shoulderPx:authored.shoulderPx,
      start:raceStart,centerline,closed:isClosed,
      raceDirection:direction,raceCenterline,
      finishAnchor,finishLine:makeFinishLineFromAnchor(finishAnchor,scaledFallbackWidth),finish:null,
      checkpoints,checkpointFractions,checkpointMode:'proportional',grid:null,
      meta:{...(json.meta||{}),authorScale:authored.authorScale,targetLengthMeters:TARGET_TRACK_METERS[slug]||null}
    };
  }
  return out;
}

function targetTrackLabel(slug,fallback){
  return TARGET_TRACK_METERS[slug] ? 'Corta' : (fallback||'Media');
}

export const TRACK_REGISTRY=buildRegistry();
export function createTrack(trackId){const track=TRACK_REGISTRY[trackId];if(!track)throw new Error(`Track no encontrado: ${trackId}`);return clone(track);}
export function getTrackKeys(){return Object.keys(TRACK_REGISTRY);}
export function hasTrack(trackId){return !!TRACK_REGISTRY[trackId];}
