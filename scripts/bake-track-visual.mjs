import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildTrackRibbon } from '../src/game/tracks/TrackBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const trackKey = String(process.argv[2] || 'karting-tenerife').trim();
const trackPath = path.join(ROOT, 'src/game/tracks/library', trackKey, 'track.json');
const outDir = path.join(ROOT, 'artifacts/track-beauty', trackKey);

const VISUAL_ROAD_EXPAND = 16;

function quadPolygons(left, right) {
  const count = Math.min(left.length, right.length);
  const out = [];
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const l0 = left[i], r0 = right[i], l1 = left[j], r1 = right[j];
    out.push(`${l0[0]},${l0[1]} ${r0[0]},${r0[1]} ${r1[0]},${r1[1]} ${l1[0]},${l1[1]}`);
  }
  return out;
}

function polyLayer(polys, fill) {
  return polys.map((pts) => `<polygon points="${pts}" fill="${fill}"/>`).join('');
}

function centerPath(center) {
  if (!center?.length) return '';
  let d = `M ${center[0].x} ${center[0].y}`;
  for (let i = 1; i < center.length; i++) d += ` L ${center[i].x} ${center[i].y}`;
  return d;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomLayer({ count, rng, worldW, worldH, palette, opacityMin, opacityMax, rxMin, rxMax, ryMin, ryMax, cls = '' }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const cx = Math.round(rng() * worldW);
    const cy = Math.round(rng() * worldH);
    const rx = Math.round(rxMin + rng() * (rxMax - rxMin));
    const ry = Math.round(ryMin + rng() * (ryMax - ryMin));
    const rot = Math.round(rng() * 180);
    const fill = palette[Math.floor(rng() * palette.length)];
    const opacity = (opacityMin + rng() * (opacityMax - opacityMin)).toFixed(3);
    out.push(`<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}" transform="rotate(${rot} ${cx} ${cy})"/>`);
  }
  return out.join('');
}

