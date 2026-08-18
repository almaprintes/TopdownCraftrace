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

function localToWorld(origin,t,n,along,out){return {x:origin.x+t.tx*along+n.nx*out,y:origin.y+t.ty*along+n.ny*out};}

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

function drawPaddock(scene,origin,t,n,side,placed){
  const roadCenter={x:origin.x+n.nx*side*305,y:origin.y+n.ny*side*305};
  const g=scene.add.graphics().setDepth(5.7);
  g.setPosition(roadCenter.x,roadCenter.y).setRotation(Math.atan2(t.ty,t.tx));
  g.fillStyle(0x242527,1); g.lineStyle(3,0x55585d,.95);
  g.fillRoundedRect(-610,-104,1220,208,18); g.strokeRoundedRect(-610,-104,1220,208,18);
  g.fillStyle(0x303236,.95); g.fillRoundedRect(-590,-84,1180,168,12);
  g.lineStyle(3,0xe2b43e,.86); g.lineBetween(-565,0,565,0);
  g.lineStyle(2,0xe2b43e,.7);
  for(let x=-520;x<=520;x+=130){g.lineBetween(x,-76,x,-28);g.lineBetween(x,28,x,76);}
  scene.uiCam?.ignore?.(g); placed.push(g);

  const link=scene.add.graphics().setDepth(5.65);
  link.fillStyle(0x2b2d30,1); link.lineStyle(2,0x55585d,.9);
  const inner={x:origin.x+n.nx*side*110,y:origin.y+n.ny*side*110};
  const outer={x:roadCenter.x,y:roadCenter.y};
  const ang=Math.atan2(outer.y-inner.y,outer.x-inner.x),len=Math.hypot(outer.x-inner.x,outer.y-inner.y);
  link.setPosition((inner.x+outer.x)/2,(inner.y+outer.y)/2).setRotation(ang);
  link.fillRoundedRect(-len/2,-42,len,84,10); link.strokeRoundedRect(-len/2,-42,len,84,10);
  scene.uiCam?.ignore?.(link); placed.push(link);
  return roadCenter;
}

function rebuild(scene){
  if(!isKT(scene))return;
  const {center,fallback}=centerline(scene); if(center.length<24)return;
  if(Array.isArray(scene._ktStructures))for(const o of scene._ktStructures)o?.destroy?.();
  if(Array.isArray(scene._ktPaddock))for(const o of scene._ktPaddock)o?.destroy?.();

  const placed=[];
  const fi=finishIndex(scene,center),p=center[fi],t=tangent(center,fi);
  const side=1,half=Number(p.width||fallback)*.5;
  const trackEdge={x:p.x+t.nx*side*(half+10),y:p.y+t.ny*side*(half+10)};
  const roadCenter=drawPaddock(scene,p,t,t,side,placed);
  const outerSign=side;

  const placeFacingRoad=(spec,along,out,width)=>{
    const pos={x:roadCenter.x+t.tx*along+t.nx*outerSign*out,y:roadCenter.y+t.ty*along+t.ny*outerSign*out};
    const target={x:roadCenter.x+t.tx*along,y:roadCenter.y+t.ty*along};
    return addImage(scene,placed,spec.key,pos.x,pos.y,width,frontRotationToward(pos,target),12.15);
  };

  placeFacingRoad(ASSETS.pit,-250,175,320);
  placeFacingRoad(ASSETS.paddock,80,168,235);
  placeFacingRoad(ASSETS.grandstand,330,182,390);
  placeFacingRoad(ASSETS.tower,-500,160,175);

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
