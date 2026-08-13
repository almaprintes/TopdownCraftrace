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

export function computeTrackExportBounds(scene) {
  const fallbackW = Number(scene.track?.meta?.trackWidth || 160);
  const raw = scene.track?.geom?.center || scene.track?.meta?.centerline || [];
  const pts = raw.map((p) => pointOf(p, fallbackW))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (!pts.length) {
    const b = scene.physics?.world?.bounds;
    if (!b?.width || !b?.height) return null;
    return {
      x:Number(b.x || 0), y:Number(b.y || 0),
      width:Number(b.width), height:Number(b.height),
      padWorld:0
    };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let maxHalf = fallbackW * 0.5;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    maxHalf = Math.max(maxHalf, Number(p.width || fallbackW) * 0.5);
  }

  // Crop overscan only. Geometry and world coordinates remain untouched.
  const padWorld = Math.max(260, maxHalf + 190);
  return {
    x:minX - padWorld,
    y:minY - padWorld,
    width:Math.max(1, (maxX - minX) + padWorld * 2),
    height:Math.max(1, (maxY - minY) + padWorld * 2),
    padWorld
  };
}

function getMaxTextureSize(scene) {
  try {
    const gl = scene.game?.renderer?.gl;
    if (gl?.getParameter) return Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096);
  } catch (_) {}
  return 4096;
}

function makeExportGeometry(scene, bounds, options = {}) {
  const maxTexture = Math.max(2048, getMaxTextureSize(scene));
  const requestedLongSide = Number(options.longSide || 4096);
  const longSide = Math.floor(clamp(requestedLongSide, 2048, Math.min(4096, maxTexture)));
  const paddingPx = Math.max(64, Math.round(Number(options.paddingPx || 128)));

  const scaleByLongSide = longSide / Math.max(bounds.width, bounds.height);
  const scale = Math.max(0.01, scaleByLongSide);
  let width = Math.ceil(bounds.width * scale + paddingPx * 2);
  let height = Math.ceil(bounds.height * scale + paddingPx * 2);

  const fit = Math.min(1, 4096 / width, 4096 / height);
  const finalScale = scale * fit;
  width = Math.max(2, Math.ceil(bounds.width * finalScale + paddingPx * 2));
  height = Math.max(2, Math.ceil(bounds.height * finalScale + paddingPx * 2));

  if (width % 2) width += 1;
  if (height % 2) height += 1;

  return { width, height, paddingPx, scale:finalScale };
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
    version:2,
    type:'topdown-race-world-map',
    trackId,
    trackName,
    variant:kind === 'technical' ? 'technical' : 'world',
    generatedAt:new Date().toISOString(),
    image:{ width, height, paddingPx },
    worldBounds:{
      x:bounds.x, y:bounds.y,
      width:bounds.width, height:bounds.height,
      minX:bounds.x, minY:bounds.y,
      maxX:bounds.x + bounds.width,
      maxY:bounds.y + bounds.height,
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
    renderer:{ mode:'overlapping-tiles', tileCorePx:960, tileOverlapPx:64 },
    track:{
      nominalWidth:Number(scene.track?.meta?.trackWidth || 0) || null,
      centerline,
      finish:gateToJSON(scene.finishLine || scene.track?.meta?.finishLine || scene.track?.meta?.finish),
      checkpoint1:gateToJSON(scene.checkpoints?.cp1),
      checkpoint2:gateToJSON(scene.checkpoints?.cp2)
    }
  };
}

function sourceToBlob(source) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('2D context unavailable'));
      ctx.drawImage(source, 0, 0);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encode failed')), 'image/png');
    } catch (err) { reject(err); }
  });
}

async function deliverFiles(scene, image, mapping, kind) {
  const base = slug(scene.track?.meta?.name || scene.trackKey || 'circuito');
  const suffix = kind === 'technical' ? 'technical-hd' : 'world-hd';
  const pngName = `${base}-${suffix}.png`;
  const jsonName = `${base}-mapping.json`;
  const pngBlob = await sourceToBlob(image);
  const jsonBlob = new Blob([JSON.stringify(mapping, null, 2)], { type:'application/json' });

  try {
    if (navigator?.share && typeof File !== 'undefined') {
      const files = [
        new File([pngBlob], pngName, { type:'image/png' }),
        new File([jsonBlob], jsonName, { type:'application/json' })
      ];
      if (!navigator.canShare || navigator.canShare({ files })) {
        await navigator.share({ files, title:`Mapa ${mapping.trackName}` });
        return;
      }
    }
  } catch (_) {}

  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  download(pngBlob, pngName);
  window.setTimeout(() => download(jsonBlob, jsonName), 220);
}

function snapshotRenderTexture(rt) {
  return new Promise((resolve, reject) => {
    try {
      rt.snapshot((image) => {
        if (!image) return reject(new Error('Tile snapshot failed'));
        resolve(image);
      }, 'image/png', 1);
    } catch (err) { reject(err); }
  });
}

async function renderSceneInTiles(scene, geometry, mapping, options = {}) {
  const out = document.createElement('canvas');
  out.width = geometry.width;
  out.height = geometry.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Output canvas unavailable');

  const core = Math.max(512, Math.round(Number(options.tileCorePx || 960)));
  const overlap = Math.max(24, Math.round(Number(options.tileOverlapPx || 64)));
  const worldOrigin = mapping.transform.worldOriginAtImagePixel00;

  scene.children?.depthSort?.();

  for (let y = 0; y < geometry.height; y += core) {
    for (let x = 0; x < geometry.width; x += core) {
      const coreW = Math.min(core, geometry.width - x);
      const coreH = Math.min(core, geometry.height - y);
      const sx0 = Math.max(0, x - overlap);
      const sy0 = Math.max(0, y - overlap);
      const sx1 = Math.min(geometry.width, x + coreW + overlap);
      const sy1 = Math.min(geometry.height, y + coreH + overlap);
      const renderW = sx1 - sx0;
      const renderH = sy1 - sy0;

      let rt = null;
      try {
        rt = scene.add.renderTexture(0, 0, renderW, renderH)
          .setOrigin(0, 0)
          .setVisible(false);
        rt.camera.setZoom(geometry.scale);
        rt.camera.setScroll(
          worldOrigin.x + sx0 / geometry.scale,
          worldOrigin.y + sy0 / geometry.scale
        );
        rt.camera.roundPixels = false;
        rt.draw(scene.children);

        const image = await snapshotRenderTexture(rt);
        const cropX = x - sx0;
        const cropY = y - sy0;
        ctx.drawImage(
          image,
          cropX, cropY, coreW, coreH,
          x, y, coreW, coreH
        );
      } finally {
        try { rt?.destroy?.(); } catch (_) {}
      }

      // Yield between tiles so iOS Safari can release temporary GPU resources.
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  return out;
}

export async function exportTrackMapHD(scene, kind = 'world', options = {}) {
  const bounds = computeTrackExportBounds(scene);
  if (!bounds) throw new Error('Track export bounds unavailable');
  const geometry = makeExportGeometry(scene, bounds, options);
  const mapping = buildTrackMapping(scene, kind, bounds, geometry);

  // Render the exact existing Display List in small overlapping camera windows, then stitch
  // only the safe interior of each tile. This avoids the tiny WebGL/Graphics clipping gaps
  // seen when the complete 4096px map is rendered into one giant framebuffer on iPhone.
  const canvas = await renderSceneInTiles(scene, geometry, mapping, options);
  await deliverFiles(scene, canvas, mapping, kind);
  return { mapping, width:geometry.width, height:geometry.height };
}
