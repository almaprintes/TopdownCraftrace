// src/game/scenes/RaceEnvironmentLayer.js
// Curated static environment. Visual only: no collision, no random scatter, no per-frame work.

const BASE = import.meta.env.BASE_URL || '/';

const ASSETS = {
  treeA: { key: 'env-tree-deciduous-01', url: `${BASE}assets/environment/tree_deciduous_01.webp` },
  treeB: { key: 'env-tree-conifer-01', url: `${BASE}assets/environment/tree_conifer_01.webp` },
  shrubA: { key: 'env-shrub-round-01', url: `${BASE}assets/environment/shrub_round_01.webp` },
  shrubB: { key: 'env-shrub-flowers-01', url: `${BASE}assets/environment/shrub_flowers_01.webp` },

  treeBroad1: { key: 'env-tree-broad-01', url: `${BASE}assets/environment/vegetation/tree_broad_01.webp` },
  treeBroad2: { key: 'env-tree-broad-02', url: `${BASE}assets/environment/vegetation/tree_broad_02.webp` },
  palmTall: { key: 'env-palm-tall-01', url: `${BASE}assets/environment/vegetation/palm_tall_01.webp` },

  tireStack: { key: 'env-tire-stack-compact-01', url: `${BASE}assets/environment/barriers/tire_stack_compact_01.webp` },
  tireStraight: { key: 'env-tire-barrier-straight-01', url: `${BASE}assets/environment/barriers/tire_barrier_straight_short_01.webp` },
  guardrailStraight: { key: 'env-guardrail-straight-01', url: `${BASE}assets/environment/barriers/guardrail_straight_01.webp` },
  concreteStraight: { key: 'env-concrete-barrier-straight-01', url: `${BASE}assets/environment/barriers/concrete_barrier_straight_01.webp` },
  plasticRedWhite: { key: 'env-plastic-barrier-redwhite-01', url: `${BASE}assets/environment/barriers/plastic_barrier_redwhite_01.webp` },

  cone: { key: 'env-cone-orange-01', url: `${BASE}assets/environment/props/cone_orange_01.webp` },
  bollard: { key: 'env-bollard-metal-short-01', url: `${BASE}assets/environment/props/bollard_metal_short_01.webp` },
  directionSign: { key: 'env-direction-sign-01', url: `${BASE}assets/environment/props/direction_sign_01.webp` },
  extinguisher: { key: 'env-extinguisher-post-01', url: `${BASE}assets/environment/props/extinguisher_post_01.webp` },
  lightPost: { key: 'env-light-post-short-01', url: `${BASE}assets/environment/props/light_post_short_01.webp` },
  barrel: { key: 'env-metal-barrel-01', url: `${BASE}assets/environment/props/metal_barrel_01.webp` },
  raceStartLight: { key: 'env-race-start-light-01', url: `${BASE}assets/environment/props/race_start_light_01.webp` },
  toolbox: { key: 'env-toolbox-01', url: `${BASE}assets/environment/props/toolbox_01.webp` },
  pallet: { key: 'env-wood-pallet-01', url: `${BASE}assets/environment/props/wood_pallet_01.webp` }
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

function addImage(scene, placed, key, x, y, scale = 1, rotation = 0, depth = 7.15, displayWidth = 0) {
  if (!scene.textures.exists(key)) return null;
  const img = scene.add.image(x, y, key)
    .setScrollFactor(1)
    .setDepth(depth)
    .setRotation(rotation);
  if (displayWidth > 0 && img.width > 0) {
    img.setDisplaySize(displayWidth, img.height * (displayWidth / img.width));
  } else {
    img.setScale(scale);
  }
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
    const rot = m.followTrack ? Math.atan2(a.ty, a.tx) + (m.rotation || 0) : (m.rotation || 0);
    addImage(scene, placed, ASSETS[m.asset].key, x, y, m.scale || 1, rot, m.depth || 7.13, m.width || 0);
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
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fillRect(13, 57, 294, 12);
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
    ctx.fillStyle = s.accent;
    ctx.fillRect(18, 19, 5, 32);
    ctx.fillRect(28, 19, 2, 32);
    ctx.fillStyle = s.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = s.id === 'almaprint' ? '700 34px system-ui, sans-serif' : '900 36px system-ui, sans-serif';
    ctx.fillText(s.name, 171, 35);
    ctx.fillStyle = '#4f5458';
    ctx.fillRect(55, 62, 12, 9);
    ctx.fillRect(253, 62, 12, 9);
    tex.refresh();
  }
}

