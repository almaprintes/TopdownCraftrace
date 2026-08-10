// src/game/scenes/RaceEnvironmentLayer.js
// Curated static environment + pilot sponsor-board system.
// No collision, no random scatter, no per-frame work.

const BASE = import.meta.env.BASE_URL || '/';

const ASSETS = {
  treeA: { key: 'env-tree-deciduous-01', url: `${BASE}assets/environment/tree_deciduous_01.webp` },
  treeB: { key: 'env-tree-conifer-01', url: `${BASE}assets/environment/tree_conifer_01.webp` },
  shrubA: { key: 'env-shrub-round-01', url: `${BASE}assets/environment/shrub_round_01.webp` },
  shrubB: { key: 'env-shrub-flowers-01', url: `${BASE}assets/environment/shrub_flowers_01.webp` }
};

const SPONSORS = [
  { id:'forge', name:'FORGE', bg:'#151515', edge:'#ff9d19', fg:'#f5f2e9', accent:'#ff7a00' },
  { id:'avenir', name:'AVENIR', bg:'#101622', edge:'#d8dde5', fg:'#f4f5f7', accent:'#d7aa45' },
  { id:'veloce', name:'VELOCE', bg:'#121b2d', edge:'#f1d321', fg:'#f7f8fb', accent:'#18a84b' },
  { id:'crown', name:'CROWN', bg:'#101827', edge:'#e4b43a', fg:'#f6f1df', accent:'#ffce52' },
  { id:'helix', name:'HÉLIX', bg:'#b80d13', edge:'#ffd52a', fg:'#fff4d7', accent:'#ffb400' },
  { id:'tdr', name:'TDR', bg:'#07111c', edge:'#39bfff', fg:'#ffffff', accent:'#1e8dff' },
  { id:'almaprint', name:'AlmaPrint', bg:'#151018', edge:'#d8a845', fg:'#f4d88c', accent:'#8d38cf' }
];

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

function buildCenterMetrics(center) {
  const cumulative = [0];
  let total = 0;
  for (let i = 0; i < center.length; i++) {
    const a = center[i];
    const b = center[(i + 1) % center.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
    cumulative.push(total);
  }
  return { cumulative, total };
}

function sampleCenterAtDistance(center, metrics, distance, defaultTrackW) {
  const total = metrics.total || 1;
  const d = ((distance % total) + total) % total;
  const cumulative = metrics.cumulative;

  let lo = 0;
  let hi = center.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (cumulative[mid] <= d) lo = mid;
    else hi = mid - 1;
  }

  const i = Math.min(lo, center.length - 1);
  const a = center[i];
  const b = center[(i + 1) % center.length];
  const segStart = cumulative[i];
  const segEnd = cumulative[i + 1];
  const segLen = Math.max(0.0001, segEnd - segStart);
  const t = Math.max(0, Math.min(1, (d - segStart) / segLen));

  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const mag = Math.hypot(dx, dy) || 1;
  const tx = dx / mag;
  const ty = dy / mag;
  const nx = -ty;
  const ny = tx;
  const widthA = Number(a.width || defaultTrackW);
  const widthB = Number(b.width || defaultTrackW);
  const width = widthA + (widthB - widthA) * t;

  return { x, y, tx, ty, nx, ny, width };
}

function angleDiff(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function makeSponsorTextures(scene) {
  for (const s of SPONSORS) {
    const key = `env-sponsor-${s.id}-v1`;
    if (scene.textures.exists(key)) continue;

    const tex = scene.textures.createCanvas(key, 320, 82);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 320, 82);

    // soft ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fillRect(13, 57, 294, 12);

    // panel body
    const g = ctx.createLinearGradient(0, 10, 0, 62);
    g.addColorStop(0, s.bg);
    g.addColorStop(1, '#080a0d');
    ctx.fillStyle = g;
    ctx.strokeStyle = s.edge;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(7, 8, 306, 54, 7);
    ctx.fill();
    ctx.stroke();

    // small racing accent
    ctx.fillStyle = s.accent;
    ctx.fillRect(18, 19, 5, 32);
    ctx.fillRect(28, 19, 2, 32);

    // wordmark
    ctx.fillStyle = s.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = s.id === 'almaprint' ? '700 34px system-ui, sans-serif' : '900 36px system-ui, sans-serif';
    ctx.fillText(s.name, 171, 35);

    // support feet seen from above
    ctx.fillStyle = '#4f5458';
    ctx.fillRect(55, 62, 12, 9);
    ctx.fillRect(253, 62, 12, 9);

    tex.refresh();
  }
}

