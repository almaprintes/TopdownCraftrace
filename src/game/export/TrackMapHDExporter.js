const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function slug(value, fallback = 'circuito') {
  const s = String(value || fallback)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || fallback;
}

function pointOf(p, fallbackW) {
  if (Array.isArray(p)) {
    return { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || fallbackW) };
  }
  return { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || fallbackW) };
}

function xy(p) {
  if (Array.isArray(p)) return { x:Number(p[0]), y:Number(p[1]) };
  return { x:Number(p?.x), y:Number(p?.y) };
}

export function computeTrackExportBounds(scene) {
  const fallbackW = Number(scene.track?.meta?.trackWidth || 160);
  const candidates = [];

  const collect = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const p of arr) {
      const q = xy(p);
      if (Number.isFinite(q.x) && Number.isFinite(q.y)) candidates.push(q);
    }
  };

  collect(scene.track?.geom?.grass?.left);
  collect(scene.track?.geom?.grass?.right);
  collect(scene.track?.geom?.left);
  collect(scene.track?.geom?.right);

  // Include actual placed scenery so the exported crop never clips a real prop.
  for (const obj of (scene._circuitEnvironment || [])) {
    if (!obj?.scene || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) continue;
    const hw = Math.abs(Number(obj.displayWidth || 0)) * 0.6;
    const hh = Math.abs(Number(obj.displayHeight || 0)) * 0.6;
    candidates.push({ x:obj.x - hw, y:obj.y - hh }, { x:obj.x + hw, y:obj.y + hh });
  }

  if (!candidates.length) {
    const raw = scene.track?.geom?.center || scene.track?.meta?.centerline || [];
    for (const p of raw) {
      const q = pointOf(p, fallbackW);
      if (Number.isFinite(q.x) && Number.isFinite(q.y)) candidates.push(q);
    }
  }

  if (!candidates.length) {
    const b = scene.physics?.world?.bounds;
    if (!b?.width || !b?.height) return null;
    return { x:Number(b.x || 0), y:Number(b.y || 0), width:Number(b.width), height:Number(b.height), padWorld:0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of candidates) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }

  // Crop margin only. It does not alter any track geometry or world coordinate.
  const padWorld = Math.max(90, fallbackW * 0.45);
  return {
    x:minX - padWorld,
    y:minY - padWorld,
    width:Math.max(1, maxX - minX + padWorld * 2),
    height:Math.max(1, maxY - minY + padWorld * 2),
    padWorld
  };
}

function makeExportGeometry(bounds, options = {}) {
  const requestedLongSide = Math.round(Number(options.longSide || 4096));
  const longSide = clamp(requestedLongSide, 2048, 4096);
  const paddingPx = Math.max(32, Math.round(Number(options.paddingPx || 72)));
  const usableLong = Math.max(512, longSide - paddingPx * 2);
  const scale = usableLong / Math.max(bounds.width, bounds.height);

  let width = Math.ceil(bounds.width * scale + paddingPx * 2);
  let height = Math.ceil(bounds.height * scale + paddingPx * 2);
  if (width % 2) width += 1;
  if (height % 2) height += 1;
  return { width, height, paddingPx, scale };
}

function gateToJSON(gate) {
  if (!gate?.a || !gate?.b) return null;
  const a = { x:Number(gate.a.x), y:Number(gate.a.y) };
  const b = { x:Number(gate.b.x), y:Number(gate.b.y) };
  if (![a.x,a.y,b.x,b.y].every(Number.isFinite)) return null;
  return { a, b };
}