function surfaceSvg({ worldW, worldH, baseGeom, roadGeom, meta }) {
  const roadQuads = quadPolygons(roadGeom.left, roadGeom.right);
  const grassQuads = quadPolygons(baseGeom.grass.left, baseGeom.grass.right);
  const center = centerPath(baseGeom.center);

  const rngGrass = mulberry32(31);
  const rngRoad = mulberry32(47);
  const rngDirt = mulberry32(59);
  const grassBlobs = randomLayer({
    count: 260,
    rng: rngGrass,
    worldW,
    worldH,
    palette: ['#4b7f40', '#2f5d2d', '#5d8745', '#6f8b4d', '#244b26'],
    opacityMin: 0.035,
    opacityMax: 0.11,
    rxMin: 40,
    rxMax: 220,
    ryMin: 20,
    ryMax: 140,
    cls: 'grassBlob'
  });
  const roadPatches = randomLayer({
    count: 320,
    rng: rngRoad,
    worldW,
    worldH,
    palette: ['#424345', '#2a2b2d', '#525355', '#1f2021', '#616264'],
    opacityMin: 0.02,
    opacityMax: 0.08,
    rxMin: 18,
    rxMax: 140,
    ryMin: 10,
    ryMax: 52,
    cls: 'roadPatch'
  });
  const dirtBlobs = randomLayer({
    count: 180,
    rng: rngDirt,
    worldW,
    worldH,
    palette: ['#887864', '#776a58', '#9b8b71', '#665947'],
    opacityMin: 0.03,
    opacityMax: 0.09,
    rxMin: 30,
    rxMax: 180,
    ryMin: 18,
    ryMax: 110,
    cls: 'dirtBlob'
  });

  const rubberStroke = Math.max(12, Number(meta.trackWidth || 66.6) * 0.34);
  const rubberStrokeSoft = Math.max(24, Number(meta.trackWidth || 66.6) * 0.55);

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${worldW}" height="${worldH}" viewBox="0 0 ${worldW} ${worldH}">
    <defs>
      <filter id="dirtNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="13" result="n"/>
        <feColorMatrix in="n" type="saturate" values="0.15" result="ns"/>
        <feBlend in="SourceGraphic" in2="ns" mode="soft-light"/>
      </filter>
      <filter id="grassNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="4" seed="17" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0.16 0 0 0 0  0 0.24 0 0 0  0 0 0.10 0 0  0 0 0 .25 0" result="gn"/>
        <feBlend in="SourceGraphic" in2="gn" mode="overlay"/>
      </filter>
      <filter id="asphaltNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="23" result="fine"/>
        <feColorMatrix in="fine" type="saturate" values="0" result="grey"/>
        <feComponentTransfer in="grey" result="soft"><feFuncA type="table" tableValues="0 0.10"/></feComponentTransfer>
        <feBlend in="SourceGraphic" in2="soft" mode="soft-light"/>
      </filter>
      <linearGradient id="grassTone" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#355f30"/>
        <stop offset="0.45" stop-color="#42733a"/>
        <stop offset="1" stop-color="#2e542b"/>
      </linearGradient>
      <linearGradient id="asphaltTone" x1="0" y1="0" x2="0.65" y2="1">
        <stop offset="0" stop-color="#3f4042"/>
        <stop offset="0.55" stop-color="#2e2f31"/>
        <stop offset="1" stop-color="#454648"/>
      </linearGradient>
      <clipPath id="grassClip">${polyLayer(grassQuads, '#fff')}</clipPath>
      <clipPath id="roadClip">${polyLayer(roadQuads, '#fff')}</clipPath>
    </defs>

    <rect width="${worldW}" height="${worldH}" fill="#7a6e5c" filter="url(#dirtNoise)"/>
    <g opacity="0.65">${dirtBlobs}</g>

    <g clip-path="url(#grassClip)">
      <rect width="${worldW}" height="${worldH}" fill="url(#grassTone)" filter="url(#grassNoise)"/>
      <g opacity="0.85">${grassBlobs}</g>
    </g>

    <g clip-path="url(#roadClip)">
      <rect width="${worldW}" height="${worldH}" fill="url(#asphaltTone)" filter="url(#asphaltNoise)"/>
      <g opacity="0.95">${roadPatches}</g>
      <path d="${center}" fill="none" stroke="#0e0f10" stroke-width="${rubberStrokeSoft}" opacity="0.055" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${center}" fill="none" stroke="#121314" stroke-width="${rubberStroke}" opacity="0.085" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

async function main() {
  const raw = await fs.readFile(trackPath, 'utf8');
  const meta = JSON.parse(raw);
  const worldW = Math.ceil(Number(meta.worldW));
  const worldH = Math.ceil(Number(meta.worldH));
  if (!worldW || !worldH) throw new Error(`Invalid world dimensions in ${trackPath}`);

  const shared = {
    centerline: meta.centerline || [],
    grassMargin: meta.grassMargin ?? 0,
    sampleStepPx: meta.sampleStepPx ?? 12,
    cellSize: meta.cellSize ?? 400
  };
  const baseGeom = buildTrackRibbon({
    ...shared,
    trackWidth: meta.trackWidth
  });
  const roadGeom = buildTrackRibbon({
    ...shared,
    trackWidth: Number(meta.trackWidth || 0) + VISUAL_ROAD_EXPAND * 2
  });
  if (!baseGeom.center?.length || !baseGeom.left?.length || !baseGeom.right?.length) {
    throw new Error(`TrackBuilder returned empty geometry for ${trackKey}`);
  }

  await fs.mkdir(outDir, { recursive: true });
  const svg = Buffer.from(surfaceSvg({ worldW, worldH, baseGeom, roadGeom, meta }));
  const fullPngBuffer = await sharp(svg, { density: 72 }).png().toBuffer();

  const previewFile = `${trackKey}-beauty-preview.webp`;
  await sharp(fullPngBuffer).webp({ quality: 90, effort: 5 }).toFile(path.join(outDir, previewFile));

  const splitX = Math.ceil(worldW / 2);
  const splitY = Math.ceil(worldH / 2);
  const tiles = [
    { x: 0, y: 0, w: splitX, h: splitY },
    { x: splitX, y: 0, w: worldW - splitX, h: splitY },
    { x: 0, y: splitY, w: splitX, h: worldH - splitY },
    { x: splitX, y: splitY, w: worldW - splitX, h: worldH - splitY }
  ];

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    await sharp(fullPngBuffer)
      .extract({ left: t.x, top: t.y, width: t.w, height: t.h })
      .webp({ quality: 88, effort: 5 })
      .toFile(path.join(outDir, `${trackKey}-beauty-${i}.webp`));
  }

  const manifest = {
    version: 2,
    generator: 'scripts/bake-track-visual.mjs',
    trackKey,
    source: path.relative(ROOT, trackPath),
    worldW,
    worldH,
    preview: previewFile,
    geometry: {
      centerSamples: baseGeom.center.length,
      trackWidth: meta.trackWidth,
      grassMargin: meta.grassMargin,
      sampleStepPx: meta.sampleStepPx,
      cellSize: meta.cellSize,
      visualRoadExpand: VISUAL_ROAD_EXPAND
    },
    tiles: tiles.map((t, i) => ({ file: `${trackKey}-beauty-${i}.webp`, ...t }))
  };
  await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`[track-beauty] ${trackKey}`);
  console.log(`[track-beauty] world ${worldW}x${worldH}; samples ${baseGeom.center.length}`);
  console.log(`[track-beauty] road expand ${VISUAL_ROAD_EXPAND}px/side`);
  console.log(`[track-beauty] output ${path.relative(ROOT, outDir)}`);
}

main().catch((error) => {
  console.error('[track-beauty] failed');
  console.error(error);
  process.exitCode = 1;
});
