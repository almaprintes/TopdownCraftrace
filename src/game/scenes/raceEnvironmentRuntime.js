import track01Environment from '../tracks/library/track01/track01.environment.json';

const BASE=import.meta.env.BASE_URL||'/';
const ENVIRONMENTS={track01:track01Environment};

function envFor(scene){
  const key=String(scene?.trackKey||scene?.track?.meta?.id||'').trim();
  return ENVIRONMENTS[key]||null;
}

function textureKey(asset){return `race-env:${asset}`;}

function ensureLoadingOverlay(scene){
  if(typeof document==='undefined')return null;
  let root=document.getElementById('tdr-track-loading');
  if(root)return root;
  root=document.createElement('div');
  root.id='tdr-track-loading';
  root.style.cssText='position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:#07101b;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.12em;font-weight:800;pointer-events:auto;';
  root.innerHTML='<div style="text-align:center;padding:24px"><div data-title style="font-size:18px">CARGANDO CIRCUITO</div><div data-p style="margin-top:10px;font-size:12px;opacity:.75">0%</div></div>';
  document.body.appendChild(root);
  const update=(value)=>{const p=root.querySelector('[data-p]');if(p)p.textContent=`${Math.round((Number(value)||0)*100)}%`;};
  scene._tdrEnvLoadProgress=update;
  scene.load?.on?.('progress',update);
  return root;
}

function showLoadingFailure(scene,missing=[]){
  const root=ensureLoadingOverlay(scene);
  if(!root)return;
  const title=root.querySelector('[data-title]');
  const status=root.querySelector('[data-p]');
  if(title)title.textContent='ERROR CARGANDO CIRCUITO';
  if(status){
    status.style.letterSpacing='normal';
    status.textContent=missing.length?'Faltan recursos del circuito. Vuelve a intentarlo.':'No se pudo preparar el circuito. Vuelve a intentarlo.';
  }
}

function removeLoadingOverlay(scene){
  try{if(scene?._tdrEnvLoadProgress)scene.load?.off?.('progress',scene._tdrEnvLoadProgress);}catch{}
  scene._tdrEnvLoadProgress=null;
  try{document.getElementById('tdr-track-loading')?.remove?.();}catch{}
}

function preloadEnvironment(scene,env){
  if(!env)return;
  ensureLoadingOverlay(scene);
  const assets=new Map();
  for(const item of env.environment||[])if(item?.asset&&item?.path)assets.set(item.asset,item.path);
  for(const barrier of env.linearBarriers||[])if(barrier?.asset&&barrier?.path)assets.set(barrier.asset,barrier.path);
  scene._tdrExpectedEnvironmentTextures=[...assets.keys()].map(textureKey);
  for(const [asset,path] of assets){
    const key=textureKey(asset);
    if(scene.textures?.exists?.(key))continue;
    scene.load.image(key,`${BASE}assets/${path}`);
  }
}

function missingEnvironmentTextures(scene){
  return (scene?._tdrExpectedEnvironmentTextures||[]).filter(key=>!scene.textures?.exists?.(key));
}

function addSegmentCollider(list,a,b,halfThickness=9){
  const ax=Number(a?.x),ay=Number(a?.y),bx=Number(b?.x),by=Number(b?.y);
  if(![ax,ay,bx,by].every(Number.isFinite)||Math.hypot(bx-ax,by-ay)<1)return;
  list.push({ax,ay,bx,by,halfThickness:Math.max(4,Number(halfThickness)||9)});
}

function addStandaloneCollider(list,item,img){
  if(!String(item?.path||'').includes('environment/barriers/'))return;
  const id=String(item?.asset||'');
  const width=Math.max(8,Number(item?.displayWidth)||Number(img?.displayWidth)||40);
  if(/stack|compact|curve/i.test(id)){
    list.push({cx:Number(item.x),cy:Number(item.y),radius:Math.max(8,width*.31)});
    return;
  }
  const r=Number(item?.rotation)||0;
  const len=width*.88;
  const dx=Math.cos(r)*len*.5,dy=Math.sin(r)*len*.5;
  addSegmentCollider(list,{x:Number(item.x)-dx,y:Number(item.y)-dy},{x:Number(item.x)+dx,y:Number(item.y)+dy},Math.max(7,width*.055));
}

function linearBarrierHalfThickness(barrier){
  const type=String(barrier?.type||'').toLowerCase();
  if(type==='guardrail')return 8;
  // Concrete modules are much wider than the guardrail. This capsule follows
  // the authored polyline but keeps the car centre far enough away that the
  // visible nose/body cannot enter the concrete sprite before collision.
  if(type==='concrete')return 36;
  return 11;
}

