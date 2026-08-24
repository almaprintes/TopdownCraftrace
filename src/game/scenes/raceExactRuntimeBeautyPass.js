// Runtime-only visual beauty pass for Karting Tenerife.
// IMPORTANT: this module consumes track.geom.left/right ONLY as the exact asphalt mask.
// It never redraws circuit borders and never changes geometry, surfaces, physics,
// AI, checkpoints or timing. Border/kerb rendering remains owned by the proven base scene.

import { ensureAsphaltPBRPipeline } from '../render/AsphaltPBRPipeline.js';

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

function hash01(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
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

function addGrassVariation(scene, worldW, worldH, objects) {
  if (!scene.textures?.exists?.('grass')) return null;

  // Broad second sample only: enriches vegetation tone without adding fine shimmer.
  const grassMacro = scene.add.tileSprite(0, 0, worldW, worldH, 'grass')
    .setOrigin(0, 0)
    .setDepth(8.7)
    .setScrollFactor(1)
    .setAlpha(0.18)
    .setTint(0xb8c6aa)
    .setBlendMode(2);
  grassMacro.tileScaleX = 2.35;
  grassMacro.tileScaleY = 2.35;
  grassMacro.tilePositionX = 711;
  grassMacro.tilePositionY = 383;
  scene.uiCam?.ignore?.(grassMacro);
  objects.push(grassMacro);
  return grassMacro;
}

function addIrregularShoulder(scene, left, right, objects) {
  const count = Math.min(left.length, right.length);
  if (count < 5) return null;

  const g = scene.add.graphics().setDepth(10.22).setScrollFactor(1);
  scene.uiCam?.ignore?.(g);

  let marks = 0;
  const dirtPalette = [0x5b4634, 0x6c5138, 0x806346, 0x46382f];
  const dryGrassPalette = [0x8f7a46, 0xa18b51, 0x71613b];

  // Independent marks only. No offset polyline => no twisted border artefact can return.
  for (let i = 2; i < count - 2; i += 2) {
    const l = xy(left[i]);
    const r = xy(right[i]);
    const lm = xy(left[i - 2]);
    const lp = xy(left[i + 2]);
    const rm = xy(right[i - 2]);
    const rp = xy(right[i + 2]);
    if (![l, r, lm, lp, rm, rp].every(finitePoint)) continue;

    const center = { x: (l.x + r.x) * 0.5, y: (l.y + r.y) * 0.5 };
    const sides = [
      { edge: l, prev: lm, next: lp, seed: i * 2 + 1 },
      { edge: r, prev: rm, next: rp, seed: i * 2 + 2 }
    ];

    for (const side of sides) {
      let ox = side.edge.x - center.x;
      let oy = side.edge.y - center.y;
      const olen = Math.hypot(ox, oy);
      if (olen < 1) continue;
      ox /= olen;
      oy /= olen;

      let tx = side.next.x - side.prev.x;
      let ty = side.next.y - side.prev.y;
      const tlen = Math.hypot(tx, ty);
      if (tlen < 2) continue;
      tx /= tlen;
      ty /= tlen;

      if (hash01(side.seed * 17.31) < 0.18) continue; // natural clean gaps.

      const dirtCount = 3 + Math.floor(hash01(side.seed * 9.7) * 5);
      for (let k = 0; k < dirtCount; k++) {
        const s = side.seed * 101 + k * 13;
        const out = 3 + hash01(s + 1) * 18;
        const along = (hash01(s + 2) - 0.5) * 28;
        const x = side.edge.x + ox * out + tx * along;
        const y = side.edge.y + oy * out + ty * along;
        const c = dirtPalette[Math.floor(hash01(s + 3) * dirtPalette.length) % dirtPalette.length];
        const alpha = 0.11 + hash01(s + 4) * 0.15;
        const radius = 0.8 + hash01(s + 5) * 2.4;
        g.fillStyle(c, alpha);
        g.fillEllipse(x, y, radius * 2.4, radius * (0.65 + hash01(s + 6) * 0.9));
        marks++;
      }

      const grassCount = 2 + Math.floor(hash01(side.seed * 5.3) * 4);
      for (let k = 0; k < grassCount; k++) {
        const s = side.seed * 151 + k * 19;
        const out = 14 + hash01(s + 1) * 26;
        const along = (hash01(s + 2) - 0.5) * 32;
        const x = side.edge.x + ox * out + tx * along;
        const y = side.edge.y + oy * out + ty * along;
        const angle = Math.atan2(ty, tx) + (hash01(s + 3) - 0.5) * 2.5;
        const len = 1.8 + hash01(s + 4) * 5.0;
        const c = dryGrassPalette[Math.floor(hash01(s + 5) * dryGrassPalette.length) % dryGrassPalette.length];
        g.lineStyle(0.7 + hash01(s + 6) * 0.8, c, 0.10 + hash01(s + 7) * 0.12);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        g.strokePath();
        marks++;
      }
    }
  }

  objects.push(g);
  return { gfx: g, marks };
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

  const grassMacro = addGrassVariation(scene, worldW, worldH, objects);
  const shoulder = addIrregularShoulder(scene, left, right, objects);

  const asphalt = scene.add.tileSprite(0, 0, worldW, worldH, 'asphalt')
    .setOrigin(0, 0)
    .setDepth(10.35)
    .setScrollFactor(1)
    .setMask(bundle.mask);
  asphalt.tileScaleX = 0.50;
  asphalt.tileScaleY = 0.50;
  asphalt.tilePositionX = 173;
  asphalt.tilePositionY = 91;

  let shaderActive = false;
  try {
    const pipeline = ensureAsphaltPBRPipeline(scene);
    if (pipeline) {
      asphalt.setPipeline('TDRAsphaltPBR');
      shaderActive = true;
    }
  } catch (err) {
    console.warn('[TDR2] asphalt PBR pipeline unavailable; using clean albedo fallback', err);
  }

  scene.uiCam?.ignore?.(asphalt);
  objects.push(asphalt);
  masked.push(asphalt);

  // Stable border/kerb renderer remains untouched. Dirt lives outside the exact edge.
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
    materialRevision: 'craftpbr-v6-environment-edge',
    shaderActive,
    shaderInputs: shaderActive ? ['albedo', 'normal', 'roughness', 'height'] : ['albedo'],
    grassMacro: !!grassMacro,
    shoulderMarks: Number(shoulder?.marks || 0)
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
