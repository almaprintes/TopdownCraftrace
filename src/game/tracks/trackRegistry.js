const trackModules = import.meta.glob('./library/*/track.json', { eager: true });

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

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

function deriveFinishAnchor(start, centerline) {
  const sx=Number(start?.x), sy=Number(start?.y);
  if (!Number.isFinite(sx)||!Number.isFinite(sy)||!Array.isArray(centerline)||centerline.length<2) return start||{x:400,y:400,r:0};
  let best=null;
  for(let i=0;i<centerline.length-1;i++){
    const a=centerline[i],b=centerline[i+1],vx=b.x-a.x,vy=b.y-a.y,len2=vx*vx+vy*vy;
    if(len2<1)continue;
    const t=Math.max(0,Math.min(1,((sx-a.x)*vx+(sy-a.y)*vy)/len2));
    const x=a.x+vx*t,y=a.y+vy*t,d2=(sx-x)**2+(sy-y)**2;
    if(!best||d2<best.d2)best={x,y,r:Math.atan2(vy,vx),d2};
  }
  return best?{x:best.x,y:best.y,r:best.r}:start;
}

function deriveSegmentAnchor(centerline,index,t=.5){
  if(!Array.isArray(centerline)||centerline.length<2)return null;
  const max=centerline.length-2;
  const i=Math.max(0,Math.min(max,Number(index)|0));
  const a=centerline[i],b=centerline[i+1],vx=b.x-a.x,vy=b.y-a.y;
  if(Math.hypot(vx,vy)<1)return null;
  const k=Math.max(.15,Math.min(.85,Number.isFinite(Number(t))?Number(t):.5));
  return {x:a.x+vx*k,y:a.y+vy*k,r:Math.atan2(vy,vx)};
}

function deriveLongestStraightAnchor(centerline) {
  if (!Array.isArray(centerline) || centerline.length < 4) return null;
  let best=null;
  const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
  const ad=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  for(let i=1;i<centerline.length-2;i++){
    const p=centerline[i-1],a=centerline[i],b=centerline[i+1],n=centerline[i+2];
    const vx=b.x-a.x,vy=b.y-a.y,len=Math.hypot(vx,vy); if(len<1)continue;
    const bend=ad(ang(p,a),ang(a,b))+ad(ang(a,b),ang(b,n));
    const score=len*Math.pow(Math.max(.05,1-bend/Math.PI),4);
    if(!best||score>best.score)best={score,x:(a.x+b.x)*.5,y:(a.y+b.y)*.5,r:Math.atan2(vy,vx)};
  }
  return best?{x:best.x,y:best.y,r:best.r}:null;
}

function makeFinishLineFromAnchor(anchor, trackWidth) {
  const x=Number(anchor?.x),y=Number(anchor?.y),r=Number(anchor?.r);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(r))return null;
  // Full road width: the chequered stripe must visually reach both white edge lines.
  const half=Math.max(30,Number(trackWidth)*0.50),px=-Math.sin(r),py=Math.cos(r);
  return {a:{x:x-px*half,y:y-py*half},b:{x:x+px*half,y:y+py*half},normal:{x:Math.cos(r),y:Math.sin(r)}};
}

function makeSpawnBehindFinish(anchor,distance=120){
  const x=Number(anchor?.x),y=Number(anchor?.y),r=Number(anchor?.r);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(r))return anchor||{x:400,y:400,r:0};
  return {x:x-Math.cos(r)*distance,y:y-Math.sin(r)*distance,r};
}

function buildRegistry(){
  const out={};
  for(const [path,mod] of Object.entries(trackModules)){
    const json=mod?.default??mod;if(!json||typeof json!=='object')continue;
    const m=path.match(/\/library\/([^/]+)\/track\.json$/);if(!m)continue;
    const slug=m[1],fallbackWidth=Number(json.trackWidth)||80,isClosed=json.closed!==false;
    const normalized=normalizeCenterline(json.centerline,fallbackWidth);
    const centerline=ensureClosedCenterline(normalized,isClosed,fallbackWidth);
    const isF1Imported=String(json.brand||'').includes('F1 Inspired')||String(json?.meta?.source||'').includes('F1 circuit silhouette');
    const authored=Number.isFinite(Number(json.finishSegment)) ? deriveSegmentAnchor(centerline,Number(json.finishSegment),json.finishT) : null;
    const finishAnchor=authored || (isF1Imported?deriveLongestStraightAnchor(centerline):null) || deriveFinishAnchor(json.start||centerline[0],centerline);
    const raceStart=makeSpawnBehindFinish(finishAnchor,120);
    out[slug]={id:slug,key:slug,name:json.name||slug.toUpperCase(),brand:json.brand||'CUSTOM',category:json.category||'Nuevo',difficulty:json.difficulty||'Media',lengthLabel:json.lengthLabel||'Media',worldW:Number(json.worldW)||8000,worldH:Number(json.worldH)||5000,trackWidth:fallbackWidth,grassMargin:Number(json.grassMargin)||120,sampleStepPx:Number(json.sampleStepPx)||12,cellSize:Number(json.cellSize)||400,shoulderPx:Number(json.shoulderPx)||10,start:raceStart,centerline,closed:isClosed,finishLine:makeFinishLineFromAnchor(finishAnchor,fallbackWidth),finish:null,checkpoints:[],grid:null};
  }
  return out;
}

export const TRACK_REGISTRY=buildRegistry();
export function createTrack(trackId){const track=TRACK_REGISTRY[trackId];if(!track)throw new Error(`Track no encontrado: ${trackId}`);return clone(track);}
export function getTrackKeys(){return Object.keys(TRACK_REGISTRY);}
export function hasTrack(trackId){return !!TRACK_REGISTRY[trackId];}