function spawnEnvironment(scene,env){
  if(!env)return;
  const objects=[];
  const colliders=[];

  for(const item of env.environment||[]){
    const key=textureKey(item?.asset);
    if(!scene.textures?.exists?.(key))throw new Error(`Missing environment texture ${key}`);
    const img=scene.add.image(Number(item.x)||0,Number(item.y)||0,key)
      .setRotation(Number(item.rotation)||0)
      .setFlip(!!item.flipX,!!item.flipY)
      .setDepth(Number.isFinite(Number(item.z))?Number(item.z):12)
      .setScrollFactor(1);
    const targetW=Math.max(1,Number(item.displayWidth)||img.width||1);
    if((img.width||0)>0)img.setDisplaySize(targetW,(img.height||1)*(targetW/(img.width||1)));
    scene.uiCam?.ignore?.(img);
    objects.push(img);
    addStandaloneCollider(colliders,item,img);
  }

  // The race scene already renders the visual modules for linear barriers.
  // Here we only create collision geometry matching the authored polyline.
  for(const barrier of env.linearBarriers||[]){
    const points=Array.isArray(barrier?.points)&&barrier.points.length>1?barrier.points:[{x:barrier?.x1,y:barrier?.y1},{x:barrier?.x2,y:barrier?.y2}];
    const thickness=linearBarrierHalfThickness(barrier);
    for(let i=0;i<points.length-1;i++)addSegmentCollider(colliders,points[i],points[i+1],thickness);
  }

  scene._tdrRaceEnvironment={objects,colliders};
  scene.events.once('shutdown',()=>{
    const runtime=scene._tdrRaceEnvironment;
    for(const obj of runtime?.objects||[])try{obj?.destroy?.();}catch{}
    scene._tdrRaceEnvironment=null;
    removeLoadingOverlay(scene);
  });
}

function resolveBodyAgainstColliders(scene,body){
  if(!body?.body)return;
  const list=scene?._tdrRaceEnvironment?.colliders||[];
  if(!list.length)return;
  const radius=Math.max(8,Number(body.body.radius)||14);
  let px=Number(body.x),py=Number(body.y);
  let vx=Number(body.body.velocity?.x)||0,vy=Number(body.body.velocity?.y)||0;

  for(let pass=0;pass<2;pass++){
    for(const c of list){
      if(Number.isFinite(c.radius)){
        const dx=px-c.cx,dy=py-c.cy;
        const d=Math.hypot(dx,dy);
        const min=radius+c.radius;
        if(d>=min)continue;
        const nx=d>1e-6?dx/d:1,ny=d>1e-6?dy/d:0;
        const push=min-d+.75;px+=nx*push;py+=ny*push;
        const vn=vx*nx+vy*ny;
        if(vn<0){vx-=vn*1.18*nx;vy-=vn*1.18*ny;}
        continue;
      }

      const abx=c.bx-c.ax,aby=c.by-c.ay,len2=abx*abx+aby*aby;
      if(len2<1)continue;
      let t=((px-c.ax)*abx+(py-c.ay)*aby)/len2;t=Math.max(0,Math.min(1,t));
      const qx=c.ax+abx*t,qy=c.ay+aby*t;
      const dx=px-qx,dy=py-qy,d=Math.hypot(dx,dy),min=radius+c.halfThickness;
      if(d>=min)continue;
      let nx,ny;
      if(d>1e-6){nx=dx/d;ny=dy/d;}else{const inv=1/Math.sqrt(len2);nx=-aby*inv;ny=abx*inv;if(vx*nx+vy*ny>0){nx=-nx;ny=-ny;}}
      const push=min-d+.75;px+=nx*push;py+=ny*push;
      const vn=vx*nx+vy*ny;
      if(vn<0){vx-=vn*1.18*nx;vy-=vn*1.18*ny;}
    }
  }

  body.setPosition?.(px,py);
  if(body.body.velocity){body.body.velocity.x=vx;body.body.velocity.y=vy;}
}

function applyBarrierCollisions(scene){
  if(!scene?._tdrEnvironmentReady)return;
  resolveBodyAgainstColliders(scene,scene.carBody||scene.car);
  if(scene.carRig&&scene.carBody){scene.carRig.x=scene.carBody.x;scene.carRig.y=scene.carBody.y;}
  for(const ai of scene.gridCars||[]){
    resolveBodyAgainstColliders(scene,ai?.body);
    if(ai?.rig&&ai?.body){ai.rig.x=ai.body.x;ai.rig.y=ai.body.y;}
  }
}

export function installRaceEnvironmentRuntime(RaceSceneClass){
  const proto=RaceSceneClass?.prototype;
  if(!proto||proto.__tdrRaceEnvironmentInstalled)return;

  const originalPreload=proto.preload;
  proto.preload=function patchedRaceEnvironmentPreload(...args){
    const result=originalPreload?.apply(this,args);
    try{preloadEnvironment(this,envFor(this));}catch(err){console.warn('[race-environment] preload failed',err);}
    return result;
  };

  const originalCreate=proto.create;
  proto.create=function patchedRaceEnvironmentCreate(data){
    const env=envFor(this);
    if(!env)return originalCreate?.call(this,data);

    const result=originalCreate?.call(this,data);
    this._tdrEnvironmentReady=false;
    this.time.paused=true;

    try{
      const missing=missingEnvironmentTextures(this);
      if(missing.length){
        showLoadingFailure(this,missing);
        console.error('[race-environment] missing textures',missing);
        return result;
      }

      spawnEnvironment(this,env);
      this._tdrEnvironmentReady=true;
      removeLoadingOverlay(this);
      this.time.paused=false;
    }catch(err){
      this._tdrEnvironmentReady=false;
      showLoadingFailure(this);
      console.error('[race-environment] create failed',err);
    }
    return result;
  };

  const originalUpdate=proto.update;
  proto.update=function patchedRaceEnvironmentUpdate(time,delta){
    const result=originalUpdate?.call(this,time,delta);
    try{applyBarrierCollisions(this);}catch(err){if(!this._tdrBarrierCollisionWarned){this._tdrBarrierCollisionWarned=true;console.warn('[race-environment] collision failed',err);}}
    return result;
  };

  proto.__tdrRaceEnvironmentInstalled=true;
}
