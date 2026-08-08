// src/game/scenes/RaceEnvironmentLayer.js
// Controlled forest stress test: 28 curated static vegetation sprites max.
// Reuses only 4 WebP textures, no collision, no random scatter, no per-frame work.

const BASE = import.meta.env.BASE_URL || '/';

const ASSETS = {
  treeA: { key: 'env-tree-deciduous-01', url: `${BASE}assets/environment/tree_deciduous_01.webp` },
  treeB: { key: 'env-tree-conifer-01', url: `${BASE}assets/environment/tree_conifer_01.webp` },
  shrubA: { key: 'env-shrub-round-01', url: `${BASE}assets/environment/shrub_round_01.webp` },
  shrubB: { key: 'env-shrub-flowers-01', url: `${BASE}assets/environment/shrub_flowers_01.webp` }
};

function tangentAt(center, i) {
  const n = center.length;
  const a = center[(i - 3 + n) % n];
  const b = center[(i + 3) % n];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  return { tx: dx / d, ty: dy / d, nx: -dy / d, ny: dx / d };
}

function isClearOfTrack(center, x, y, defaultTrackW, clearance) {
  const n = center.length;
  const stride = Math.max(1, Math.floor(n / 220));
  for (let i = 0; i < n; i += stride) {
    const p = center[i];
    const half = Number(p.width || defaultTrackW) * 0.5;
    if (Math.hypot(x - p.x, y - p.y) < half + clearance) return false;
  }
  return true;
}

function pointBesideTrack(center, fraction, side, extraOffset, defaultTrackW) {
  const n = center.length;
  const i = Math.floor(n * fraction) % n;
  const p = center[i];
  const { tx, ty, nx, ny } = tangentAt(center, i);
  const half = Number(p.width || defaultTrackW) * 0.5;
  const offset = half + extraOffset;
  return { i, x: p.x + nx * side * offset, y: p.y + ny * side * offset, tx, ty, nx, ny };
}

function findUsableAnchor(center, fraction, side, extraOffset, defaultTrackW, clearance) {
  const probes = [0, 0.012, -0.012, 0.024, -0.024, 0.038, -0.038, 0.055, -0.055];
  for (const df of probes) {
    const f = (fraction + df + 1) % 1;
    const p = pointBesideTrack(center, f, side, extraOffset, defaultTrackW);
    if (isClearOfTrack(center, p.x, p.y, defaultTrackW, clearance)) return p;
  }
  return null;
}

function addImage(scene, placed, key, x, y, scale, rotation = 0, depth = 7.15) {
  if (!scene.textures.exists(key)) return null;
  const img = scene.add.image(x, y, key)
    .setScrollFactor(1)
    .setDepth(depth)
    .setScale(scale)
    .setRotation(rotation);
  scene.uiCam?.ignore?.(img);
  placed.push(img);
  return img;
}

function addCluster(scene, placed, center, defaultTrackW, spec) {
  const a = findUsableAnchor(center, spec.fraction, spec.side, spec.extra, defaultTrackW, spec.clearance || 68);
  if (!a) return;
  for (const m of spec.members) {
    const x = a.x + a.tx * m.along + a.nx * m.out * spec.side;
    const y = a.y + a.ty * m.along + a.ny * m.out * spec.side;
    if (!isClearOfTrack(center, x, y, defaultTrackW, m.clearance || 48)) continue;
    addImage(scene, placed, ASSETS[m.asset].key, x, y, m.scale, m.rotation, m.depth || 7.13);
  }
}

function placeCuratedVegetation(scene, center, defaultTrackW) {
  if (Array.isArray(scene._circuitEnvironment)) {
    for (const obj of scene._circuitEnvironment) obj?.destroy?.();
  }

  const placed = [];
  // Five deliberately composed zones. The denser bands sit farther from the asphalt;
  // shrubs soften the edge while trees overlap behind them to read as woodland.
  const clusters = [
    { fraction: 0.08, side: 1, extra: 88, members: [
      {asset:'shrubA',along:-92,out:0,scale:.23,rotation:-.28},{asset:'treeA',along:-48,out:28,scale:.31,rotation:-.12,clearance:58},
      {asset:'treeB',along:6,out:52,scale:.29,rotation:.14,clearance:58},{asset:'treeA',along:62,out:30,scale:.28,rotation:.22,clearance:56},
      {asset:'shrubB',along:106,out:5,scale:.22,rotation:.31},{asset:'shrubA',along:28,out:84,scale:.20,rotation:.08}
    ]},
    { fraction: 0.27, side: -1, extra: 94, members: [
      {asset:'treeB',along:-105,out:36,scale:.28,rotation:-.18,clearance:58},{asset:'shrubB',along:-64,out:2,scale:.22,rotation:.24},
      {asset:'treeA',along:-18,out:58,scale:.32,rotation:.09,clearance:60},{asset:'treeB',along:42,out:32,scale:.30,rotation:.19,clearance:58},
      {asset:'shrubA',along:88,out:4,scale:.23,rotation:-.27},{asset:'treeA',along:105,out:78,scale:.25,rotation:-.11,clearance:54}
    ]},
    { fraction: 0.47, side: 1, extra: 100, members: [
      {asset:'shrubB',along:-90,out:0,scale:.22,rotation:-.22},{asset:'treeA',along:-52,out:38,scale:.29,rotation:.17,clearance:58},
      {asset:'treeB',along:4,out:68,scale:.31,rotation:-.09,clearance:60},{asset:'treeA',along:60,out:40,scale:.27,rotation:.28,clearance:56},
      {asset:'shrubA',along:104,out:4,scale:.22,rotation:.14}
    ]},
    { fraction: 0.66, side: -1, extra: 92, members: [
      {asset:'treeA',along:-102,out:62,scale:.26,rotation:-.16,clearance:56},{asset:'shrubA',along:-72,out:4,scale:.22,rotation:.30},
      {asset:'treeB',along:-28,out:36,scale:.31,rotation:.11,clearance:60},{asset:'treeA',along:30,out:66,scale:.30,rotation:-.24,clearance:58},
      {asset:'treeB',along:82,out:34,scale:.27,rotation:.21,clearance:56},{asset:'shrubB',along:112,out:0,scale:.23,rotation:-.12}
    ]},
    { fraction: 0.84, side: 1, extra: 96, members: [
      {asset:'shrubB',along:-88,out:2,scale:.22,rotation:.16},{asset:'treeB',along:-48,out:42,scale:.29,rotation:-.20,clearance:58},
      {asset:'treeA',along:8,out:72,scale:.32,rotation:.10,clearance:60},{asset:'treeB',along:62,out:38,scale:.28,rotation:.26,clearance:56},
      {asset:'shrubA',along:104,out:5,scale:.22,rotation:-.31}
    ]}
  ];

  for (const cluster of clusters) addCluster(scene, placed, center, defaultTrackW, cluster);
  scene._circuitEnvironment = placed;
  return placed;
}

export function addCircuitEnvironment(scene, center, defaultTrackW = 160) {
  if (!scene || !Array.isArray(center) || center.length < 24) return [];
  const missing = [];
  for (const spec of Object.values(ASSETS)) {
    if (!scene.textures.exists(spec.key)) {
      scene.load.image(spec.key, spec.url);
      missing.push(spec.key);
    }
  }
  if (missing.length === 0) return placeCuratedVegetation(scene, center, defaultTrackW);
  scene.load.once('complete', () => placeCuratedVegetation(scene, center, defaultTrackW));
  if (!scene.load.isLoading()) scene.load.start();
  return [];
}
