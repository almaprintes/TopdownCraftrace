function isIOSDevice(){
  try{
    const ua=String(navigator?.userAgent||'');
    const platform=String(navigator?.platform||'');
    return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);
  }catch{return false;}
}

function trackId(scene,data){
  const direct=data?.trackKey||scene?.trackKey||scene?.track?.meta?.id;
  if(direct)return String(direct).trim().toLowerCase();
  try{return String(localStorage.getItem('tdr2:trackKey')||'').trim().toLowerCase();}catch{return '';}
}

function isCarObject(scene,obj){
  if(!obj)return false;
  if(obj===scene.car||obj===scene.carBody||obj===scene.carRig)return true;
  try{
    let p=obj;
    while(p){
      if(p===scene.carRig||p===scene.carBody||p===scene.car)return true;
      p=p.parentContainer;
    }
  }catch{}
  return false;
}

function isFixedUi(obj){
  try{
    const sx=Number(obj?.scrollFactorX);
    const sy=Number(obj?.scrollFactorY);
    return sx===0&&sy===0;
  }catch{return false;}
}

function stripTexturedWorld(scene){
  const list=[...(scene.children?.list||[])];
  let removed=0;
  for(const obj of list){
    if(!obj?.scene)continue;
    if(isCarObject(scene,obj))continue;
    if(isFixedUi(obj))continue;
    const type=String(obj?.type||obj?.constructor?.name||'').toLowerCase();
    const textured=type.includes('image')||type.includes('sprite')||type.includes('tilesprite')||type.includes('particle')||type.includes('emitter');
    if(!textured)continue;
    try{obj.destroy?.(true);removed++;}catch{}
  }
  return removed;
}

function drawProceduralGround(scene){
  const worldW=Math.max(1,Number(scene.track?.meta?.worldW||scene.physics?.world?.bounds?.width||2430));
  const worldH=Math.max(1,Number(scene.track?.meta?.worldH||scene.physics?.world?.bounds?.height||2000));
  const left=scene.track?.geom?.left;
  const right=scene.track?.geom?.right;

  const g=scene.add.graphics().setDepth(-5000).setScrollFactor(1);
  g.fillStyle(0x355f2f,1);
  g.fillRect(0,0,worldW,worldH);

  const count=Math.min(left?.length||0,right?.length||0);
  if(count>=3){
    g.fillStyle(0x55585d,1);
    for(let i=0;i<count;i++){
      const j=(i+1)%count;
      const l0=left[i],r0=right[i],r1=right[j],l1=left[j];
      const x=(p)=>Array.isArray(p)?Number(p[0]):Number(p?.x);
      const y=(p)=>Array.isArray(p)?Number(p[1]):Number(p?.y);
      const pts=[
        {x:x(l0),y:y(l0)},{x:x(r0),y:y(r0)},
        {x:x(r1),y:y(r1)},{x:x(l1),y:y(l1)}
      ];
      if(pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))g.fillPoints(pts,true);
    }
  }
  try{scene.uiCam?.ignore?.(g);}catch{}
  scene._iosProceduralOnlyGround=g;
  scene.events.once('shutdown',()=>{try{g.destroy?.();}catch{}scene._iosProceduralOnlyGround=null;});
}

function apply(scene,data){
  if(!isIOSDevice()||trackId(scene,data)!=='track01')return;
  try{
    const removed=stripTexturedWorld(scene);
    drawProceduralGround(scene);
    scene._beautyLayerActive=false;
    scene._forceNoOverlay=true;
    scene._forceNoParticles=true;
    console.info('[TDR2] iOS Atlantico procedural-only A/B active',{removed});
  }catch(err){
    console.warn('[TDR2] iOS procedural-only A/B failed',err);
  }
}

export function installIosAtlanticoProceduralOnlyAB(RaceSceneClass){
  const proto=RaceSceneClass?.prototype;
  if(!proto||proto.__tdrIosAtlanticoProceduralOnlyABInstalled)return;
  const originalCreate=proto.create;
  proto.create=function patchedIosAtlanticoProceduralOnlyCreate(data){
    const result=originalCreate?.call(this,data);
    apply(this,data);
    return result;
  };
  proto.__tdrIosAtlanticoProceduralOnlyABInstalled=true;
}
