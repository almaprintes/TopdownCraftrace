// Runtime-only visual beauty pass for Karting Tenerife.
// IMPORTANT: this module consumes track.geom.left/right only as a render mask.
// It never changes track geometry, surfaces, physics, AI, checkpoints or timing.

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

function seeded(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildExactRoadMask(scene) {
  const left = scene.track?.geom?.left;
  const right = scene.track?.geom?.right;
  const count = Math.min(left?.length || 0, right?.length || 0);
  if (count < 3) return null;

  const gfx = scene.add.graphics().setDepth(-10000).setScrollFactor(1);
  gfx.fillStyle(0xffffff, 1);
  let quads = 0;

  // EXACTLY the same ribbon validated in solid red: no grow, offset or smoothing.
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

function strokePolyline(gfx, points, close = true) {
  const pts = (points || []).map(xy).filter(finitePoint);
  if (pts.length < 2) return;
  gfx.strokePoints(pts, close, false);
}

function addEdgeDirt(scene, left, right) {
  // These strokes sit below the asphalt. Their inner half is covered by the exact
  // road mask, so only the exterior verge remains visible without widening asphalt.
  const dirt = scene.add.graphics().setDepth(10.18).setScrollFactor(1);
  dirt.lineStyle(16, 0x6d604f, 0.40);
  strokePolyline(dirt, left);
  strokePolyline(dirt, right);
  dirt.lineStyle(7, 0x8b7a62, 0.34);
  strokePolyline(dirt, left);
  strokePolyline(dirt, right);
  dirt.lineStyle(2, 0x3f3a32, 0.24);
  strokePolyline(dirt, left);
  strokePolyline(dirt, right);
  scene.uiCam?.ignore?.(dirt);
  return dirt;
}

function addRoadDetails(scene, mask, worldW, worldH) {
  const detail = scene.add.graphics().setDepth(10.48).setScrollFactor(1).setMask(mask);
  const rng = seeded(240824);

  // Large tonal repairs / weathering, intentionally subtle and world-aligned.
  for (let i = 0; i < 150; i++) {
    const x = rng() * worldW;
    const y = rng() * worldH;
    const w = 18 + rng() * 92;
    const h = 5 + rng() * 24;
    const light = rng() > 0.55;
    detail.fillStyle(light ? 0x737477 : 0x17191a, 0.025 + rng() * 0.045);
    detail.fillEllipse(x, y, w, h);
  }

  // Fine aggregate variation. Low alpha prevents a procedural/confetti look.
  for (let i = 0; i < 520; i++) {
    const x = rng() * worldW;
    const y = rng() * worldH;
    const r = 0.6 + rng() * 1.7;
    detail.fillStyle(rng() > 0.5 ? 0xd1d1cd : 0x080909, 0.025 + rng() * 0.035);
    detail.fillCircle(x, y, r);
  }

  scene.uiCam?.ignore?.(detail);
  return detail;
}

function addRubber(scene, mask) {
  const center = scene.track?.geom?.center;
  if (!Array.isArray(center) || center.length < 3) return null;
  const rubber = scene.add.graphics().setDepth(10.53).setScrollFactor(1).setMask(mask);
  rubber.lineStyle(22, 0x0b0c0d, 0.045);
  strokePolyline(rubber, center);
  rubber.lineStyle(10, 0x050606, 0.055);
  strokePolyline(rubber, center);
  scene.uiCam?.ignore?.(rubber);
  return rubber;
}

function addIntegratedWhiteEdges(scene, mask, left, right) {
  // Stroke is centered on the validated boundary but clipped by the exact road mask,
  // therefore only its inner half is visible: the visual asphalt edge never expands.
  const line = scene.add.graphics().setDepth(10.72).setScrollFactor(1).setMask(mask);
  line.lineStyle(3.2, 0xf0eee7, 0.82);
  strokePolyline(line, left);
  strokePolyline(line, right);
  line.lineStyle(1.0, 0xffffff, 0.45);
  strokePolyline(line, left);
  strokePolyline(line, right);
  scene.uiCam?.ignore?.(line);
  return line;
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

  const grass = scene.textures.exists('grass')
    ? scene.add.tileSprite(0, 0, worldW, worldH, 'grass').setOrigin(0, 0).setDepth(9.72).setScrollFactor(1).setAlpha(0.18)
    : null;
  if (grass) {
    grass.tileScaleX = 0.72;
    grass.tileScaleY = 0.72;
    grass.tilePositionX = 137;
    grass.tilePositionY = 83;
    scene.uiCam?.ignore?.(grass);
    objects.push(grass);
  }

  objects.push(addEdgeDirt(scene, left, right));

  const asphalt = scene.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
    .setOrigin(0, 0)
    .setDepth(10.35)
    .setScrollFactor(1)
    .setMask(bundle.mask);
  asphalt.tilePositionX = 0;
  asphalt.tilePositionY = 0;
  scene.uiCam?.ignore?.(asphalt);
  objects.push(asphalt);
  masked.push(asphalt);

  // A second differently scaled sample of the same real material breaks tiling
  // repetition and gives the road a denser, photographic grain without new assets.
  const micro = scene.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
    .setOrigin(0, 0)
    .setDepth(10.41)
    .setScrollFactor(1)
    .setAlpha(0.17)
    .setMask(bundle.mask);
  micro.tileScaleX = 0.46;
  micro.tileScaleY = 0.46;
  micro.tilePositionX = 191;
  micro.tilePositionY = 317;
  scene.uiCam?.ignore?.(micro);
  objects.push(micro);
  masked.push(micro);

  if (scene.textures.exists('asphaltOverlay')) {
    const overlay = scene.add.tileSprite(0, 0, worldW, worldH, 'asphaltOverlay')
      .setOrigin(0, 0)
      .setDepth(10.44)
      .setScrollFactor(1)
      .setAlpha(0.12)
      .setMask(bundle.mask);
    overlay.tilePositionX = 73;
    overlay.tilePositionY = 119;
    scene.uiCam?.ignore?.(overlay);
    objects.push(overlay);
    masked.push(overlay);
  }

  const roadDetails = addRoadDetails(scene, bundle.mask, worldW, worldH);
  objects.push(roadDetails);
  masked.push(roadDetails);

  const rubber = addRubber(scene, bundle.mask);
  if (rubber) {
    objects.push(rubber);
    masked.push(rubber);
  }

  const whiteEdges = addIntegratedWhiteEdges(scene, bundle.mask, left, right);
  objects.push(whiteEdges);
  masked.push(whiteEdges);

  scene._exactRuntimeBeautyPass = { objects, masked, mask: bundle.mask, gfx: bundle.gfx };
  scene.events.once('shutdown', () => {
    const pass = scene._exactRuntimeBeautyPass;
    if (!pass) return;
    for (const obj of pass.masked || []) {
      try { obj?.clearMask?.(false); } catch {}
    }
    for (const obj of pass.objects || []) {
      try { obj?.destroy?.(); } catch {}
    }
    try { pass.mask?.destroy?.(); } catch {}
    try { pass.gfx?.destroy?.(); } catch {}
    scene._exactRuntimeBeautyPass = null;
  });

  console.info('[TDR2] exact runtime beauty pass active', {
    track: 'karting-tenerife',
    samples: bundle.count,
    quads: bundle.quads,
    exactRoadMask: true,
    geometryExpanded: false
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