function isKartingCanarias(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || '').toLowerCase();
  return key.includes('karting-canarias') || key.includes('karting_canarias') || name.includes('karting canarias');
}

function isKartingTenerife(scene) {
  const key = String(scene?.trackKey || '').toLowerCase();
  const name = String(scene?.track?.meta?.name || '').toLowerCase();
  return key.includes('karting-tenerife') || key.includes('karting_tenerife') || name.includes('karting tenerife');
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
    candidates.push({ d, bend: angleDiff(aa, bb) + angleDiff(bb, cc) });
  }
  candidates.sort((a, b) => a.bend - b.bend);
  const picked = [];
  for (const c of candidates) {
    if (picked.every((p) => {
      const raw = Math.abs(p.d - c.d);
      return Math.min(raw, total - raw) > total * 0.18;
    })) {
      picked.push(c);
      if (picked.length >= 3) break;
    }
  }
  return picked;
}

function placeSponsorBoards(scene, placed, center, defaultTrackW) {
  if (!isKartingCanarias(scene)) return;
  makeSponsorTextures(scene);
  const metrics = buildCenterMetrics(center);
  if (metrics.total < 300) return;
  const straightCenters = findStraightCenters(center, metrics, defaultTrackW);
  const runs = [
    { brands: SPONSORS.slice(0, 4), anchor: straightCenters[0], side: 1 },
    { brands: SPONSORS.slice(4), anchor: straightCenters[1] || straightCenters[0], side: -1 }
  ];
  const spacing = 142;
  for (const run of runs) {
    if (!run.anchor) continue;
    const start = run.anchor.d - ((run.brands.length - 1) * spacing) * 0.5;
    for (let i = 0; i < run.brands.length; i++) {
      const s = sampleCenterAtDistance(center, metrics, start + i * spacing, defaultTrackW);
      const offset = s.width * 0.5 + 34;
      let side = run.side;
      let x = s.x + s.nx * side * offset;
      let y = s.y + s.ny * side * offset;
      if (!isClearOfTrack(center, x, y, defaultTrackW, 14)) {
        side *= -1;
        x = s.x + s.nx * side * offset;
        y = s.y + s.ny * side * offset;
      }
      if (!isClearOfTrack(center, x, y, defaultTrackW, 10)) continue;
      const key = `env-sponsor-${run.brands[i].id}-v1`;
      const img = scene.add.image(x, y, key)
        .setScrollFactor(1)
        .setDepth(15.5)
        .setRotation(Math.atan2(s.ty, s.tx))
        .setDisplaySize(132, 34)
        .setOrigin(0.5, 0.5);
      scene.uiCam?.ignore?.(img);
      placed.push(img);
    }
  }
}

function finishFraction(scene, center) {
  const finish = scene?.track?.meta?.finishAnchor || scene?.track?.finishAnchor;
  const fx = Number(finish?.x), fy = Number(finish?.y);
  if (!Number.isFinite(fx) || !Number.isFinite(fy)) return 0;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < center.length; i++) {
    const d = Math.hypot(center[i].x - fx, center[i].y - fy);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best / center.length;
}

