const MAX_OUTPUT_EDGE=8192;
const MAX_OUTPUT_PIXELS=48000000;
const TILE_SIZE=1536;

function pointXY(p){
  if(Array.isArray(p))return{x:Number(p[0]),y:Number(p[1])};
  return{x:Number(p?.x),y:Number(p?.y)};
}
function safeName(value){return String(value||'track').trim().replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'track';}
function captureDimensions(scene){
  const worldW=Math.max(1,Math.round(Number(scene?.worldW||scene?.track?.meta?.worldW)||1));
  const worldH=Math.max(1,Math.round(Number(scene?.worldH||scene?.track?.meta?.worldH)||1));
  const edgeScale=Math.min(1,MAX_OUTPUT_EDGE/Math.max(worldW,worldH));
  const pixelScale=Math.min(1,Math.sqrt(MAX_OUTPUT_PIXELS/Math.max(1,worldW*worldH)));
  const scale=Math.max(.1,Math.min(edgeScale,pixelScale));
  return{worldW,worldH,scale,outW:Math.max(1,Math.round(worldW*scale)),outH:Math.max(1,Math.round(worldH*scale))};
}
function makeProgress(kind){
  if(typeof document==='undefined')return{update:()=>{},remove:()=>{}};
  const root=document.createElement('div');
  root.dataset.tdrCaptureProgress='1';
  root.style.cssText='position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:rgba(4,10,18,.80);color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none';
  root.innerHTML=`<div style="min-width:250px;padding:20px 24px;border:1px solid rgba(88,232,255,.45);border-radius:16px;background:#07101b;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.45)"><div style="font-size:14px;font-weight:900;letter-spacing:.10em">${kind==='technical'?'CAPTURA TÉCNICA':'CAPTURA MUNDO'}</div><div data-p style="margin-top:9px;font-size:12px;color:#9cc7dc">PREPARANDO · 0%</div></div>`;
  document.body.appendChild(root);
  return{update:(value,label='GENERANDO')=>{const p=root.querySelector('[data-p]');if(p)p.textContent=`${label} · ${Math.max(0,Math.min(100,Math.round(Number(value)||0)))}%`;},remove:()=>{try{root.remove();}catch{}}};
}
function setVisible(obj,value){try{obj?.setVisible?.(value);}catch{try{obj.visible=value;}catch{}}}
function temporarilyHideCaptureUi(scene){
  const changed=[];
  const hide=obj=>{if(!obj||obj.visible===false)return;changed.push(obj);setVisible(obj,false);};
  for(const obj of scene?.children?.list||[]){
    const sx=Number(obj?.scrollFactorX),sy=Number(obj?.scrollFactorY);
    if(sx===0&&sy===0)hide(obj);
  }
  hide(scene?.cpGfx);hide(scene?.gridDebug);hide(scene?.finishLineDebug);hide(scene?._touchDbg);
  return()=>{for(const obj of changed)setVisible(obj,true);};
}
function snapshotTexture(rt){
  return new Promise((resolve,reject)=>{
    try{rt.snapshot(image=>image?resolve(image):reject(new Error('Empty render snapshot')),'image/png',1);}catch(err){reject(err);}
  });
}
function canvasBlob(canvas){
  return new Promise((resolve,reject)=>{
    try{canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoder returned no data')),'image/png');}catch(err){reject(err);}
  });
}
function deliverBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';a.style.display='none';document.body.appendChild(a);
  try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
function tracePolyline(ctx,points){
  let started=false;
  for(const raw of points||[]){const p=pointXY(raw);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}
  return started;
}
function drawGate(ctx,gate,color,width){
  if(!gate?.a||!gate?.b)return;const a=pointXY(gate.a),b=pointXY(gate.b);if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return;
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
function drawTechnicalOverlay(ctx,scene,scale){
  const meta=scene?.track?.meta||{};
  ctx.save();ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
  const lineW=Math.max(3,5/Math.max(.1,scale));
  const cl=Array.isArray(meta.centerline)?meta.centerline:(Array.isArray(scene?.centerlinePoints)?scene.centerlinePoints:[]);
  if(cl.length>1){ctx.strokeStyle='#00eaff';ctx.lineWidth=lineW;ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=Math.max(2,3/scale);ctx.beginPath();if(tracePolyline(ctx,cl))ctx.stroke();ctx.shadowBlur=0;}
  const finish=meta.finishLine||meta.finish;drawGate(ctx,finish,'#ffffff',Math.max(lineW*1.35,6/scale));
  let checkpoints=[];
  if(scene?.checkpoints&&typeof scene.checkpoints==='object')checkpoints=Object.values(scene.checkpoints);
  else if(Array.isArray(meta.checkpoints))checkpoints=meta.checkpoints;
  const colors=['#ffd400','#38ff75','#ff7a3d','#d86cff'];
  checkpoints.forEach((gate,i)=>drawGate(ctx,gate,colors[i%colors.length],Math.max(lineW,5/scale)));
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1,2/scale);ctx.setLineDash([12/scale,8/scale]);ctx.strokeRect(1/scale,1/scale,Math.max(0,(Number(scene.worldW)||0)-2/scale),Math.max(0,(Number(scene.worldH)||0)-2/scale));
  ctx.restore();
}
function cleanupRaceDom(){
  if(typeof document==='undefined')return;
  try{document.getElementById('tdr-race-controls')?.remove?.();}catch{}
  try{document.querySelectorAll('[data-tdr-capture-progress="1"]').forEach(node=>node.remove?.());}catch{}
}
async function renderWholeWorld(scene,technical){
  if(typeof document==='undefined')throw new Error('Capture requires a browser document');
  if(scene?._tdrRaceCaptureBusy)return null;
  scene._tdrRaceCaptureBusy=true;
  const progress=makeProgress(technical?'technical':'world');
  let restore=()=>{};
  try{
    const {worldW,worldH,scale,outW,outH}=captureDimensions(scene);
    const canvas=document.createElement('canvas');canvas.width=outW;canvas.height=outH;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Unable to create output canvas');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#0b1020';ctx.fillRect(0,0,outW,outH);
    restore=temporarilyHideCaptureUi(scene);
    try{scene.children?.depthSort?.();}catch{}
    const cols=Math.ceil(worldW/TILE_SIZE),rows=Math.ceil(worldH/TILE_SIZE),total=Math.max(1,cols*rows);let done=0;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const x=col*TILE_SIZE,y=row*TILE_SIZE,w=Math.min(TILE_SIZE,worldW-x),h=Math.min(TILE_SIZE,worldH-y);
      const rt=scene.make.renderTexture({x:0,y:0,width:w,height:h,add:false});
      try{
        rt.draw(scene.children,-x,-y);
        const image=await snapshotTexture(rt);
        const dx=Math.round(x*scale),dy=Math.round(y*scale),dw=Math.max(1,Math.round(w*scale)),dh=Math.max(1,Math.round(h*scale));
        ctx.drawImage(image,0,0,w,h,dx,dy,dw,dh);
      }finally{try{rt.destroy();}catch{}}
      done++;progress.update(done/total*88,'RENDERIZANDO');
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    restore();restore=()=>{};
    if(technical){progress.update(92,'DIBUJANDO GUÍAS');drawTechnicalOverlay(ctx,scene,scale);}
    progress.update(96,'CODIFICANDO PNG');
    const blob=await canvasBlob(canvas);
    const track=safeName(scene?.trackKey||scene?.track?.meta?.id||'track');
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    const type=technical?'technical':'world';
    deliverBlob(blob,`tdr_${track}_${type}_${outW}x${outH}_${stamp}.png`);
    progress.update(100,'PNG LISTO');
    return{width:outW,height:outH,scale,bytes:blob.size};
  }finally{
    try{restore();}catch{}
    scene._tdrRaceCaptureBusy=false;
    setTimeout(()=>progress.remove(),250);
  }
}

export function installRaceCaptureRuntime(RaceSceneClass){
  const proto=RaceSceneClass?.prototype;if(!proto||proto.__tdrRaceCaptureInstalled)return;
  proto.exportCaptureWorld=function(){return renderWholeWorld(this,false);};
  proto.exportTechnicalCapture=function(){return renderWholeWorld(this,true);};
  const originalCreate=proto.create;
  proto.create=function(...args){
    const result=originalCreate?.apply(this,args);
    this.events?.once?.('shutdown',()=>{cleanupRaceDom();});
    this.events?.once?.('destroy',()=>{cleanupRaceDom();});
    return result;
  };
  proto.__tdrRaceCaptureInstalled=true;
}
