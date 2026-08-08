// src/game/scenes/RaceEnvironmentLayer.js
// Authored, top-down environment assets only. No collision, no per-frame updates.

const ASSETS = {
  treeA: 'assets/environment/tree-deciduous.svg',
  treeB: 'assets/environment/tree-conifer.svg',
  rail: 'assets/environment/guardrail.svg',
  hut: 'assets/environment/marshal-hut.svg',
  board: 'assets/environment/sponsor-board.svg'
};

function tangentAt(center, i) {
  const n = center.length;
  const a = center[(i - 3 + n) % n], b = center[(i + 3) % n];
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  return { tx: dx / d, ty: dy / d, nx: -dy / d, ny: dx / d };
}

function turnAt(center, i) {
  const n = center.length;
  const a = center[(i - 5 + n) % n], b = center[i], c = center[(i + 5) % n];
  let ang = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
  return Math.atan2(Math.sin(ang), Math.cos(ang));
}

function placeEnvironment(scene, center, defaultTrackW) {
  const placed = [];
  const n = center.length;
  const rand = scene._rng?.(0x54d92a31) || Math.random;

  const isClear = (x, y, clearance) => {
    const stride = Math.max(1, Math.floor(n / 190));
    for (let i = 0; i < n; i += stride) {
      const p = center[i];
      const half = Number(p.width || defaultTrackW) * 0.5;
      if (Math.hypot(x - p.x, y - p.y) < half + clearance) return false;
    }
    return true;
  };

  const add = (key, x, y, scale, rot = 0, depth = 7.5) => {
    if (!scene.textures.exists(key)) return null;
    const img = scene.add.image(x, y, key).setScrollFactor(1).setDepth(depth).setScale(scale).setRotation(rot);
    scene.uiCam?.ignore?.(img);
    placed.push(img);
    return img;
  };

  // Vegetation masses: deliberately irregular, much farther from tarmac than the old placeholder pass.
  const treeStep = Math.max(30, Math.floor(n / 18));
  for (let i = 0; i < n; i += treeStep) {
    const p = center[i], { tx, ty, nx, ny } = tangentAt(center, i);
    const side = rand() > 0.5 ? 1 : -1;
    const offset = Number(p.width || defaultTrackW) * 0.5 + 180 + rand() * 165;
    const along = (rand() - 0.5) * 90;
    const x = p.x + nx * offset * side + tx * along;
    const y = p.y + ny * offset * side + ty * along;
    if (!isClear(x, y, 105)) continue;
    const s = 0.44 + rand() * 0.22;
    add(rand() > 0.32 ? 'env-tree-a' : 'env-tree-b', x, y, s, rand() * Math.PI * 2, 7.15);
    if (rand() > 0.38) {
      const spread = 55 + rand() * 80;
      const x2 = x + tx * spread + nx * side * (18 + rand() * 34);
      const y2 = y + ty * spread + ny * side * (18 + rand() * 34);
      if (isClear(x2, y2, 95)) add(rand() > 0.45 ? 'env-tree-a' : 'env-tree-b', x2, y2, s * (0.72 + rand() * 0.22), rand() * Math.PI * 2, 7.14);
    }
  }

  // Guardrails only on the outside of significant corners.
  let rails = 0;
  const railStride = Math.max(11, Math.floor(n / 50));
  for (let i = 0; i < n && rails < 10; i += railStride) {
    const turn = turnAt(center, i);
    if (Math.abs(turn) < 0.105) continue;
    const p = center[i], { tx, ty, nx, ny } = tangentAt(center, i);
    const outside = turn > 0 ? -1 : 1;
    const offset = Number(p.width || defaultTrackW) * 0.5 + 76;
    const x = p.x + nx * offset * outside;
    const y = p.y + ny * offset * outside;
    if (!isClear(x, y, 40)) continue;
    add('env-guardrail', x, y, 0.62, Math.atan2(ty, tx), 7.82);
    rails++;
  }

  // Memorable track landmarks. Sparse by design: they orient the driver rather than wallpaper the grass.
  const landmarks = [
    { f: 0.18, key: 'env-hut', side: 1, scale: 0.52 },
    { f: 0.51, key: 'env-board', side: -1, scale: 0.58 },
    { f: 0.78, key: 'env-hut', side: 1, scale: 0.48 }
  ];
  for (const lm of landmarks) {
    const i = Math.floor(n * lm.f) % n;
    const p = center[i], { tx, ty, nx, ny } = tangentAt(center, i);
    const offset = Number(p.width || defaultTrackW) * 0.5 + 132;
    const x = p.x + nx * offset * lm.side;
    const y = p.y + ny * offset * lm.side;
    if (!isClear(x, y, 68)) continue;
    add(lm.key, x, y, lm.scale, Math.atan2(ty, tx), 7.72);
  }

  scene._circuitEnvironment = placed;
  return placed;
}

export function addCircuitEnvironment(scene, center, defaultTrackW = 160) {
  if (!scene || !Array.isArray(center) || center.length < 24) return [];

  const keys = {
    treeA: 'env-tree-a', treeB: 'env-tree-b', rail: 'env-guardrail', hut: 'env-hut', board: 'env-board'
  };

  const missing = [];
  for (const [name, url] of Object.entries(ASSETS)) {
    const key = keys[name];
    if (!scene.textures.exists(key)) {
      scene.load.image(key, url);
      missing.push(key);
    }
  }

  if (missing.length === 0) return placeEnvironment(scene, center, defaultTrackW);

  // Dynamic scene-safe load. Placement runs exactly once after authored SVGs are available.
  scene.load.once('complete', () => placeEnvironment(scene, center, defaultTrackW));
  if (!scene.load.isLoading()) scene.load.start();
  return [];
}
