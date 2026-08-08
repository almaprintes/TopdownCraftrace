// src/game/scenes/RaceEnvironmentLayer.js
// Static, decoration-only circuit environment. No collision, no per-frame updates.
// Premium rule: low visual noise, real trackside rhythm, no cartoon blobs.

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
  makeCanvasTexture(scene, 'envTreePremium', 72, 72, (ctx) => {
    const g = ctx.createRadialGradient(34, 31, 6, 36, 36, 29);
    g.addColorStop(0, '#58714a');
    g.addColorStop(0.34, '#3d5938');
    g.addColorStop(0.72, '#29412c');
    g.addColorStop(1, 'rgba(20,34,22,0)');
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(39, 49, 21, 9, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(35, 34, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(135,158,106,0.12)';
    ctx.beginPath(); ctx.arc(28, 26, 10, 0, Math.PI * 2); ctx.fill();
  });

  makeCanvasTexture(scene, 'envTyreWallPremium', 144, 24, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(5, 18, 134, 4);
    for (let i = 0; i < 17; i++) {
      const x = 7 + i * 8;
      ctx.fillStyle = '#171817'; ctx.beginPath(); ctx.arc(x, 10, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(92,92,86,0.42)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, 10, 2.1, 0, Math.PI * 2); ctx.stroke();
    }
  });

  makeCanvasTexture(scene, 'envGuardrail', 160, 18, (ctx) => {
    ctx.strokeStyle = 'rgba(21,24,22,0.22)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(4, 13); ctx.lineTo(156, 13); ctx.stroke();
    ctx.strokeStyle = '#9b9b92'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(156, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(222,221,207,0.66)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(156, 7); ctx.stroke();
    ctx.fillStyle = '#666760';
    for (let x = 10; x < 156; x += 24) ctx.fillRect(x, 8, 2, 8);
  });

  makeCanvasTexture(scene, 'envMarshalHutPremium', 66, 52, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(13, 42, 42, 6);
    ctx.fillStyle = '#b9b29f'; ctx.fillRect(14, 19, 38, 25);
    ctx.fillStyle = '#2e3432'; ctx.fillRect(19, 24, 11, 8); ctx.fillRect(35, 24, 11, 8);
    ctx.fillStyle = '#7e4330'; ctx.fillRect(9, 15, 49, 6);
    ctx.fillStyle = 'rgba(235,230,213,0.7)'; ctx.fillRect(17, 36, 32, 3);
  });

  makeCanvasTexture(scene, 'envSponsorBoardPremium', 110, 30, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(9, 24, 92, 4);
    ctx.fillStyle = '#d8d6cd'; ctx.fillRect(4, 3, 102, 20);
    ctx.fillStyle = '#222625'; ctx.fillRect(7, 6, 96, 14);
    ctx.fillStyle = '#d8d6cd'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TOPDOWN RACE', 55, 13);
    ctx.fillStyle = '#585a55'; ctx.fillRect(15, 23, 2, 6); ctx.fillRect(93, 23, 2, 6);
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

  const isClear = (x, y, clearance) => {
    const stride = Math.max(1, Math.floor(count / 180));
    for (let i = 0; i < count; i += stride) {
      const p = center[i];
      const half = Number(p.width || defaultTrackW) * 0.5;
      if (Math.hypot(x - p.x, y - p.y) < half + clearance) return false;
    }
    return true;
  };

  const addSprite = (key, x, y, depth, scale = 1, rotation = 0, alpha = 1) => {
    const img = scene.add.image(x, y, key).setDepth(depth).setScrollFactor(1).setScale(scale).setRotation(rotation).setAlpha(alpha);
    scene.uiCam?.ignore?.(img);
    placed.push(img);
    return img;
  };

  // Vegetation: fewer, individual crowns, farther away from the tarmac. Avoid visible repeating clusters.
  const treeStep = Math.max(24, Math.floor(count / 22));
  for (let i = 0; i < count; i += treeStep) {
    const p = center[i], { tx, ty, nx, ny } = tangentAt(i);
    const side = rand() > 0.5 ? 1 : -1;
    const baseOffset = Number(p.width || defaultTrackW) * 0.5 + 145 + rand() * 120;
    const x = p.x + nx * baseOffset * side + tx * ((rand() - 0.5) * 70);
    const y = p.y + ny * baseOffset * side + ty * ((rand() - 0.5) * 70);
    if (!isClear(x, y, 86)) continue;
    const s = 0.50 + rand() * 0.28;
    addSprite('envTreePremium', x, y, 7.25, s, rand() * Math.PI * 2, 0.92);
    if (rand() > 0.48) {
      const x2 = x + tx * (24 + rand() * 28) + nx * side * (8 + rand() * 18);
      const y2 = y + ty * (24 + rand() * 28) + ny * side * (8 + rand() * 18);
      if (isClear(x2, y2, 76)) addSprite('envTreePremium', x2, y2, 7.24, s * (0.78 + rand() * 0.16), rand() * Math.PI * 2, 0.84);
    }
  }

  // Safety furniture: short premium sections only on the outside of notable bends.
  let safety = 0;
  for (let i = 0; i < count && safety < 8; i += Math.max(10, Math.floor(count / 46))) {
    const turn = turnAt(i);
    if (Math.abs(turn) < 0.12) continue;
    const p = center[i], { tx, ty, nx, ny } = tangentAt(i);
    const outsideSide = turn > 0 ? -1 : 1;
    const offset = Number(p.width || defaultTrackW) * 0.5 + 62;
    const x = p.x + nx * offset * outsideSide;
    const y = p.y + ny * offset * outsideSide;
    if (!isClear(x, y, 34)) continue;
    const key = safety % 3 === 0 ? 'envTyreWallPremium' : 'envGuardrail';
    addSprite(key, x, y, 7.95, key === 'envGuardrail' ? 0.82 : 0.72, Math.atan2(ty, tx), 0.92);
    safety++;
  }

  // Landmarks: deliberately sparse and understated. They should aid orientation, not dominate the scene.
  const landmarkFractions = [0.21, 0.58, 0.82];
  landmarkFractions.forEach((f, n) => {
    const i = Math.floor(count * f) % count;
    const p = center[i], { tx, ty, nx, ny } = tangentAt(i);
    const side = n === 1 ? -1 : 1;
    const offset = Number(p.width || defaultTrackW) * 0.5 + 108;
    const x = p.x + nx * offset * side;
    const y = p.y + ny * offset * side;
    if (!isClear(x, y, 58)) return;
    if (n === 1) addSprite('envSponsorBoardPremium', x, y, 7.85, 0.80, Math.atan2(ty, tx), 0.90);
    else addSprite('envMarshalHutPremium', x, y, 7.82, 0.72, Math.atan2(ty, tx), 0.90);
  });

  scene._circuitEnvironment = placed;
  return placed;
}
