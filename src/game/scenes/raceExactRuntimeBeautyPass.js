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
  // Quads are safe here because they define a filled mask; we deliberately do NOT
  // connect left/right arrays as continuous strokes (that was the source of twists).
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

function addRoadDetails(scene, mask, worldW, worldH) {
  const detail = scene.add.graphics().setDepth(10.48).setScrollFactor(1).setMask(mask);
  const rng = seeded(240824);

  // Repair patches: larger and darker than the first pass so they are visible on mobile.
  for (let i = 0; i < 115; i++) {
    const x = rng() * worldW;
    const y = rng() * worldH;
    const w = 24 + rng() * 125;
    const h = 7 + rng() * 32;
    const light = rng() > 0.7;
    detail.fillStyle(light ? 0x77736d : 0x111313, 0.045 + rng() * 0.055);
    detail.fillEllipse(x, y, w, h);
  }

  // Fine aggregate: enough contrast to survive the game's camera scale.
  for (let i = 0; i < 720; i++) {
    const x = rng() * worldW;
    const y = rng() * worldH;
    const r = 0.7 + rng() * 1.8;
    detail.fillStyle(rng() > 0.52 ? 0xc6c0b4 : 0x090a0a, 0.04 + rng() * 0.05);
    detail.fillCircle(x, y, r);
  }

  scene.uiCam?.ignore?.(detail);
  return detail;
}

function addRubber(scene, mask) {
  const center = scene.track?.geom?.center;
  if (!Array.isArray(center) || center.length < 3) return null;
  const rubber = scene.add.graphics().setDepth(10.53).setScrollFactor(1).setMask(mask);
  rubber.lineStyle(28, 0x070808, 0.075);
  strokePolyline(rubber, center);
  rubber.lineStyle(13, 0x020303, 0.095);
  strokePolyline(rubber, center);
  scene.uiCam?.ignore?.(rubber);
  return rubber;
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

  // Main high-detail asphalt material.
  const asphalt = scene.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
    .setOrigin(0, 0)
    .setDepth(10.35)
    .setScrollFactor(1)
    .setMask(bundle.mask);
  asphalt.tileScaleX = 0.86;
  asphalt.tileScaleY = 0.86;
  asphalt.tilePositionX = 0;
  asphalt.tilePositionY = 0;
  scene.uiCam?.ignore?.(asphalt);
  objects.push(asphalt);
  masked.push(asphalt);

  // Second scale breaks repetition and adds micro aggregate.
  const micro = scene.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
    .setOrigin(0, 0)
    .setDepth(10.41)
    .setScrollFactor(1)
    .setAlpha(0.26)
    .setMask(bundle.mask);
  micro.tileScaleX = 0.38;
  micro.tileScaleY = 0.38;
  micro.tilePositionX = 191;
  micro.tilePositionY = 317;
  scene.uiCam?.ignore?.(micro);
  objects.push(micro);
  masked.push(micro);

  // Dedicated overlay: weathering, longitudinal grime and small cracking.
  if (scene.textures.exists('asphaltOverlay')) {
    const overlay = scene.add.tileSprite(0, 0, worldW, worldH, 'asphaltOverlay')
      .setOrigin(0, 0)
      .setDepth(10.44)
      .setScrollFactor(1)
      .setAlpha(0.42)
      .setMask(bundle.mask);
    overlay.tileScaleX = 0.82;
    overlay.tileScaleY = 0.82;
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

  // Deliberately NO custom white edge and NO edge-dirt stroke here.
  // The existing RaceWorldAlignedMaterialsScene border/kerb renderer is left intact.

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
    geometryExpanded: false,
    bordersRedrawn: false,
    materialRevision: 'realism-v2'
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
