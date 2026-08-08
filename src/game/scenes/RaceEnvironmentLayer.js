// src/game/scenes/RaceEnvironmentLayer.js
// Static, decoration-only circuit environment. No collision, no per-frame updates.

function makeCanvasTexture(scene, key, w, h, painter) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);
  painter(ctx, w, h);
  tex.refresh();
  return key;
}

function createTextures(scene) {
  makeCanvasTexture(scene, 'envTreeCluster', 96, 96, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(49, 70, 31, 12, 0, 0, Math.PI * 2); ctx.fill();
    const crowns = [
      [32, 50, 23, '#244526'], [55, 45, 26, '#315a31'], [47, 61, 27, '#274d29'],
      [68, 60, 18, '#3b6336'], [27, 66, 16, '#365d32']
    ];
    for (const [x, y, r, c] of crowns) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(131,161,95,0.15)';
    ctx.beginPath(); ctx.arc(48, 42, 22, 0, Math.PI * 2); ctx.fill();
  });

  makeCanvasTexture(scene, 'envTyreBarrier', 128, 30, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.20)'; ctx.fillRect(3, 20, 122, 6);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 10; i++) {
        const x = 9 + i * 12 + (row ? 5 : 0), y = 8 + row * 9;
        ctx.fillStyle = '#181817'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#343330'; ctx.beginPath(); ctx.arc(x, y, 2.3, 0, Math.PI * 2); ctx.fill();
      }
    }
  });

  makeCanvasTexture(scene, 'envMarshalHut', 72, 60, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(13, 48, 48, 7);
    ctx.fillStyle = '#d2c7a5'; ctx.fillRect(14, 21, 44, 30);
    ctx.fillStyle = '#353b39'; ctx.fillRect(20, 28, 14, 11); ctx.fillRect(39, 28, 13, 11);
    ctx.fillStyle = '#6d3d2a'; ctx.fillRect(7, 16, 58, 8);
    ctx.fillStyle = '#ece8d8'; ctx.fillRect(16, 43, 40, 4);
  });

  makeCanvasTexture(scene, 'envSponsorBoard', 88, 34, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(8, 28, 72, 4);
    ctx.fillStyle = '#ece9df'; ctx.fillRect(3, 3, 82, 22);
    ctx.fillStyle = '#202421'; ctx.fillRect(7, 7, 74, 14);
    ctx.fillStyle = '#e8e1cf'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TOPDOWN RACE', 44, 14);
    ctx.fillStyle = '#454944'; ctx.fillRect(13, 25, 3, 7); ctx.fillRect(72, 25, 3, 7);
  });
}

export function addCircuitEnvironment(scene, center, defaultTrackW = 160) {
  if (!scene || !Array.isArray(center) || center.length < 24) return [];
  createTextures(scene);

  const placed = [];
  const count = center.length;
  const rand = scene._rng?.(0x7e14c93b) || Math.random;
  const wrap = (i) => (i + count) % count;

  const tangentAt = (i) => {
    const a = center[wrap(i - 3)], b = center[wrap(i + 3)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    return { tx: dx / d, ty: dy / d, nx: -dy / d, ny: dx / d };
  };
  const turnAt = (i) => {
    const a = center[wrap(i - 5)], b = center[i], c = center[wrap(i + 5)];
    let ang = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    return Math.atan2(Math.sin(ang), Math.cos(ang));
  };

  // Conservative one-time clearance check against sampled centerline points.
  const isClear = (x, y, clearance) => {
    const stride = Math.max(1, Math.floor(count / 160));
    for (let i = 0; i < count; i += stride) {
      const p = center[i];
      const half = Number(p.width || defaultTrackW) * 0.5;
      if (Math.hypot(x - p.x, y - p.y) < half + clearance) return false;
    }
    return true;
  };

  const addSprite = (key, x, y, depth, scale = 1, rotation = 0) => {
    const img = scene.add.image(x, y, key).setDepth(depth).setScrollFactor(1).setScale(scale).setRotation(rotation);
    scene.uiCam?.ignore?.(img);
    placed.push(img);
    return img;
  };

  // Tree clusters: sparse rhythm, well away from the road. These act as visual speed/reference markers.
  const treeStep = Math.max(18, Math.floor(count / 34));
  for (let i = 0; i < count; i += treeStep) {
    const p = center[i], { nx, ny } = tangentAt(i);
    const side = rand() > 0.5 ? 1 : -1;
    const offset = Number(p.width || defaultTrackW) * 0.5 + 105 + rand() * 95;
    const alongJitter = (rand() - 0.5) * 55;
    const { tx, ty } = tangentAt(i);
    const x = p.x + nx * offset * side + tx * alongJitter;
    const y = p.y + ny * offset * side + ty * alongJitter;
    if (!isClear(x, y, 58)) continue;
    addSprite('envTreeCluster', x, y, 7.6, 0.72 + rand() * 0.34, (rand() - 0.5) * 0.4);
  }

  // Tyre barriers: only outside the strongest bends, and always decorative/non-colliding.
  let barriers = 0;
  for (let i = 0; i < count && barriers < 10; i += Math.max(8, Math.floor(count / 60))) {
    const turn = turnAt(i);
    if (Math.abs(turn) < 0.115) continue;
    const p = center[i], { tx, ty, nx, ny } = tangentAt(i);
    const outsideSide = turn > 0 ? -1 : 1;
    const offset = Number(p.width || defaultTrackW) * 0.5 + 48;
    const x = p.x + nx * offset * outsideSide;
    const y = p.y + ny * offset * outsideSide;
    if (!isClear(x, y, 28)) continue;
    addSprite('envTyreBarrier', x, y, 8.1, 0.78, Math.atan2(ty, tx));
    barriers++;
  }

  // Three memorable landmarks spaced around the lap: two marshal huts and one sponsor board.
  const landmarkFractions = [0.16, 0.47, 0.76];
  landmarkFractions.forEach((f, n) => {
    const i = Math.floor(count * f) % count;
    const p = center[i], { tx, ty, nx, ny } = tangentAt(i);
    const side = n === 1 ? -1 : 1;
    const offset = Number(p.width || defaultTrackW) * 0.5 + 82;
    const x = p.x + nx * offset * side;
    const y = p.y + ny * offset * side;
    if (!isClear(x, y, 46)) return;
    if (n < 2) addSprite('envMarshalHut', x, y, 8.0, 0.90, Math.atan2(ty, tx));
    else addSprite('envSponsorBoard', x, y, 8.0, 0.95, Math.atan2(ty, tx));
  });

  scene._circuitEnvironment = placed;
  return placed;
}
