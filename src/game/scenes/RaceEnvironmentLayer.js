// src/game/scenes/RaceEnvironmentLayer.js
// Controlled environment proof: exactly 2 trees + 2 shrubs.
// Uses real uploaded WebP files. No legacy rails/huts/boards, no collision,
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

function findVisibleSpot(center, preferredFraction, side, extraOffset, defaultTrackW, clearance) {
  const offsets = [0, 0.035, -0.035, 0.07, -0.07, 0.11, -0.11];
  for (const df of offsets) {
    const fraction = (preferredFraction + df + 1) % 1;
    const p = pointBesideTrack(center, fraction, side, extraOffset, defaultTrackW);
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

function placeCuratedVegetation(scene, center, defaultTrackW) {
  if (Array.isArray(scene._circuitEnvironment)) {
    for (const obj of scene._circuitEnvironment) obj?.destroy?.();
  }

  const placed = [];

  const a = findVisibleSpot(center, 0.18, 1, 108, defaultTrackW, 72);
  if (a) {
    addImage(scene, placed, ASSETS.treeA.key, a.x, a.y, 0.32, -0.20, 7.13);
    const sx = a.x + a.tx * 82 + a.nx * 10;
    const sy = a.y + a.ty * 82 + a.ny * 10;
    if (isClearOfTrack(center, sx, sy, defaultTrackW, 62)) {
      addImage(scene, placed, ASSETS.shrubA.key, sx, sy, 0.27, 0.32, 7.12);
    }
  }

  const b = findVisibleSpot(center, 0.64, -1, 112, defaultTrackW, 74);
  if (b) {
    addImage(scene, placed, ASSETS.treeB.key, b.x, b.y, 0.31, 0.14, 7.13);
    const sx = b.x - b.tx * 78 - b.nx * 10;
    const sy = b.y - b.ty * 78 - b.ny * 10;
    if (isClearOfTrack(center, sx, sy, defaultTrackW, 62)) {
      addImage(scene, placed, ASSETS.shrubB.key, sx, sy, 0.27, -0.26, 7.12);
    }
  }

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
