import { RaceScene as CurrentRaceScene } from './RaceF1SessionReportScene.js';

const BASE = import.meta.env.BASE_URL || '/';
const KT_NAME = 'KARTING TENERIFE';

const KT_ASSETS = {
  broad1: { key:'kt-tree-broad-01', url:`${BASE}assets/environment/vegetation/tree_broad_01.webp` },
  broad2: { key:'kt-tree-broad-02', url:`${BASE}assets/environment/vegetation/tree_broad_02.webp` },
  palm:   { key:'kt-palm-tall-01', url:`${BASE}assets/environment/vegetation/palm_tall_01.webp` },
  shrubA: { key:'kt-shrub-round-01', url:`${BASE}assets/environment/shrub_round_01.webp` },
  shrubB: { key:'kt-shrub-flowers-01', url:`${BASE}assets/environment/shrub_flowers_01.webp` }
};

function isKartingTenerife(scene){
  const id = String(scene?.trackKey || scene?.track?.id || scene?.track?.key || '').toLowerCase();
  const name = String(scene?.track?.name || scene?.track?.meta?.name || '').toLowerCase();
  return id === 'karting-tenerife' || id.includes('karting-tenerife') || id.includes('karting_tenerife') || name.includes('karting tenerife');
}

function canonicalizeIdentity(scene){
  if(!isKartingTenerife(scene)) return;
  if(scene.track){
    scene.track.id = 'karting-tenerife';
    scene.track.key = 'karting-tenerife';
    scene.track.name = KT_NAME;
    scene.track.meta = { ...(scene.track.meta || {}), name:KT_NAME, publicName:KT_NAME, circuitId:'karting-tenerife' };
  }

  const fix = (value) => String(value || '')
    .replace(/CIRCUITO\s+ATL[ÁA]NTICO/gi, KT_NAME)
    .replace(/CIRCUITO\s+ATLANTICO/gi, KT_NAME);

  for(const obj of scene.children?.list || []){
    if(typeof obj?.text === 'string'){
      const next = fix(obj.text);
      if(next !== obj.text) obj.setText?.(next);
    }
  }

  // Some labels are built one frame later by layered scenes / debug aerial capture.
  scene.time?.delayedCall?.(0, () => {
    for(const obj of scene.children?.list || []){
      if(typeof obj?.text === 'string'){
        const next = fix(obj.text);
        if(next !== obj.text) obj.setText?.(next);
      }
    }
  });
}

function tangentAt(center, i){
  const n=center.length;
  const a=center[(i-3+n)%n], b=center[(i+3)%n];
  const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1;
  const tx=dx/d, ty=dy/d;
  return {tx,ty,nx:-ty,ny:tx};
}

function clearOfTrack(center,x,y,defaultW,clearance){
  const stride=Math.max(1,Math.floor(center.length/260));
  for(let i=0;i<center.length;i+=stride){
    const p=center[i];
    const half=Number(p.width||defaultW)*0.5;
    if(Math.hypot(x-p.x,y-p.y)<half+clearance) return false;
  }
  return true;
}

function addSprite(scene,placed,key,x,y,width,rotation,depth=7.05){
  if(!scene.textures.exists(key)) return null;
  const img=scene.add.image(x,y,key).setScrollFactor(1).setDepth(depth).setRotation(rotation||0);
  if(img.width>0) img.setDisplaySize(width,img.height*(width/img.width));
  scene.uiCam?.ignore?.(img);
  placed.push(img);
  return img;
}