function isPilotCircuit(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function findStraightCenters(center, metrics, defaultTrackW) {
  const total = metrics.total;
  const candidates = [];
  const probe = Math.max(70, Math.min(120, total * 0.035));
  const step = Math.max(45, Math.min(75, total / 80));

  for (let d = 0; d < total; d += step) {
    const a = sampleCenterAtDistance(center, metrics, d - probe, defaultTrackW);
    const b = sampleCenterAtDistance(center, metrics, d, defaultTrackW);
    const c = sampleCenterAtDistance(center, metrics, d + probe, defaultTrackW);
    const aa = Math.atan2(a.ty, a.tx);
    const bb = Math.atan2(b.ty, b.tx);
    const cc = Math.atan2(c.ty, c.tx);
    const bend = angleDiff(aa, bb) + angleDiff(bb, cc);
    candidates.push({ d, bend });
  }

  candidates.sort((a, b) => a.bend - b.bend);
  const picked = [];
  for (const c of candidates) {
    if (picked.every((p) => {
      const raw = Math.abs(p.d - c.d);
      const circular = Math.min(raw, total - raw);
      return circular > total * 0.22;
    })) {
      picked.push(c);
      if (picked.length >= 2) break;
    }
  }
  return picked;
}

function placeSponsorBoards(scene, placed, center, defaultTrackW) {
  if (!isPilotCircuit(scene)) return;

  makeSponsorTextures(scene);
  const metrics = buildCenterMetrics(center);
  if (metrics.total < 300) return;

  const straightCenters = findStraightCenters(center, metrics, defaultTrackW);
  const runs = [
    { brands: SPONSORS.slice(0, 4), anchor: straightCenters[0], side: 1 },
    { brands: SPONSORS.slice(4), anchor: straightCenters[1] || straightCenters[0], side: -1 }
  ];

  const spacing = 142;
  const panelW = 132;
  const panelH = 34;
  const edgeGap = 34;

  for (const run of runs) {
    if (!run.anchor) continue;
    const count = run.brands.length;
    const start = run.anchor.d - ((count - 1) * spacing) * 0.5;

    for (let i = 0; i < count; i++) {
      const s = sampleCenterAtDistance(center, metrics, start + i * spacing, defaultTrackW);
      const offset = s.width * 0.5 + edgeGap;
      let side = run.side;
      let x = s.x + s.nx * side * offset;
      let y = s.y + s.ny * side * offset;

      // If another road section is too close, flip the panel to the other side.
      if (!isClearOfTrack(center, x, y, defaultTrackW, 14)) {
        side *= -1;
        x = s.x + s.nx * side * offset;
        y = s.y + s.ny * side * offset;
      }

      const brand = run.brands[i];
      const key = `env-sponsor-${brand.id}-v1`;
      const img = scene.add.image(x, y, key)
        .setScrollFactor(1)
        .setDepth(15.5)
        .setRotation(Math.atan2(s.ty, s.tx))
        .setDisplaySize(panelW, panelH)
        .setOrigin(0.5, 0.5);
      scene.uiCam?.ignore?.(img);
      placed.push(img);
    }
  }
}

function placeCuratedEnvironment(scene, center, defaultTrackW) {
  if (Array.isArray(scene._circuitEnvironment)) {
    for (const obj of scene._circuitEnvironment) obj?.destroy?.();
  }

  const placed = [];

  // Pilot monetisation test: only Karting Canarias for now.
  placeSponsorBoards(scene, placed, center, defaultTrackW);

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
  if (missing.length === 0) return placeCuratedEnvironment(scene, center, defaultTrackW);
  scene.load.once('complete', () => placeCuratedEnvironment(scene, center, defaultTrackW));
  if (!scene.load.isLoading()) scene.load.start();
  return [];
}
