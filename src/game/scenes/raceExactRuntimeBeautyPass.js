// Runtime-only visual beauty pass for Karting Tenerife.
// IMPORTANT: this module consumes track.geom only as visual masks.
// It never redraws circuit borders and never changes geometry, surfaces, physics,
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

function buildExactGrassBandMask(scene) {
  const left = scene.track?.geom?.left;
  const right = scene.track?.geom?.right;
  const grassLeft = scene.track?.geom?.grass?.left;
  const grassRight = scene.track?.geom?.grass?.right;
  const count = Math.min(
    left?.length || 0,
    right?.length || 0,
    grassLeft?.length || 0,
    grassRight?.length || 0
  );
  if (count < 3) return null;

  const gfx = scene.add.graphics().setDepth(-10001).setScrollFactor(1);
  gfx.fillStyle(0xffffff, 1);
  let quads = 0;

  // Exact grass ring only: road edge -> outer grass edge on each side.
  // No widening, no smoothing, no offset geometry of our own.
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;

    const l0 = xy(left[i]);
    const l1 = xy(left[j]);
    const gl0 = xy(grassLeft[i]);
    const gl1 = xy(grassLeft[j]);
    if ([l0, l1, gl0, gl1].every(finitePoint)) {
      gfx.fillPoints([l0, gl0, gl1, l1], true);
      quads++;
    }

    const r0 = xy(right[i]);
    const r1 = xy(right[j]);
    const gr0 = xy(grassRight[i]);
    const gr1 = xy(grassRight[j]);
    if ([r0, r1, gr0, gr1].every(finitePoint)) {
      gfx.fillPoints([r0, gr0, gr1, r1], true);
      quads++;
    }
  }

  if (!quads) {
    gfx.destroy();
    return null;
  }

  const mask = gfx.createGeometryMask();
  gfx.setVisible(false);
  return { gfx, mask, quads, count };
}

function installPass(scene, data) {
  if (trackId(scene, data) !== 'karting-tenerife') return;
  if (!scene.textures?.exists?.('asphalt')) return;

  const left = scene.track?.geom?.left;
  const right = scene.track?.geom?.right;
  if (!Array.isArray(left) || !Array.isArray(right)) return;

  const worldW = Math.max(1, Math.ceil(Number(scene.track?.meta?.worldW || scene.physics?.world?.bounds?.width || 0)));
  const worldH = Math.max(1, Math.ceil(Number(scene.track?.meta?.worldH || scene.physics?.world?.bounds?.height || 0)));
  const roadBundle = buildExactRoadMask(scene);
  if (!roadBundle || !worldW || !worldH) return;

  const objects = [];
  const masked = [];
  const masks = [{ mask: roadBundle.mask, gfx: roadBundle.gfx }];

  // Base scene background is now the rocky 4K OFF-ROAD material.
  // Add real grass only inside the authored grass-margin band.
  let grassBundle = null;
  if (scene.textures?.exists?.('grassTrack')) {
    grassBundle = buildExactGrassBandMask(scene);
    if (grassBundle) {
      const grass = scene.add.tileSprite(0, 0, worldW, worldH, 'grassTrack')
        .setOrigin(0, 0)
        .setDepth(9.95)
        .setScrollFactor(1)
        .setMask(grassBundle.mask);
      // Keep grass at a natural world scale; no extra macro layer or procedural marks.
      grass.tileScaleX = 1.0;
      grass.tileScaleY = 1.0;
      grass.tilePositionX = 0;
      grass.tilePositionY = 0;
      scene.uiCam?.ignore?.(grass);
      objects.push(grass);
      masked.push(grass);
      masks.push({ mask: grassBundle.mask, gfx: grassBundle.gfx });
    }
  }

  // Clean photographic asphalt, albedo only.
  const asphalt = scene.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
    .setOrigin(0, 0)
    .setDepth(10.35)
    .setScrollFactor(1)
    .setMask(roadBundle.mask);
  asphalt.tileScaleX = 0.50;
  asphalt.tileScaleY = 0.50;
  asphalt.tilePositionX = 173;
  asphalt.tilePositionY = 91;

  scene.uiCam?.ignore?.(asphalt);
  objects.push(asphalt);
  masked.push(asphalt);

  scene._exactRuntimeBeautyPass = { objects, masked, masks };
  scene.events.once('shutdown', () => {
    const pass = scene._exactRuntimeBeautyPass;
    if (!pass) return;
    for (const obj of pass.masked || []) {
      try { obj?.clearMask?.(false); } catch {}
    }
    for (const obj of pass.objects || []) {
      try { obj?.destroy?.(); } catch {}
    }
    for (const item of pass.masks || []) {
      try { item?.mask?.destroy?.(); } catch {}
      try { item?.gfx?.destroy?.(); } catch {}
    }
    scene._exactRuntimeBeautyPass = null;
  });

  console.info('[TDR2] exact material layers active', {
    track: 'karting-tenerife',
    roadSamples: roadBundle.count,
    roadQuads: roadBundle.quads,
    grassBandQuads: Number(grassBundle?.quads || 0),
    exactRoadMask: true,
    exactGrassBand: !!grassBundle,
    offroadMaterial: 'rocky_terrain_diff_4k',
    grassMaterial: 'grass-real',
    asphaltMaterial: 'clean_asphalt_diff_2k',
    shaderActive: false
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
