// src/game/scenes/RaceEnvironmentLayer.js
// Controlled environment stress test: curated vegetation only.
// Reuses 4 loaded WebP textures, creates 12 static sprites once, no collision,
// no random scatter and no per-frame updates.

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
  const a = findUsableAnchor(center, spec.fraction, spec.side, spec.extra, defaultTrackW, spec.clearance || 70);
  if (!a) return;

  for (const m of spec.members || []) {
    const x = a.x + a.tx * (m.along || 0) + a.nx * (m.out || 0) * spec.side;
    const y = a.y + a.ty * (m.along || 0) + a.ny * (m.out || 0) * spec.side;
    if (!isClearOfTrack(center, x, y, defaultTrackW, m.clearance || 52)) continue;
    addImage(scene, placed, ASSETS[m.asset].key, x, y, m.scale, m.rotation || 0, m.depth || 7.13);
  }
}

function placeCuratedVegetation(scene, center, defaultTrackW) {
  if (Array.isArray(scene._circuitEnvironment)) {
    for (const obj of scene._circuitEnvironment) obj?.destroy?.();
  }

  const placed = [];
  const clusters = [
    {
      fraction: 0.10, side: 1, extra: 92,
      members: [
        { asset: 'treeA', along: -34, out: 3, scale: 0.31, rotation: -0.16, clearance: 64 },
        { asset: 'shrubB', along: 52, out: -2, scale: 0.25, rotation: 0.28, clearance: 50 },
        { asset: 'shrubA', along: 92, out: 16, scale: 0.22, rotation: -0.34, clearance: 48 }
      ]
    },
    {
      fraction: 0.31, side: -1, extra: 98,
      members: [
        { asset: 'treeB', along: 0, out: 0, scale: 0.30, rotation: 0.10, clearance: 66 },
        { asset: 'shrubA', along: -66, out: 10, scale: 0.24, rotation: 0.18, clearance: 50 },
        { asset: 'shrubB', along: 70, out: 4, scale: 0.24, rotation: -0.22, clearance: 50 }
      ]
    },
    {
      fraction: 0.57, side: 1, extra: 96,
      members: [
        { asset: 'treeA', along: 24, out: 4, scale: 0.29, rotation: 0.12, clearance: 64 },
        { asset: 'treeB', along: -72, out: 18, scale: 0.27, rotation: -0.14, clearance: 62 },
        { asset: 'shrubB', along: 92, out: -2, scale: 0.23, rotation: 0.30, clearance: 48 }
      ]
    },
    {
      fraction: 0.79, side: -1, extra: 94,
      members: [
        { asset: 'treeB', along: -16, out: 0, scale: 0.30, rotation: 0.18, clearance: 66 },
        { asset: 'shrubA', along: 62, out: 10, scale: 0.24, rotation: -0.30, clearance: 50 },
        { asset: 'shrubB', along: 104, out: 18, scale: 0.22, rotation: 0.12, clearance: 48 }
      ]
    }
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

  scene.load.once('complete', () => {
    placeCuratedVegetation(scene, center, defaultTrackW);
  });
  if (!scene.load.isLoading()) scene.load.start();
  return [];
}
