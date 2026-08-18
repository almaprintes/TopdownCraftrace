import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifePaddockScene.js';
import { createTrackEnvironment, hasTrackEnvironment } from '../tracks/environmentRegistry.js';

const BASE=import.meta.env.BASE_URL||'/';
const STYLE={
  asphalt:{main:0x2b2c2f,edge:0x656a70},
  grass:{main:0x285936,edge:0x39794a},
  dirt:{main:0x695743,edge:0x806d55},
  gravel:{main:0x77766f,edge:0x97968d}
};

function trackId(scene){return String(scene?.trackKey||scene?.track?.id||scene?.track?.key||'');}
function control(s){return{x:Number.isFinite(Number(s.cpx))?Number(s.cpx):(Number(s.x1)+Number(s.x2))/2,y:Number.isFinite(Number(s.cpy))?Number(s.cpy):(Number(s.y1)+Number(s.y2))/2};}
function qp(s,t){const m=1-t,c=control(s);return{x:m*m*s.x1+2*m*t*c.x+t*t*s.x2,y:m*m*s.y1+2*m*t*c.y+t*t*s.y2};}
function qt(s,t){const c=control(s);return{x:2*(1-t)*(c.x-s.x1)+2*t*(s.x2-c.x),y:2*(1-t)*(c.y-s.y1)+2*t*(s.y2-c.y)};}
function band(s){
  const len=Math.hypot(s.x2-s.x1,s.y2-s.y1),steps=Math.max(24,Math.min(180,Math.ceil(len/28))),half=(Number(s.width)||120)/2,left=[],right=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,p=qp(s,t),v=qt(s,t),d=Math.hypot(v.x,v.y)||1,nx=-v.y/d,ny=v.x/d;
    left.push({x:p.x+nx*half,y:p.y+ny*half});right.push({x:p.x-nx*half,y:p.y-ny*half});
  }
  return{left,right};
}
function polygon(g,pts,color){if(!pts.length)return;g.fillStyle(color,.98);g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();g.fillPath();}

function destroyList(scene,key){
  const arr=scene?.[key];
  if(Array.isArray(arr))for(const o of arr)o?.destroy?.();
  scene[key]=[];
}

function clearLegacyEnvironment(scene){
  // Curated automatic decoration shared by all circuits.
  destroyList(scene,'_circuitEnvironment');

  // Older Karting Tenerife experiments. Harmless on other circuits and ensures
  // authored Builder data is the single source of truth when present.
  destroyList(scene,'_ktPaddock');
  destroyList(scene,'_ktStructures');
  destroyList(scene,'_ktDenseVegetation');
}

function render(scene,data){
  if(!data)return;
  clearLegacyEnvironment(scene);
  if(Array.isArray(scene._authoredEnvironmentObjects))for(const o of scene._authoredEnvironmentObjects)o?.destroy?.();
  const placed=[];
  const sg=scene.add.graphics().setDepth(5.7);scene.uiCam?.ignore?.(sg);placed.push(sg);
  for(const s of data.surfaces||[]){
    const st=STYLE[s.visual]||STYLE.asphalt,b=band(s),pts=[...b.left,...b.right.slice().reverse()];polygon(sg,pts,st.main);
    sg.lineStyle(Math.max(2,Math.min(5,(Number(s.width)||120)*.025)),st.edge,.9);
    const edge=arr=>{sg.beginPath();sg.moveTo(arr[0].x,arr[0].y);for(let i=1;i<arr.length;i++)sg.lineTo(arr[i].x,arr[i].y);sg.strokePath();};edge(b.left);edge(b.right);
  }
  const env=(data.environment||[]).slice().sort((a,b)=>(Number(a.z)||12)-(Number(b.z)||12));
  for(const d of env){
    const key=`auth-env:${d.asset}`;if(!scene.textures.exists(key))continue;
    const img=scene.add.image(Number(d.x)||0,Number(d.y)||0,key).setDepth(Number(d.z)||12).setRotation(Number(d.rotation)||0);
    const dw=Number(d.displayWidth);if(Number.isFinite(dw)&&dw>0&&img.width>0)img.setDisplaySize(dw,img.height*(dw/img.width));
    img.setFlipX(!!d.flipX);img.setFlipY(!!d.flipY);scene.uiCam?.ignore?.(img);placed.push(img);
  }
  scene._authoredEnvironmentObjects=placed;
  scene._authoredSurfaceZones=(data.surfaces||[]).map(s=>({...s}));
}

function ensure(scene,data){
  const missing=[];
  for(const d of data.environment||[]){
    if(!d?.asset||!d?.path)continue;const key=`auth-env:${d.asset}`;
    if(!scene.textures.exists(key)){scene.load.image(key,`${BASE}assets/${String(d.path).replace(/^assets\//,'')}`);missing.push(key);}
  }
  const apply=()=>scene.time?.delayedCall?.(40,()=>render(scene,data));
  if(!missing.length){apply();return;}
  scene.load.once('complete',apply);if(!scene.load.isLoading())scene.load.start();
}

export class RaceScene extends CurrentRaceScene{
  create(){
    super.create();
    const id=trackId(this);if(!id||!hasTrackEnvironment(id))return;
    const data=createTrackEnvironment(id);
    // Clear legacy immediately so it never flashes underneath while authored
    // WebP assets are loading asynchronously.
    clearLegacyEnvironment(this);
    ensure(this,data);
  }
}
