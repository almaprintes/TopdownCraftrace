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
function ad(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
function linearPieces(s){
  const N=220,pts=[],cum=[0];let total=0;
  for(let i=0;i<=N;i++){const t=i/N,p=pathPoint(s,t),v=pathTangent(s,t),ang=Math.atan2(v.y,v.x);pts.push({p,ang});if(i){total+=Math.hypot(p.x-pts[i-1].p.x,p.y-pts[i-1].p.y);cum.push(total);}}
  const out=[];let next=0;
  for(let i=1;i<N;i++){
    const turn=ad(pts[i-1].ang,pts[i+1].ang),target=Math.max(44,Math.min(Number(s.spacing)||105,105/(1+turn*13)));
    if(cum[i]<next)continue;
    out.push({x:pts[i].p.x,y:pts[i].p.y,angle:pts[i].ang,width:Math.max(46,target*1.16)});next=cum[i]+target;
  }
  if(!out.length){const p=pathPoint(s,.5),v=pathTangent(s,.5);out.push({x:p.x,y:p.y,angle:Math.atan2(v.y,v.x),width:Math.max(46,total*1.06)});}
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
