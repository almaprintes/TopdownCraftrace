// Runtime-only visual beauty pass for Karting Tenerife.
// IMPORTANT: track.geom.left/right are consumed only as the exact road mask / visual guide.
// This module never changes geometry, surfaces, physics, AI, checkpoints or timing.

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

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerpPoint(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
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

  // Independent marks only: never construct an offset edge polyline.
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
      ox /= olen; oy /= olen;

      let tx = side.next.x - side.prev.x;
      let ty = side.next.y - side.prev.y;
      const tlen = Math.hypot(tx, ty);
      if (tlen < 2) continue;
      tx /= tlen; ty /= tlen;

      if (hash01(side.seed * 17.31) < 0.18) continue;

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

function ensureRubberStreakTextures(scene) {
  const keys = ['tdrRubberStreakA', 'tdrRubberStreakB', 'tdrRubberStreakC'];
  if (keys.every((k) => scene.textures.exists(k))) return keys;

  const w = 256;
  const h = 32;
  for (let variant = 0; variant < keys.length; variant++) {
    const key = keys[variant];
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, w, h);

    // One elongated soft streak, not a blob and not a painted lane. Several nearby
    // vehicle paths are built later by stamping this narrow source along coherent arcs.
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.00, 'rgba(8,9,8,0)');
    grad.addColorStop(0.10, 'rgba(8,9,8,0.32)');
    grad.addColorStop(0.50, 'rgba(7,8,7,0.42)');
    grad.addColorStop(0.90, 'rgba(8,9,8,0.30)');
    grad.addColorStop(1.00, 'rgba(8,9,8,0)');

    const rows = 3 + variant;
    for (let band = 0; band < rows; band++) {
      const s = variant * 733 + band * 97;
      const y = h * (0.42 + (band - (rows - 1) * 0.5) * 0.055) + (hash01(s) - 0.5) * 1.4;
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.42 + hash01(s + 1) * 0.24;
      ctx.lineWidth = 0.65 + hash01(s + 2) * 0.75;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.bezierCurveTo(w * 0.33, y + (hash01(s + 3) - 0.5) * 1.5, w * 0.66, y + (hash01(s + 4) - 0.5) * 1.5, w - 4, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    tex.refresh();
  }
  return keys;
}

function buildTrackAnalysis(left, right) {
  const count = Math.min(left.length, right.length);
  const center = new Array(count);
  const halfW = new Array(count).fill(0);
  const turn = new Array(count).fill(0);
  const curve = new Array(count).fill(0);

  for (let i = 0; i < count; i++) {
    const l = xy(left[i]);
    const r = xy(right[i]);
    if (!finitePoint(l) || !finitePoint(r)) continue;
    center[i] = { x: (l.x + r.x) * 0.5, y: (l.y + r.y) * 0.5, l, r };
    halfW[i] = Math.hypot(r.x - l.x, r.y - l.y) * 0.5;
  }

  // Wider stencil than the old version: tyre groove should follow the whole bend,
  // not react to one noisy local node.
  for (let i = 5; i < count - 5; i++) {
    const a = center[i - 5];
    const p = center[i];
    const b = center[i + 5];
    if (![a, p, b].every(Boolean)) continue;
    let ax = p.x - a.x; let ay = p.y - a.y;
    let bx = b.x - p.x; let by = b.y - p.y;
    const al = Math.hypot(ax, ay); const bl = Math.hypot(bx, by);
    if (al < 2 || bl < 2) continue;
    ax /= al; ay /= al; bx /= bl; by /= bl;
    const cross = ax * by - ay * bx;
    const dot = Math.max(-1, Math.min(1, ax * bx + ay * by));
    turn[i] = Math.atan2(cross, dot);
    curve[i] = clamp01(Math.abs(turn[i]) / 0.34);
  }

  // Smooth curvature to identify sustained corner zones rather than isolated samples.
  const smooth = curve.slice();
  for (let pass = 0; pass < 3; pass++) {
    const src = smooth.slice();
    for (let i = 3; i < count - 3; i++) {
      smooth[i] = (src[i - 2] + src[i - 1] * 2 + src[i] * 3 + src[i + 1] * 2 + src[i + 2]) / 9;
    }
  }
  return { count, center, halfW, turn, curve: smooth };
}

function buildGroovePlan(left, right) {
  const a = buildTrackAnalysis(left, right);
  const { count, center, halfW, turn, curve } = a;
  if (count < 24) return [];

  // t is interpolation across exact left/right: 0 left edge, 1 right edge.
  // We create a continuous outside->inside->outside trajectory only around sustained bends.
  const tPath = new Array(count).fill(0.5);
  const activity = new Array(count).fill(0);

  for (let i = 10; i < count - 10; i++) {
    const here = curve[i] || 0;
    let ahead = 0, aheadSign = 0, behind = 0, behindSign = 0;
    for (let k = 3; k <= 12; k++) {
      if ((curve[i + k] || 0) > ahead) { ahead = curve[i + k] || 0; aheadSign = Math.sign(turn[i + k] || 0); }
      if ((curve[i - k] || 0) > behind) { behind = curve[i - k] || 0; behindSign = Math.sign(turn[i - k] || 0); }
    }
    const sign = Math.sign(turn[i] || 0) || aheadSign || behindSign;

    if (here > 0.24) {
      // Main corner body: converge toward inside, as in real rubbered kart hairpins.
      tPath[i] = sign > 0 ? 0.25 : 0.75;
      activity[i] = Math.max(here, 0.45);
    } else if (ahead > 0.32) {
      // Approach is already on outside line, producing the parallel braking streaks seen in reference.
      tPath[i] = aheadSign > 0 ? 0.76 : 0.24;
      activity[i] = ahead * 0.82;
    } else if (behind > 0.34) {
      // Exit opens to outside; fade gradually rather than snapping back to centre.
      tPath[i] = behindSign > 0 ? 0.72 : 0.28;
      activity[i] = behind * 0.62;
    }
  }

  // Smooth lateral movement so the groove becomes a believable arc, not disconnected marks.
  for (let pass = 0; pass < 5; pass++) {
    const src = tPath.slice();
    for (let i = 2; i < count - 2; i++) {
      if ((activity[i] || 0) < 0.10) continue;
      tPath[i] = (src[i - 2] + src[i - 1] * 2 + src[i] * 4 + src[i + 1] * 2 + src[i + 2]) / 10;
    }
  }

  const lanes = [-0.070, -0.035, 0.0, 0.038, 0.075];
  const plan = [];
  for (let lane = 0; lane < lanes.length; lane++) {
    for (let i = 11; i < count - 12; i++) {
      const act = Math.min(activity[i] || 0, activity[i + 1] || 0);
      if (act < 0.24) continue;
      // Natural gaps, but long enough that multiple coherent arcs remain visible.
      if (hash01(i * 17.73 + lane * 113.1) < 0.075) continue;

      const p = center[i];
      const q = center[i + 1];
      if (!p || !q) continue;
      const t0 = Math.max(0.12, Math.min(0.88, tPath[i] + lanes[lane]));
      const t1 = Math.max(0.12, Math.min(0.88, tPath[i + 1] + lanes[lane]));
      const p0 = lerpPoint(p.l, p.r, t0);
      const p1 = lerpPoint(q.l, q.r, t1);
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1.5) continue;

      const width = 3.1 + lane * 0.30 + act * 1.6;
      plan.push({
        x: (p0.x + p1.x) * 0.5,
        y: (p0.y + p1.y) * 0.5,
        angle: Math.atan2(dy, dx),
        length: Math.max(22, dist * 1.75),
        width,
        alpha: 0.22 + act * 0.18 + (lane === 2 ? 0.05 : 0),
        variant: lane % 3,
        activity: act
      });
    }
  }
  return plan;
}

