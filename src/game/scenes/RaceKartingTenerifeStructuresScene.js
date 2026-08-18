import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifeIdentityVegetationScene.js';

const BASE = import.meta.env.BASE_URL || '/';

const STRUCTURES = {
  pit: { key:'kt-pit-garage-small-01', url:`${BASE}assets/environment/structures/pit_garage_small_01.webp`, width:300, aspect:.56 },
  paddock: { key:'kt-paddock-box-small-01', url:`${BASE}assets/environment/structures/paddock_box_small_01.webp`, width:220, aspect:.76 },
  tower: { key:'kt-control-tower-small-01', url:`${BASE}assets/environment/structures/control_tower_small_01.webp`, width:170, aspect:.86 },
  grandstand: { key:'kt-grandstand-half-01', url:`${BASE}assets/environment/structures/grandstand_half_01.webp`, width:360, aspect:.66 },
  marshal: { key:'kt-marshal-post-01', url:`${BASE}assets/environment/structures/marshal_post_01.webp`, width:118, aspect:.82 }
};

function isKartingTenerife(scene){
  const id=String(scene?.trackKey||scene?.track?.id||scene?.track?.key||'').toLowerCase();
  const name=String(scene?.track?.name||scene?.track?.meta?.name||'').toLowerCase();
  return id.includes('karting-tenerife')||id.includes('karting_tenerife')||name.includes('karting tenerife');
}

function normalizeCenter(scene){
  const fallback=Number(scene.track?.trackWidth||scene.track?.meta?.trackWidth||160);
  const raw=scene.track?.geom?.center||scene.track?.centerline||[];
  const center=raw.map(p=>Array.isArray(p)
    ? {x:Number(p[0]),y:Number(p[1]),width:fallback}
    : {x:Number(p?.x),y:Number(p?.y),width:Number(p?.width||fallback)})
    .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  return {center,fallback};
}

function tangentAt(center,i){
  const n=center.length;
  const a=center[(i-3+n)%n], b=center[(i+3)%n];
  const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1;
  const tx=dx/d, ty=dy/d;
  return {tx,ty,nx:-ty,ny:tx};
}

function isClear(center,x,y,fallback,clearance){
  const stride=Math.max(1,Math.floor(center.length/280));
  for(let i=0;i<center.length;i+=stride){
    const p=center[i];
    const half=Number(p.width||fallback)*.5;
    if(Math.hypot(x-p.x,y-p.y)<half+clearance)return false;
  }
  return true;
}

function fractionNearFinish(scene,center){
  const finish=scene.track?.finishAnchor||scene.track?.meta?.finishAnchor;
  const fx=Number(finish?.x), fy=Number(finish?.y);
  if(!Number.isFinite(fx)||!Number.isFinite(fy))return .72;
  let best=0,dist=Infinity;
  for(let i=0;i<center.length;i++){
    const d=Math.hypot(center[i].x-fx,center[i].y-fy);
    if(d<dist){dist=d;best=i;}
  }
  return best/center.length;
}

function anchorAt(center,fraction,side,extra,fallback){
  const probes=[0,.008,-.008,.016,-.016,.028,-.028,.042,-.042];
  for(const df of probes){
    const f=(fraction+df+1)%1;
    const i=Math.floor(center.length*f)%center.length;
    const p=center[i],t=tangentAt(center,i);
    const half=Number(p.width||fallback)*.5;
    const x=p.x+t.nx*side*(half+extra);
    const y=p.y+t.ny*side*(half+extra);
    if(isClear(center,x,y,fallback,55))return {...t,x,y,i};
  }
  return null;
}

function footprintClear(center,fallback,a,width,height,rotation){
  const c=Math.cos(rotation),s=Math.sin(rotation);
  const pts=[[0,0],[width*.46,0],[-width*.46,0],[0,height*.42],[0,-height*.42],[width*.38,height*.32],[width*.38,-height*.32],[-width*.38,height*.32],[-width*.38,-height*.32]];
  return pts.every(([lx,ly])=>{
    const x=a.x+lx*c-ly*s;
    const y=a.y+lx*s+ly*c;
    return isClear(center,x,y,fallback,10);
  });
}

function addStructure(scene,placed,spec,a,rotation,widthOverride=0){
  if(!a||!scene.textures.exists(spec.key))return null;
  const width=widthOverride||spec.width;
  const img=scene.add.image(a.x,a.y,spec.key).setScrollFactor(1).setDepth(12.05).setRotation(rotation);
  if(img.width>0)img.setDisplaySize(width,img.height*(width/img.width));
  scene.uiCam?.ignore?.(img);
  placed.push(img);
  return img;
}

function placeOne(scene,placed,center,fallback,{asset,fraction,side,extra,rotationOffset=0,width=0,clearance=0}){
  const spec=STRUCTURES[asset];
  if(!spec)return;
  const a=anchorAt(center,fraction,side,extra,fallback);
  if(!a)return;
  const rotation=Math.atan2(a.ty,a.tx)+rotationOffset;
  const finalWidth=width||spec.width;
  const height=finalWidth*spec.aspect;
  if(!footprintClear(center,fallback,a,finalWidth+clearance,height+clearance,rotation))return;
  addStructure(scene,placed,spec,a,rotation,finalWidth);
}

function placeStructures(scene){
  if(!isKartingTenerife(scene))return;
  const {center,fallback}=normalizeCenter(scene);
  if(center.length<24)return;

  if(Array.isArray(scene._ktStructures))for(const obj of scene._ktStructures)obj?.destroy?.();
  const placed=[];
  const ff=fractionNearFinish(scene,center);

  // Main paddock complex beside the start/finish area.
  placeOne(scene,placed,center,fallback,{asset:'pit',fraction:(ff+.028)%1,side:1,extra:255,rotationOffset:0,width:310,clearance:36});
  placeOne(scene,placed,center,fallback,{asset:'paddock',fraction:(ff+.060)%1,side:1,extra:300,rotationOffset:0,width:230,clearance:34});
  placeOne(scene,placed,center,fallback,{asset:'tower',fraction:(ff-.020+1)%1,side:1,extra:235,rotationOffset:Math.PI/2,width:176,clearance:30});

  // Main spectator area facing the start/finish straight.
  placeOne(scene,placed,center,fallback,{asset:'grandstand',fraction:(ff+.010)%1,side:-1,extra:270,rotationOffset:0,width:370,clearance:46});

  // Two marshal posts placed at separated technical sections.
  placeOne(scene,placed,center,fallback,{asset:'marshal',fraction:.34,side:1,extra:150,rotationOffset:Math.PI/2,width:122,clearance:24});
  placeOne(scene,placed,center,fallback,{asset:'marshal',fraction:.62,side:-1,extra:155,rotationOffset:Math.PI/2,width:118,clearance:24});

  scene._ktStructures=placed;
}

function ensureStructures(scene){
  const missing=[];
  for(const spec of Object.values(STRUCTURES)){
    if(!scene.textures.exists(spec.key)){
      scene.load.image(spec.key,spec.url);
      missing.push(spec.key);
    }
  }
  if(!missing.length){placeStructures(scene);return;}
  scene.load.once('complete',()=>placeStructures(scene));
  if(!scene.load.isLoading())scene.load.start();
}

export class RaceScene extends CurrentRaceScene {
  create(){
    super.create();
    if(isKartingTenerife(this))ensureStructures(this);
  }
}