function placeLinearRun(scene, placed, center, metrics, defaultTrackW, spec) {
  if (!spec.anchor) return;
  const start = spec.anchor.d - ((spec.count - 1) * spec.spacing) * 0.5;
  for (let i = 0; i < spec.count; i++) {
    const s = sampleCenterAtDistance(center, metrics, start + i * spec.spacing, defaultTrackW);
    const offset = s.width * 0.5 + spec.edgeGap;
    const x = s.x + s.nx * spec.side * offset;
    const y = s.y + s.ny * spec.side * offset;
    const half = spec.width * 0.42;
    const ex1 = x - s.tx * half, ey1 = y - s.ty * half;
    const ex2 = x + s.tx * half, ey2 = y + s.ty * half;
    if (!isClearOfTrack(center, x, y, defaultTrackW, spec.clearance || 12)) continue;
    if (!isClearOfTrack(center, ex1, ey1, defaultTrackW, 7) || !isClearOfTrack(center, ex2, ey2, defaultTrackW, 7)) continue;
    addImage(scene, placed, ASSETS[spec.asset].key, x, y, 1, Math.atan2(s.ty, s.tx), spec.depth || 12.2, spec.width);
  }
}

function placeKartingTenerifePilot(scene, placed, center, defaultTrackW) {
  if (!isKartingTenerife(scene)) return;

  // Large vegetation sits well outside the racing ribbon. Every member is independently
  // rejected when another piece of road comes too close, important on this compact layout.
  const vegetation = [
    { fraction: 0.04, side: -1, extra: 138, clearance: 78, members: [
      {asset:'treeBroad1',along:-82,out:18,width:150,rotation:-.12,clearance:72},
      {asset:'treeBroad2',along:12,out:72,width:136,rotation:.09,clearance:70},
      {asset:'palmTall',along:92,out:18,width:118,rotation:.22,clearance:66},
      {asset:'shrubA',along:35,out:112,scale:.21,rotation:.11,clearance:50}
    ]},
    { fraction: 0.21, side: 1, extra: 150, clearance: 80, members: [
      {asset:'palmTall',along:-100,out:16,width:116,rotation:-.20,clearance:66},
      {asset:'treeBroad2',along:-28,out:72,width:144,rotation:.13,clearance:72},
      {asset:'treeBroad1',along:70,out:30,width:152,rotation:-.08,clearance:74},
      {asset:'shrubB',along:112,out:92,scale:.20,rotation:.24,clearance:48}
    ]},
    { fraction: 0.43, side: -1, extra: 156, clearance: 82, members: [
      {asset:'treeBroad1',along:-92,out:20,width:148,rotation:.12,clearance:72},
      {asset:'palmTall',along:-12,out:82,width:112,rotation:-.14,clearance:64},
      {asset:'treeBroad2',along:82,out:36,width:140,rotation:.19,clearance:70},
      {asset:'shrubA',along:30,out:122,scale:.20,rotation:-.18,clearance:48}
    ]},
    { fraction: 0.67, side: 1, extra: 148, clearance: 80, members: [
      {asset:'palmTall',along:-96,out:28,width:118,rotation:.18,clearance:66},
      {asset:'treeBroad1',along:-8,out:78,width:154,rotation:-.06,clearance:74},
      {asset:'treeBroad2',along:86,out:24,width:138,rotation:.15,clearance:70}
    ]},
    { fraction: 0.86, side: -1, extra: 152, clearance: 80, members: [
      {asset:'treeBroad2',along:-92,out:28,width:140,rotation:-.19,clearance:70},
      {asset:'treeBroad1',along:-4,out:86,width:150,rotation:.08,clearance:74},
      {asset:'palmTall',along:94,out:18,width:114,rotation:.26,clearance:64},
      {asset:'shrubB',along:40,out:120,scale:.21,rotation:-.14,clearance:48}
    ]}
  ];
  for (const cluster of vegetation) addCluster(scene, placed, center, defaultTrackW, cluster);

  // Technical paddock-like pockets: deliberately visual-only and far enough from asphalt.
  const ff = finishFraction(scene, center);
  const technical = [
    { fraction: (ff + 0.018) % 1, side: 1, extra: 112, clearance: 70, members: [
      {asset:'raceStartLight',along:-42,out:4,width:72,followTrack:true,rotation:Math.PI/2,clearance:54,depth:13.2},
      {asset:'lightPost',along:58,out:20,width:54,rotation:.10,clearance:48,depth:12.9},
      {asset:'cone',along:92,out:-8,width:34,rotation:.20,clearance:30,depth:13.0}
    ]},
    { fraction: (ff + 0.055) % 1, side: 1, extra: 176, clearance: 86, members: [
      {asset:'pallet',along:-72,out:0,width:76,followTrack:true,clearance:48,depth:12.4},
      {asset:'toolbox',along:-12,out:14,width:60,followTrack:true,rotation:.08,clearance:42,depth:12.6},
      {asset:'barrel',along:48,out:8,width:50,rotation:.14,clearance:40,depth:12.6},
      {asset:'extinguisher',along:90,out:24,width:48,rotation:-.12,clearance:38,depth:12.8},
      {asset:'bollard',along:20,out:70,width:34,rotation:.10,clearance:30,depth:12.7}
    ]},
    { fraction: 0.56, side: -1, extra: 112, clearance: 68, members: [
      {asset:'directionSign',along:-34,out:8,width:68,followTrack:true,rotation:Math.PI/2,clearance:44,depth:12.8},
      {asset:'cone',along:28,out:-4,width:32,rotation:.14,clearance:28,depth:12.8},
      {asset:'cone',along:62,out:3,width:30,rotation:-.16,clearance:28,depth:12.8}
    ]},
    { fraction: 0.76, side: 1, extra: 130, clearance: 72, members: [
      {asset:'tireStack',along:-44,out:5,width:76,rotation:-.12,clearance:52,depth:12.2},
      {asset:'tireStack',along:32,out:18,width:68,rotation:.18,clearance:48,depth:12.2},
      {asset:'bollard',along:84,out:4,width:32,rotation:.07,clearance:28,depth:12.6}
    ]}
  ];
  for (const cluster of technical) addCluster(scene, placed, center, defaultTrackW, cluster);

  // A few coherent safety runs on the straightest sections. They are outside the road,
  // aligned to its tangent, and skipped if either endpoint approaches another track segment.
  const metrics = buildCenterMetrics(center);
  const straights = findStraightCenters(center, metrics, defaultTrackW);
  if (straights[0]) placeLinearRun(scene, placed, center, metrics, defaultTrackW, {
    anchor: straights[0], side: -1, asset:'guardrailStraight', count:3, spacing:112, edgeGap:38, width:118, clearance:12, depth:12.0
  });
  if (straights[1]) placeLinearRun(scene, placed, center, metrics, defaultTrackW, {
    anchor: straights[1], side: 1, asset:'plasticRedWhite', count:2, spacing:118, edgeGap:44, width:124, clearance:14, depth:12.0
  });
  if (straights[2]) placeLinearRun(scene, placed, center, metrics, defaultTrackW, {
    anchor: straights[2], side: -1, asset:'tireStraight', count:2, spacing:112, edgeGap:40, width:116, clearance:14, depth:12.0
  });
}

function placeLegacyVegetation(scene, placed, center, defaultTrackW) {
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
}

function placeCuratedEnvironment(scene, center, defaultTrackW) {
  if (Array.isArray(scene._circuitEnvironment)) {
    for (const obj of scene._circuitEnvironment) obj?.destroy?.();
  }
  const placed = [];
  placeSponsorBoards(scene, placed, center, defaultTrackW);
  placeLegacyVegetation(scene, placed, center, defaultTrackW);
  placeKartingTenerifePilot(scene, placed, center, defaultTrackW);
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
