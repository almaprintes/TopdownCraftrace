import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifePaddockScene.js';
import { createTrackEnvironment, hasTrackEnvironment } from '../tracks/environmentRegistry.js';
import { pathPoint, pathTangent, pathLength } from '../environment/EditableSpline.js';

const BASE=import.meta.env.BASE_URL||'/';
const STYLE={asphalt:{main:0x2b2c2f,edge:0x656a70},grass:{main:0x285936,edge:0x39794a},dirt:{main:0x695743,edge:0x806d55},gravel:{main:0x77766f,edge:0x97968d}};
const VEGETATION_PATHS={tree_broad_02:'environment/vegetation/tree_broad_02.webp',palm_tall_01:'environment/vegetation/palm_tall_01.webp'};
function assetPath(asset,path){return VEGETATION_PATHS[asset]||path;}
function trackId(scene){return String(scene?.trackKey||scene?.track?.id||scene?.track?.key||'');}
function band(s){const steps=Math.max(28,Math.min(240,Math.ceil(pathLength(s,120)/26))),half=(Number(s.width)||120)/2,left=[],right=[];for(let i=0;i<=steps;i++){const t=i/steps,p=pathPoint(s,t),v=pathTangent(s,t),d=Math.hypot(v.x,v.y)||1,nx=-v.y/d,ny=v.x/d;left.push({x:p.x+nx*half,y:p.y+ny*half});right.push({x:p.x-nx*half,y:p.y-ny*half});}return{left,right};}
function polygon(g,pts,color){if(!pts.length)return;g.fillStyle(color,.98);g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();g.fillPath();}
function destroyList(scene,key){const arr=scene?.[key];if(Array.isArray(arr))for(const o of arr)o?.destroy?.();scene[key]=[];}
function clearLegacyEnvironment(scene){destroyList(scene,'_circuitEnvironment');destroyList(scene,'_ktPaddock');destroyList(scene,'_ktStructures');destroyList(scene,'_ktDenseVegetation');}
function buildSamples(s){
  const N=620,out=[];let total=0,prev=null;
  for(let i=0;i<=N;i++){
    const t=i/N,p=pathPoint(s,t),v=pathTangent(s,t),angle=Math.atan2(v.y,v.x);
    if(prev)total+=Math.hypot(p.x-prev.x,p.y-prev.y);
    out.push({t,p,angle,d:total});prev=p;
  }
  return {out,total,source:s};
}
function poseAt(samples,d){
  const a=samples.out,total=samples.total,target=Math.max(0,Math.min(total,d));
  let lo=1,hi=a.length-1;
  while(lo<hi){const m=(lo+hi)>>1;if(a[m].d<target)lo=m+1;else hi=m;}
  const b=a[lo],p=a[Math.max(0,lo-1)],span=b.d-p.d||1,u=(target-p.d)/span,t=p.t+(b.t-p.t)*u;
  const pos=pathPoint(samples.source,t),v=pathTangent(samples.source,t);
  return{x:pos.x,y:pos.y,angle:Math.atan2(v.y,v.x)};
}
function angleDelta(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
function materialScale(s){
  switch(String(s?.type||'')){
    case 'guardrail': return .64;
    case 'tires': return .62;
    case 'fence': return .70;
    case 'plastic': return .72;
    case 'concrete': return .72;
    default:return .68;
  }
}
function chordAngle(samples,d,halfSpan){
  const a=poseAt(samples,Math.max(0,d-halfSpan)),b=poseAt(samples,Math.min(samples.total,d+halfSpan));
  const dx=b.x-a.x,dy=b.y-a.y;
  return Math.hypot(dx,dy)>1e-4?Math.atan2(dy,dx):poseAt(samples,d).angle;
}
function linearPieces(s){
  const samples=buildSamples(s),total=samples.total,base=Math.max(46,Number(s.spacing)||105),baseWidth=Math.max(34,base*materialScale(s));
  if(total<1){const p=pathPoint(s,.5),v=pathTangent(s,.5);return[{x:p.x,y:p.y,angle:Math.atan2(v.y,v.x),width:baseWidth}];}
  const out=[];let d=Math.min(baseWidth*.36,total*.5),guard=0;
  while(d<total&&guard++<1800){
    const probe=Math.max(18,baseWidth*.52);
    const qa=poseAt(samples,Math.max(0,d-probe)),qb=poseAt(samples,Math.min(total,d+probe));
    const turn=angleDelta(qa.angle,qb.angle),curve=Math.min(1,turn/(Math.PI*.30));
    const width=Math.max(28,baseWidth*(1-.42*curve));
    const q=poseAt(samples,d),angle=chordAngle(samples,d,Math.max(8,width*.22));
    out.push({x:q.x,y:q.y,angle,width});
    d+=Math.max(width*.74,width*(.88-.06*curve));
  }
  if(!out.length){const q=poseAt(samples,total*.5);out.push({...q,width:baseWidth});}
  return out;
}
function renderLinear(scene,data,placed){for(const s of data.linearBarriers||[]){const key=`auth-linear:${s.asset}`;if(!scene.textures.exists(key))continue;for(const q of linearPieces(s)){const img=scene.add.image(q.x,q.y,key).setDepth(Number(s.z)||11.8).setRotation(q.angle);if(img.width>0)img.setDisplaySize(q.width,img.height*(q.width/img.width));scene.uiCam?.ignore?.(img);placed.push(img);}}}
function render(scene,data){
  if(!data)return;clearLegacyEnvironment(scene);
  if(Array.isArray(scene._authoredEnvironmentObjects))for(const o of scene._authoredEnvironmentObjects)o?.destroy?.();
  const placed=[],sg=scene.add.graphics().setDepth(5.7);scene.uiCam?.ignore?.(sg);placed.push(sg);
  for(const s of data.surfaces||[]){const st=STYLE[s.visual]||STYLE.asphalt,b=band(s),pts=[...b.left,...b.right.slice().reverse()];polygon(sg,pts,st.main);sg.lineStyle(Math.max(2,Math.min(5,(Number(s.width)||120)*.025)),st.edge,.9);const edge=arr=>{sg.beginPath();sg.moveTo(arr[0].x,arr[0].y);for(let i=1;i<arr.length;i++)sg.lineTo(arr[i].x,arr[i].y);sg.strokePath();};edge(b.left);edge(b.right);}
  renderLinear(scene,data,placed);
  const env=(data.environment||[]).slice().sort((a,b)=>(Number(a.z)||12)-(Number(b.z)||12));
  for(const d of env){const key=`auth-env:${d.asset}`;if(!scene.textures.exists(key))continue;const img=scene.add.image(Number(d.x)||0,Number(d.y)||0,key).setDepth(Number(d.z)||12).setRotation(Number(d.rotation)||0);const dw=Number(d.displayWidth);if(Number.isFinite(dw)&&dw>0&&img.width>0)img.setDisplaySize(dw,img.height*(dw/img.width));img.setFlipX(!!d.flipX);img.setFlipY(!!d.flipY);scene.uiCam?.ignore?.(img);placed.push(img);}
  scene._authoredEnvironmentObjects=placed;scene._authoredSurfaceZones=(data.surfaces||[]).map(s=>({...s}));
}
function ensure(scene,data){const missing=[],queued=new Set();const add=(key,path)=>{if(!key||!path||scene.textures.exists(key)||queued.has(key))return;scene.load.image(key,`${BASE}assets/${String(path).replace(/^assets\//,'')}`);queued.add(key);missing.push(key);};for(const d of data.environment||[])if(d?.asset&&d?.path)add(`auth-env:${d.asset}`,assetPath(d.asset,d.path));for(const d of data.linearBarriers||[])if(d?.asset&&d?.path)add(`auth-linear:${d.asset}`,d.path);const apply=()=>scene.time?.delayedCall?.(40,()=>render(scene,data));if(!missing.length){apply();return;}scene.load.once('complete',apply);if(!scene.load.isLoading())scene.load.start();}
export class RaceScene extends CurrentRaceScene{create(){super.create();const id=trackId(this);if(!id||!hasTrackEnvironment(id))return;const data=createTrackEnvironment(id);clearLegacyEnvironment(this);ensure(this,data);}}