function addBakedRubberGroove(scene, left, right, roadMask, worldW, worldH, objects, masked) {
  const keys = ensureRubberStreakTextures(scene);
  const plan = buildGroovePlan(left, right);
  if (!plan.length) return { tiles: 0, decals: 0 };

  const stamps = [];
  for (const d of plan) {
    const img = scene.add.image(d.x, d.y, keys[d.variant])
      .setOrigin(0.5, 0.5)
      .setRotation(d.angle)
      .setScale(d.length / 256, d.width / 32)
      .setAlpha(d.alpha)
      .setTint(0xc3c3bf)
      .setScrollFactor(1)
      .setDepth(-9999);
    stamps.push(img);
  }

  const tileMax = 2048;
  let tileCount = 0;
  for (let y = 0; y < worldH; y += tileMax) {
    for (let x = 0; x < worldW; x += tileMax) {
      const w = Math.min(tileMax, worldW - x);
      const h = Math.min(tileMax, worldH - y);
      const nearby = stamps.filter((img) => img.x >= x - 180 && img.x <= x + w + 180 && img.y >= y - 180 && img.y <= y + h + 180);
      if (!nearby.length) continue;

      const rt = scene.add.renderTexture(x, y, w, h)
        .setOrigin(0, 0)
        .setDepth(10.37)
        .setScrollFactor(1)
        .setBlendMode(2)
        .setMask(roadMask);
      rt.camera.setZoom(1);
      rt.camera.centerOn(x + w * 0.5, y + h * 0.5);
      rt.camera.roundPixels = false;
      rt.draw(nearby);
      scene.uiCam?.ignore?.(rt);
      objects.push(rt);
      masked.push(rt);
      tileCount++;
    }
  }

  for (const img of stamps) {
    try { img.destroy(); } catch {}
  }
  return { tiles: tileCount, decals: plan.length };
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

  const rubber = addBakedRubberGroove(scene, left, right, bundle.mask, worldW, worldH, objects, masked);

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
    materialRevision: 'craftpbr-v10-coherent-multiline-rubber-groove',
    shaderActive,
    shaderInputs: shaderActive ? ['albedo', 'normal', 'roughness', 'height'] : ['albedo'],
    grassMacro: !!grassMacro,
    shoulderMarks: Number(shoulder?.marks || 0),
    rubberStreakDecals: Number(rubber?.decals || 0),
    rubberBakeTiles: Number(rubber?.tiles || 0)
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