function placeDenseVegetation(scene){
  if(!isKartingTenerife(scene)) return;
  const defaultW=Number(scene.track?.trackWidth || scene.track?.meta?.trackWidth || 160);
  const raw=scene.track?.geom?.center || scene.track?.centerline || [];
  const center=raw.map(p=>Array.isArray(p)
    ? {x:Number(p[0]),y:Number(p[1]),width:defaultW}
    : {x:Number(p?.x),y:Number(p?.y),width:Number(p?.width||defaultW)})
    .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(center.length<24) return;

  if(Array.isArray(scene._ktDenseVegetation)) for(const obj of scene._ktDenseVegetation) obj?.destroy?.();
  const placed=[];

  // Hand-curated dense pockets. Each zone sits well outside the asphalt and each member
  // is independently rejected if another road section gets too close.
  const zones=[
    {f:.025,side:-1,extra:170, members:[[-150,10,'broad1',164,-.18],[-88,62,'broad2',150,.10],[-24,8,'palm',122,.22],[28,80,'broad1',158,-.06],[92,30,'broad2',146,.14],[148,88,'palm',116,-.20],[-22,132,'shrubA',72,.08],[78,142,'shrubB',66,-.12]]},
    {f:.145,side:1,extra:178, members:[[-160,26,'palm',118,.18],[-106,92,'broad2',150,-.12],[-42,34,'broad1',166,.06],[22,112,'broad2',148,.16],[86,44,'broad1',158,-.14],[148,106,'palm',116,.24],[-20,158,'shrubB',68,.15],[108,154,'shrubA',70,-.10]]},
    {f:.31,side:-1,extra:182, members:[[-150,18,'broad2',152,.14],[-94,94,'broad1',164,-.08],[-30,42,'palm',120,-.18],[34,126,'broad2',146,.12],[92,54,'broad1',160,.20],[152,114,'palm',114,-.24],[-36,166,'shrubA',72,.06],[96,174,'shrubB',66,-.13]]},
    {f:.48,side:1,extra:186, members:[[-162,36,'broad1',166,-.16],[-102,116,'palm',120,.20],[-40,54,'broad2',150,.08],[28,140,'broad1',160,-.10],[94,64,'broad2',148,.18],[156,126,'palm',116,-.21],[-14,186,'shrubB',68,.14],[112,182,'shrubA',72,-.08]]},
    {f:.64,side:-1,extra:180, members:[[-154,30,'palm',116,.22],[-96,100,'broad1',164,-.12],[-34,46,'broad2',150,.10],[30,132,'broad1',158,.06],[94,58,'palm',120,-.18],[150,120,'broad2',146,.16],[-20,178,'shrubA',70,.11],[108,172,'shrubB',68,-.15]]},
    {f:.81,side:1,extra:184, members:[[-158,28,'broad2',152,-.17],[-98,104,'broad1',164,.09],[-34,48,'palm',118,.21],[30,134,'broad2',148,-.11],[94,60,'broad1',160,.17],[154,124,'palm',116,-.22],[-18,180,'shrubB',68,.12],[112,176,'shrubA',70,-.09]]},
    {f:.93,side:-1,extra:176, members:[[-142,24,'broad1',162,.13],[-86,96,'broad2',150,-.14],[-24,40,'palm',118,.18],[38,122,'broad1',158,-.07],[98,48,'broad2',146,.16],[150,104,'palm',114,-.20],[-12,166,'shrubA',70,.10],[102,160,'shrubB',66,-.12]]}
  ];

  for(const zone of zones){
    const i=Math.floor(center.length*zone.f)%center.length;
    const p=center[i], t=tangentAt(center,i);
    const half=Number(p.width||defaultW)*0.5;
    const ax=p.x+t.nx*zone.side*(half+zone.extra);
    const ay=p.y+t.ny*zone.side*(half+zone.extra);

    for(const [along,out,asset,width,rot] of zone.members){
      const x=ax+t.tx*along+t.nx*out*zone.side;
      const y=ay+t.ty*along+t.ny*out*zone.side;
      const clearance=asset.startsWith('shrub')?46:(asset==='palm'?62:72);
      if(!clearOfTrack(center,x,y,defaultW,clearance)) continue;
      addSprite(scene,placed,KT_ASSETS[asset].key,x,y,width,rot,7.02);
    }
  }
  scene._ktDenseVegetation=placed;
}

function ensureAssetsThenPlace(scene){
  const missing=[];
  for(const spec of Object.values(KT_ASSETS)){
    if(!scene.textures.exists(spec.key)){
      scene.load.image(spec.key,spec.url);
      missing.push(spec.key);
    }
  }
  if(!missing.length){ placeDenseVegetation(scene); return; }
  scene.load.once('complete',()=>placeDenseVegetation(scene));
  if(!scene.load.isLoading()) scene.load.start();
}

export class RaceScene extends CurrentRaceScene {
  create(){
    super.create();
    canonicalizeIdentity(this);
    if(isKartingTenerife(this)) ensureAssetsThenPlace(this);
  }
}