export function buildTrackMapping(scene, kind, bounds, geometry) {
  const { width, height, paddingPx, scale } = geometry;
  const trackId = scene.trackKey || scene.track?.meta?.id || 'track';
  const trackName = scene.track?.meta?.name || trackId;
  const worldOriginX = bounds.x - paddingPx / scale;
  const worldOriginY = bounds.y - paddingPx / scale;
  const raw = scene.track?.geom?.center || scene.track?.meta?.centerline || [];
  const fallbackW = Number(scene.track?.meta?.trackWidth || 160);
  const centerline = raw.map((p) => pointOf(p, fallbackW))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  return {
    version:3,
    type:'topdown-race-world-map',
    trackId,
    trackName,
    variant:kind === 'technical' ? 'technical' : 'world',
    generatedAt:new Date().toISOString(),
    image:{ width, height, paddingPx },
    worldBounds:{
      x:bounds.x, y:bounds.y, width:bounds.width, height:bounds.height,
      minX:bounds.x, minY:bounds.y,
      maxX:bounds.x + bounds.width, maxY:bounds.y + bounds.height,
      safetyOverscanWorld:bounds.padWorld
    },
    transform:{
      pixelsPerWorldUnit:scale,
      worldUnitsPerPixel:1 / scale,
      worldOriginAtImagePixel00:{ x:worldOriginX, y:worldOriginY },
      formulas:{
        worldToPixel:'px=(worldX-worldOriginX)*pixelsPerWorldUnit; py=(worldY-worldOriginY)*pixelsPerWorldUnit',
        pixelToWorld:'worldX=worldOriginX+px*worldUnitsPerPixel; worldY=worldOriginY+py*worldUnitsPerPixel'
      }
    },
    renderer:{ mode:'deterministic-single-canvas-2d', geometrySource:'runtime-track-geom' },
    track:{
      nominalWidth:Number(scene.track?.meta?.trackWidth || 0) || null,
      centerline,
      finish:gateToJSON(scene.finishLine || scene.track?.meta?.finishLine || scene.track?.meta?.finish),
      checkpoint1:gateToJSON(scene.checkpoints?.cp1),
      checkpoint2:gateToJSON(scene.checkpoints?.cp2)
    }
  };
}

function textureSource(scene, key) {
  try {
    if (!scene.textures?.exists?.(key)) return null;
    const tex = scene.textures.get(key);
    return tex?.getSourceImage?.() || tex?.source?.[0]?.image || null;
  } catch (_) { return null; }
}

function fillWithTexture(ctx, scene, key, fallback) {
  const source = textureSource(scene, key);
  if (source) {
    try {
      const pattern = ctx.createPattern(source, 'repeat');
      if (pattern) { ctx.fillStyle = pattern; return; }
    } catch (_) {}
  }
  ctx.fillStyle = fallback;
}

function ribbonPath(ctx, left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length < 2 || right.length < 2) return false;
  const l0 = xy(left[0]);
  if (!Number.isFinite(l0.x) || !Number.isFinite(l0.y)) return false;
  ctx.beginPath();
  ctx.moveTo(l0.x, l0.y);
  for (let i = 1; i < left.length; i++) {
    const p = xy(left[i]);
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) ctx.lineTo(p.x, p.y);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    const p = xy(right[i]);
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  return true;
}

function drawStripedBand(ctx, innerPts, outerPts, colorA, colorB, segmentLen = 14) {
  if (!Array.isArray(innerPts) || !Array.isArray(outerPts) || innerPts.length < 2 || innerPts.length !== outerPts.length) return;
  let accumLen = 0;
  for (let i = 0; i < innerPts.length; i++) {
    const ni = (i + 1) % innerPts.length;
    const a0 = xy(innerPts[i]), a1 = xy(innerPts[ni]);
    const b1 = xy(outerPts[ni]), b0 = xy(outerPts[i]);
    if (![a0.x,a0.y,a1.x,a1.y,b0.x,b0.y,b1.x,b1.y].every(Number.isFinite)) continue;
    const len = Math.hypot(a1.x - a0.x, a1.y - a0.y);
    ctx.fillStyle = (Math.floor(accumLen / segmentLen) % 2 === 0) ? colorA : colorB;
    ctx.beginPath();
    ctx.moveTo(a0.x,a0.y); ctx.lineTo(a1.x,a1.y); ctx.lineTo(b1.x,b1.y); ctx.lineTo(b0.x,b0.y);
    ctx.closePath(); ctx.fill();
    accumLen += len;
  }
}

