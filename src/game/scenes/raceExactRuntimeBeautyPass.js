// Runtime-only visual beauty pass for Karting Tenerife.
// IMPORTANT: this module consumes track.geom.left/right ONLY as the exact asphalt mask.
// It never redraws the circuit borders and never changes geometry, surfaces, physics,
// AI, checkpoints or timing. Border/kerb rendering remains owned by the proven base scene.

function trackId(scene, data) {
  const direct = data?.trackKey || scene?.trackKey || scene?.track?.meta?.id;
  if (direct) return String(direct).trim().toLowerCase();
  try { return String(localStorage.getItem('tdr2:trackKey') || '').trim().toLowerCase(); } catch { return ''; }
}

function xy(pt) {
  return Array.isArray(pt)
    ? { x: Number(pt[0]), y: Number(pt[1]) }
    : { x: Number(pt?.x), y: Number(pt?.y) };
}

function finitePoint(pt) {
  return Number.isFinite(pt?.x) && Number.isFinite(pt?.y);
}

function buildExactRoadMask(scene) {
  const left = scene.track?.geom?.left;
  const right = scene.track?.geom?.right;
  const count = Math.min(left?.length || 0, right?.length || 0);
  if (count < 3) return null;

  const gfx = scene.add.graphics().setDepth(-10000).setScrollFactor(1);
  gfx.fillStyle(0xffffff, 1);
  let quads = 0;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const l0 = xy(left[i]);
    const r0 = xy(right[i]);
    const r1 = xy(right[j]);
    const l1 = xy(left[j]);
    if (![l0, r0, r1, l1].every(finitePoint)) continue;
    gfx.fillPoints([l0, r0, r1, l1], true);
    quads++;
  }
  if (!quads) {
    gfx.destroy();
    return null;
  }
  const mask = gfx.createGeometryMask();
  gfx.setVisible(false);
  return { gfx, mask, quads, count };
}

function addMapLayer(scene, {
  key, worldW, worldH, mask, depth, alpha, scale, posX, posY,
  blendMode = 0, tint = 0xffffff
}) {
  if (!scene.textures.exists(key)) return null;
  const layer = scene.add.tileSprite(0, 0, worldW, worldH, key)
    .setOrigin(0, 0)
    .setDepth(depth)
    .setScrollFactor(1)
    .setAlpha(alpha)
    .setTint(tint)
    .setBlendMode(blendMode)
    .setMask(mask);
  layer.tileScaleX = scale;
  layer.tileScaleY = scale;
  layer.tilePositionX = posX;
  layer.tilePositionY = posY;
  scene.uiCam?.ignore?.(layer);
  return layer;
}

function installPass(scene, data) {
  if (trackId(scene, data) !== 'karting-tenerife') return;
  if (!scene.textures?.exists?.('asphalt')) return;

  const left = scene.track?.geom?.left;
  const right = scene.track?.geom?.right;
  if (!Array.isArray(left) || !Array.isArray(right)) return;

  const worldW = Math.max(1, Math.ceil(Number(scene.track?.meta?.worldW || scene.physics?.world?.bounds?.width || 0)));
  const worldH = Math.max(1, Math.ceil(Number(scene.track?.meta?.worldH || scene.physics?.world?.bounds?.height || 0)));
  const bundle = buildExactRoadMask(scene);
  if (!bundle || !worldW || !worldH) return;

  const objects = [];
  const masked = [];
  const keep = (obj) => { if (obj) { objects.push(obj); masked.push(obj); } };

  // Photographic base. Slightly finer than v1 so the visible aggregate reads as asphalt,
  // not coarse gravel, at the gameplay camera distance.
  keep(addMapLayer(scene, {
    key: 'asphalt', worldW, worldH, mask: bundle.mask,
    depth: 10.35, alpha: 1, scale: 0.48, posX: 173, posY: 91
  }));

  // Fine crevice depth from the real AO map.
  keep(addMapLayer(scene, {
    key: 'asphaltAO', worldW, worldH, mask: bundle.mask,
    depth: 10.36, alpha: 0.16, scale: 0.48, posX: 173, posY: 91,
    blendMode: 2, tint: 0xe0e0e0
  }));

  // IMPORTANT: v2 was too subtle on an iPhone screen. These macro passes are now
  // deliberately strong enough to be visible: broad rough/dark zones and softer worn
  // zones come from the actual CraftPBR maps, not procedural stripes or fake decals.
  keep(addMapLayer(scene, {
    key: 'asphaltRoughness', worldW, worldH, mask: bundle.mask,
    depth: 10.37, alpha: 0.34, scale: 3.25, posX: 431, posY: 257,
    blendMode: 2, tint: 0xb8b8b8
  }));

  keep(addMapLayer(scene, {
    key: 'asphaltHeight', worldW, worldH, mask: bundle.mask,
    depth: 10.38, alpha: 0.14, scale: 4.9, posX: 911, posY: 613,
    blendMode: 3, tint: 0xb0b0b0
  }));

  keep(addMapLayer(scene, {
    key: 'asphaltAO', worldW, worldH, mask: bundle.mask,
    depth: 10.39, alpha: 0.22, scale: 5.6, posX: 1229, posY: 347,
    blendMode: 2, tint: 0xc4c4c4
  }));

  // A second roughness frequency breaks large repeated islands and gives the surface a
  // more weathered, patched tonal rhythm without drawing any explicit repair shapes.
  keep(addMapLayer(scene, {
    key: 'asphaltRoughness', worldW, worldH, mask: bundle.mask,
    depth: 10.40, alpha: 0.18, scale: 7.8, posX: 2027, posY: 1103,
    blendMode: 2, tint: 0xd0d0d0
  }));

  // Normal stays reserved for a real lighting shader; compositing it as color would tint
  // the road purple. Metalness is black by design and has no visible 2D contribution.
  // No custom edge, dirt stroke, rubber stripe or procedural repair marks are added.

  scene._exactRuntimeBeautyPass = { objects, masked, mask: bundle.mask, gfx: bundle.gfx };
  scene.events.once('shutdown', () => {
    const pass = scene._exactRuntimeBeautyPass;
    if (!pass) return;
    for (const obj of pass.masked || []) { try { obj?.clearMask?.(false); } catch {} }
    for (const obj of pass.objects || []) { try { obj?.destroy?.(); } catch {} }
    try { pass.mask?.destroy?.(); } catch {}
    try { pass.gfx?.destroy?.(); } catch {}
    scene._exactRuntimeBeautyPass = null;
  });

  console.info('[TDR2] exact runtime CraftPBR asphalt active', {
    track: 'karting-tenerife',
    samples: bundle.count,
    quads: bundle.quads,
    exactRoadMask: true,
    geometryExpanded: false,
    bordersRedrawn: false,
    materialRevision: 'craftpbr-v3-visible-wear',
    visiblePasses: ['albedo', 'ao-fine', 'roughness-macro-1', 'height-macro', 'ao-macro', 'roughness-macro-2']
  });
}

export function installExactRuntimeBeautyPass(RaceSceneClass) {
  const proto = RaceSceneClass?.prototype;
  if (!proto || proto.__tdrExactRuntimeBeautyInstalled) return;
  const originalCreate = proto.create;
  proto.create = function patchedExactRuntimeBeautyCreate(data) {
    const result = originalCreate?.call(this, data);
    try { installPass(this, data); }
    catch (err) { console.warn('[TDR2] exact runtime beauty pass failed; keeping base render', err); }
    return result;
  };
  proto.__tdrExactRuntimeBeautyInstalled = true;
}
