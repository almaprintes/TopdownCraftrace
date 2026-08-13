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

  // Safety overscan: the HD map is an exact render of the existing scene, but the crop
  // must extend beyond the centerline envelope far enough to include kerbs, shoulders,
  // scenery and any geometry whose visual bounds protrude past its anchor point.
  // This does NOT alter world coordinates or distances; it only enlarges the captured area.
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

  // Choose one uniform pixels/world-unit scale. This keeps every distance exact in both axes.
  const scaleByLongSide = longSide / Math.max(bounds.width, bounds.height);
  const scale = Math.max(0.01, scaleByLongSide);
  let width = Math.ceil(bounds.width * scale + paddingPx * 2);
  let height = Math.ceil(bounds.height * scale + paddingPx * 2);

  // Keep dimensions inside the GPU limit while preserving the same uniform scale.
  const fit = Math.min(1, maxTexture / width, maxTexture / height, 4096 / width, 4096 / height);
  const finalScale = scale * fit;
  width = Math.max(2, Math.ceil(bounds.width * finalScale + paddingPx * 2));
  height = Math.max(2, Math.ceil(bounds.height * finalScale + paddingPx * 2));

  // Even framebuffer sizes render more reliably in Phaser/WebGL.
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
    version:1,
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
    track:{
      nominalWidth:Number(scene.track?.meta?.trackWidth || 0) || null,
      centerline,
      finish:gateToJSON(scene.finishLine || scene.track?.meta?.finishLine || scene.track?.meta?.finish),
      checkpoint1:gateToJSON(scene.checkpoints?.cp1),
      checkpoint2:gateToJSON(scene.checkpoints?.cp2)
    }
  };
}

function imageToBlob(image) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('2D context unavailable'));
      ctx.drawImage(image, 0, 0);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encode failed')), 'image/png');
    } catch (err) { reject(err); }
  });
}

async function deliverFiles(scene, image, mapping, kind) {
  const base = slug(scene.track?.meta?.name || scene.trackKey || 'circuito');
  const suffix = kind === 'technical' ? 'technical-hd' : 'world-hd';
  const pngName = `${base}-${suffix}.png`;
  const jsonName = `${base}-mapping.json`;
  const pngBlob = await imageToBlob(image);
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

export function exportTrackMapHD(scene, kind = 'world', options = {}) {
  return new Promise((resolve, reject) => {
    const bounds = computeTrackExportBounds(scene);
    if (!bounds) return reject(new Error('Track export bounds unavailable'));
    const geometry = makeExportGeometry(scene, bounds, options);
    const mapping = buildTrackMapping(scene, kind, bounds, geometry);

    let rt = null;
    try {
      scene.children?.depthSort?.();
      rt = scene.add.renderTexture(0, 0, geometry.width, geometry.height)
        .setOrigin(0, 0)
        .setVisible(false);

      // The internal RenderTexture camera renders the *actual scene display list*.
      // No road, kerb, prop or obstacle geometry is reconstructed here.
      rt.camera.setZoom(geometry.scale);
      rt.camera.setScroll(
        bounds.x - geometry.paddingPx / geometry.scale,
        bounds.y - geometry.paddingPx / geometry.scale
      );
      rt.camera.roundPixels = false;

      // DisplayList drawing respects visibility, so the pause layer can hide HUD roots
      // while all world GameObjects retain their exact positions, rotations and scales.
      rt.draw(scene.children);

      rt.snapshot(async (image) => {
        try {
          await deliverFiles(scene, image, mapping, kind);
          resolve({ mapping, width:geometry.width, height:geometry.height });
        } catch (err) {
          reject(err);
        } finally {
          try { rt?.destroy?.(); } catch (_) {}
        }
      }, 'image/png', 1);
    } catch (err) {
      try { rt?.destroy?.(); } catch (_) {}
      reject(err);
    }
  });
}