function drawFinish(ctx, gate) {
  if (!gate?.a || !gate?.b) return;
  const ax=Number(gate.a.x), ay=Number(gate.a.y), bx=Number(gate.b.x), by=Number(gate.b.y);
  if (![ax,ay,bx,by].every(Number.isFinite)) return;
  const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy);
  if (len < 0.001) return;
  const tx=dx/len, ty=dy/len, px=-ty, py=tx;
  const bandHalf=10, segments=Math.max(8,Math.floor(len/14)), step=len/segments;
  for (let i=0;i<segments;i++) {
    const s0=i*step,s1=(i+1)*step;
    const x0=ax+tx*s0,y0=ay+ty*s0,x1=ax+tx*s1,y1=ay+ty*s1;
    ctx.fillStyle=(i%2===0)?'#ffffff':'#111111';
    ctx.beginPath();
    ctx.moveTo(x0+px*bandHalf,y0+py*bandHalf); ctx.lineTo(x1+px*bandHalf,y1+py*bandHalf);
    ctx.lineTo(x1-px*bandHalf,y1-py*bandHalf); ctx.lineTo(x0-px*bandHalf,y0-py*bandHalf);
    ctx.closePath(); ctx.fill();
  }
}

function drawGate(ctx, gate, color, lineWidth=5) {
  if (!gate?.a || !gate?.b) return;
  ctx.save();
  ctx.strokeStyle=color; ctx.globalAlpha=0.9; ctx.lineWidth=lineWidth;
  ctx.beginPath(); ctx.moveTo(gate.a.x,gate.a.y); ctx.lineTo(gate.b.x,gate.b.y); ctx.stroke();
  ctx.restore();
}

function drawCenterline(ctx, center) {
  if (!Array.isArray(center) || center.length < 2) return;
  const p0=xy(center[0]);
  ctx.save(); ctx.strokeStyle='#22d7ff'; ctx.globalAlpha=0.85; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(p0.x,p0.y);
  for (let i=1;i<center.length;i++) { const p=xy(center[i]); ctx.lineTo(p.x,p.y); }
  ctx.closePath(); ctx.stroke(); ctx.restore();
}

function drawSceneImage(ctx, obj) {
  if (!obj?.scene || obj.visible === false || obj.alpha <= 0 || !obj.texture) return;
  const source = obj.texture?.getSourceImage?.() || obj.texture?.source?.[0]?.image;
  const frame = obj.frame;
  if (!source || !frame) return;
  const sx=Number(frame.cutX || 0), sy=Number(frame.cutY || 0);
  const sw=Number(frame.cutWidth || frame.width || source.width), sh=Number(frame.cutHeight || frame.height || source.height);
  if (!(sw>0 && sh>0)) return;
  const ox=Number(obj.displayOriginX ?? sw*0.5), oy=Number(obj.displayOriginY ?? sh*0.5);
  ctx.save();
  ctx.globalAlpha = clamp(Number(obj.alpha ?? 1),0,1);
  ctx.translate(Number(obj.x||0),Number(obj.y||0));
  ctx.rotate(Number(obj.rotation||0));
  ctx.scale(Number(obj.scaleX||1),Number(obj.scaleY||1));
  try { ctx.drawImage(source,sx,sy,sw,sh,-ox,-oy,sw,sh); } catch (_) {}
  ctx.restore();
}

