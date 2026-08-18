import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifeStructuresScene.js';

const BASE = import.meta.env.BASE_URL || '/';
const ASSETS = {
  pit:{key:'kt-pit-garage-small-01',url:`${BASE}assets/environment/structures/pit_garage_small_01.webp`,width:300},
  paddock:{key:'kt-paddock-box-small-01',url:`${BASE}assets/environment/structures/paddock_box_small_01.webp`,width:220},
  tower:{key:'kt-control-tower-small-01',url:`${BASE}assets/environment/structures/control_tower_small_01.webp`,width:170},
  grandstand:{key:'kt-grandstand-half-01',url:`${BASE}assets/environment/structures/grandstand_half_01.webp`,width:360},
  marshal:{key:'kt-marshal-post-01',url:`${BASE}assets/environment/structures/marshal_post_01.webp`,width:118}
};

function isKT(scene){
  const id=String(scene?.trackKey||scene?.track?.id||scene?.track?.key||'').toLowerCase();
  const name=String(scene?.track?.name||scene?.track?.meta?.name||'').toLowerCase();
  return id.includes('karting-tenerife')||id.includes('karting_tenerife')||name.includes('karting tenerife');
}

function centerline(scene){
  const fallback=Number(scene.track?.trackWidth||160);
  const raw=scene.track?.geom?.center||scene.track?.centerline||[];
  return {fallback,center:raw.map(p=>Array.isArray(p)?{x:+p[0],y:+p[1],width:fallback}:{x:+p.x,y:+p.y,width:+p.width||fallback}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))};
}

function tangent(center,i){
  const n=center.length,a=center[(i-3+n)%n],b=center[(i+3)%n];
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
  const tx=dx/d,ty=dy/d; return {tx,ty,nx:-ty,ny:tx};
}

function finishIndex(scene,center){
  const f=scene.track?.finishAnchor||scene.track?.meta?.finishAnchor;
  const fx=+f?.x,fy=+f?.y;
  if(!Number.isFinite(fx)||!Number.isFinite(fy))return Math.floor(center.length*.72);
  let best=0,bd=Infinity;
  for(let i=0;i<center.length;i++){const d=Math.hypot(center[i].x-fx,center[i].y-fy);if(d<bd){bd=d;best=i;}}
  return best;
}

function frontRotationToward(from,to){
  const ang=Math.atan2(to.y-from.y,to.x-from.x);
  return ang-Math.PI/2;
}

function addImage(scene,placed,key,x,y,width,rotation,depth=12.1){
  if(!scene.textures.exists(key))return null;
  const img=scene.add.image(x,y,key).setScrollFactor(1).setDepth(depth).setRotation(rotation);
  if(img.width>0)img.setDisplaySize(width,img.height*(width/img.width));
  scene.uiCam?.ignore?.(img); placed.push(img); return img;
}

function localCoords(origin,t,world){
  const dx=world.x-origin.x,dy=world.y-origin.y;
  return {along:dx*t.tx+dy*t.ty,out:dx*t.nx+dy*t.ny};
}

function clearPaddockVegetation(scene,origin,t,side){
  const list=Array.isArray(scene._ktDenseVegetation)?scene._ktDenseVegetation:[];
  const keep=[];
  for(const obj of list){
    if(!obj?.scene)continue;
    const q=localCoords(origin,t,obj);
    const out=q.out*side;
    const inMainZone=q.along>-650&&q.along<650&&out>75&&out<390;
    const inLowerAccess=q.along>300&&q.along<560&&out>20&&out<390;
    const inUpperAccess=q.along>-590&&q.along<-390&&out>20&&out<390;
    if(inMainZone||inLowerAccess||inUpperAccess){obj.destroy?.();continue;}
    keep.push(obj);
  }
  scene._ktDenseVegetation=keep;
}

function rebuild(scene){
  if(!isKT(scene))return;
  const {center,fallback}=centerline(scene); if(center.length<24)return;
  if(Array.isArray(scene._ktStructures))for(const o of scene._ktStructures)o?.destroy?.();
  if(Array.isArray(scene._ktPaddock))for(const o of scene._ktPaddock)o?.destroy?.();

  const placed=[];
  const fi=finishIndex(scene,center),p=center[fi],t=tangent(center,fi);
  const side=1;

  // Entire paddock remains grass. This keeps the existing off-track slowdown behavior.
  // The service axis is pulled much closer to the circuit so all structures stay inside the map.
  const serviceCenter={x:p.x+t.nx*side*170,y:p.y+t.ny*side*170};
  clearPaddockVegetation(scene,p,t,side);

  const placeFacingGrassLane=(spec,along,out,width)=>{
    const pos={x:serviceCenter.x+t.tx*along+t.nx*side*out,y:serviceCenter.y+t.ty*along+t.ny*side*out};
    const target={x:serviceCenter.x+t.tx*along,y:serviceCenter.y+t.ty*along};
    return addImage(scene,placed,spec.key,pos.x,pos.y,width,frontRotationToward(pos,target),12.15);
  };

  // Structures line one side of the grassy paddock corridor and all fronts face inward.
  placeFacingGrassLane(ASSETS.tower,-500,105,172);
  placeFacingGrassLane(ASSETS.pit,-245,112,315);
  placeFacingGrassLane(ASSETS.paddock,75,108,230);
  placeFacingGrassLane(ASSETS.grandstand,330,118,380);

  // Keep two clear grass accesses to the circuit: lower access near the current car position
  // and a second access at the upper end. No asphalt overlay is drawn, so both remain grass.
  // Marshal posts stay trackside and face the racing surface.
  for(const [frac,sideM] of [[.34,1],[.62,-1]]){
    const i=Math.floor(center.length*frac)%center.length,q=center[i],tt=tangent(center,i),h=Number(q.width||fallback)*.5;
    const pos={x:q.x+tt.nx*sideM*(h+145),y:q.y+tt.ny*sideM*(h+145)};
    const target={x:q.x,y:q.y};
    addImage(scene,placed,ASSETS.marshal.key,pos.x,pos.y,122,frontRotationToward(pos,target),12.12);
  }

  scene._ktPaddock=placed;
}

function ensure(scene){
  const missing=[];
  for(const s of Object.values(ASSETS))if(!scene.textures.exists(s.key)){scene.load.image(s.key,s.url);missing.push(s.key);}
  const apply=()=>scene.time?.delayedCall?.(0,()=>rebuild(scene));
  if(!missing.length){apply();return;}
  scene.load.once('complete',apply); if(!scene.load.isLoading())scene.load.start();
}

export class RaceScene extends CurrentRaceScene{
  create(){super.create(); if(isKT(this))ensure(this);}
}