function drawDeterministicMap(scene, kind, geometry, mapping) {
  const canvas=document.createElement('canvas');
  canvas.width=geometry.width; canvas.height=geometry.height;
  const ctx=canvas.getContext('2d');
  if (!ctx) throw new Error('2D export canvas unavailable');

  const origin=mapping.transform.worldOriginAtImagePixel00;
  const scale=geometry.scale;
  ctx.setTransform(scale,0,0,scale,-origin.x*scale,-origin.y*scale);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';

  // Entire exported rectangle: actual OFF texture anchored in world coordinates.
  fillWithTexture(ctx,scene,'off','#716f61');
  ctx.fillRect(origin.x,origin.y,geometry.width/scale,geometry.height/scale);

  const geom=scene.track?.geom;
  const grassLeft=geom?.grass?.left, grassRight=geom?.grass?.right;
  if (ribbonPath(ctx,grassLeft,grassRight)) {
    fillWithTexture(ctx,scene,'grass','#294f2d');
    ctx.fill();
  }

  // Exact runtime asphalt ribbon. No interpolation is performed here.
  if (ribbonPath(ctx,geom?.left,geom?.right)) {
    fillWithTexture(ctx,scene,'asphalt','#343131');
    ctx.fill();
  }

  // Optional asphalt overlay texture, clipped to the exact same ribbon.
  const overlay=textureSource(scene,'asphaltOverlay') || textureSource(scene,'asphalt-overlay');
  if (overlay && ribbonPath(ctx,geom?.left,geom?.right)) {
    ctx.save(); ctx.clip(); ctx.globalAlpha=0.16;
    try { const p=ctx.createPattern(overlay,'repeat'); if (p) { ctx.fillStyle=p; ctx.fillRect(origin.x,origin.y,geometry.width/scale,geometry.height/scale); } } catch (_) {}
    ctx.restore();
  }

  const exportedGeom=scene.track?.meta?.geometry;
  const exportedCurbs=scene.track?.meta?.curbs;
  const curbsEnabled=exportedCurbs ? exportedCurbs.enabled !== false : true;
  const curbSides=exportedCurbs?.sides || {inner:true,outer:true};
  if (curbsEnabled && exportedGeom) {
    if (curbSides.outer !== false) drawStripedBand(ctx,exportedGeom.trackOuter,exportedGeom.curbOuter,'#d92f2f','#f2f2f2',14);
    if (curbSides.inner !== false) drawStripedBand(ctx,exportedGeom.trackInner,exportedGeom.curbInner,'#d92f2f','#f2f2f2',14);
  }

  // Actual static props, at their exact scene transforms.
  const props=(scene._circuitEnvironment || []).filter((o)=>o?.scene).slice().sort((a,b)=>(a.depth||0)-(b.depth||0));
  for (const obj of props) drawSceneImage(ctx,obj);

  const finish=scene.finishLine || scene.track?.meta?.finishLine || scene.track?.meta?.finish;
  drawFinish(ctx,finish);

  if (kind === 'technical') {
    drawCenterline(ctx,geom?.center || scene.track?.meta?.centerline || []);
    drawGate(ctx,scene.checkpoints?.cp1,'#ffd400',5);
    drawGate(ctx,scene.checkpoints?.cp2,'#2dff6a',5);
  }

  ctx.setTransform(1,0,0,1,0,0);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve,reject)=>{
    try { canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('PNG encode failed')),'image/png'); }
    catch(err){ reject(err); }
  });
}

async function deliverFiles(scene, canvas, mapping, kind) {
  const base=slug(scene.track?.meta?.name || scene.trackKey || 'circuito');
  const suffix=kind==='technical'?'technical-hd':'world-hd';
  const pngName=`${base}-${suffix}.png`, jsonName=`${base}-mapping.json`;
  const pngBlob=await canvasToBlob(canvas);
  const jsonBlob=new Blob([JSON.stringify(mapping,null,2)],{type:'application/json'});

  try {
    if (navigator?.share && typeof File !== 'undefined') {
      const files=[new File([pngBlob],pngName,{type:'image/png'}),new File([jsonBlob],jsonName,{type:'application/json'})];
      if (!navigator.canShare || navigator.canShare({files})) {
        await navigator.share({files,title:`Mapa ${mapping.trackName}`}); return;
      }
    }
  } catch (_) {}

  const download=(blob,name)=>{
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),5000);
  };
  download(pngBlob,pngName); window.setTimeout(()=>download(jsonBlob,jsonName),220);
}

export async function exportTrackMapHD(scene, kind='world', options={}) {
  const bounds=computeTrackExportBounds(scene);
  if (!bounds) throw new Error('Track export bounds unavailable');
  const geometry=makeExportGeometry(bounds,options);
  const mapping=buildTrackMapping(scene,kind,bounds,geometry);
  const canvas=drawDeterministicMap(scene,kind,geometry,mapping);
  await deliverFiles(scene,canvas,mapping,kind);
  return {mapping,width:geometry.width,height:geometry.height};
}
