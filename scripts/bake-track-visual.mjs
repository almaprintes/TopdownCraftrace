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
  return `${d} Z`;
}

function surfaceSvg({ worldW, worldH, geom }) {
  const roadQuads = quadPolygons(geom.left, geom.right);
  const grassQuads = quadPolygons(geom.grass.left, geom.grass.right);
  const center = centerPath(geom.center);

  // Fidelity first: every visible mask comes from the same TrackBuilder geometry
  // used by runtime. Decoration is intentionally restrained in this first bake.
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${worldW}" height="${worldH}" viewBox="0 0 ${worldW} ${worldH}">
    <defs>
      <filter id="dirtNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="13" result="n"/>
        <feColorMatrix in="n" type="saturate" values="0.18" result="ns"/>
        <feBlend in="SourceGraphic" in2="ns" mode="soft-light"/>
      </filter>
      <filter id="grassNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.055 0.018" numOctaves="3" seed="31" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0.18 0 0 0 0  0 0.28 0 0 0  0 0 0.12 0 0  0 0 0 .32 0" result="gn"/>
        <feBlend in="SourceGraphic" in2="gn" mode="overlay"/>
      </filter>
      <filter id="asphaltNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="4" seed="47" result="n"/>
        <feColorMatrix in="n" type="saturate" values="0" result="grey"/>
        <feComponentTransfer in="grey" result="soft"><feFuncA type="table" tableValues="0 0.20"/></feComponentTransfer>
        <feBlend in="SourceGraphic" in2="soft" mode="soft-light"/>
      </filter>
      <clipPath id="grassClip">${polyLayer(grassQuads, '#fff')}</clipPath>
      <clipPath id="roadClip">${polyLayer(roadQuads, '#fff')}</clipPath>
      <linearGradient id="grassTone" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#315d2d"/><stop offset="0.48" stop-color="#3d6b34"/><stop offset="1" stop-color="#294f27"/>
      </linearGradient>
      <linearGradient id="asphaltTone" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#343537"/><stop offset="0.55" stop-color="#292a2c"/><stop offset="1" stop-color="#38393a"/>
      </linearGradient>
    </defs>

    <rect width="${worldW}" height="${worldH}" fill="#756b5c" filter="url(#dirtNoise)"/>

    <g clip-path="url(#grassClip)">
      <rect width="${worldW}" height="${worldH}" fill="url(#grassTone)" filter="url(#grassNoise)"/>
      <g opacity="0.10">
        ${Array.from({ length: Math.ceil(worldH / 30) + 1 }, (_, i) => `<rect x="0" y="${i * 30}" width="${worldW}" height="15" fill="#b2bd78"/>`).join('')}
      </g>
    </g>

    <g clip-path="url(#roadClip)">
      <rect width="${worldW}" height="${worldH}" fill="url(#asphaltTone)" filter="url(#asphaltNoise)"/>
      <path d="${center}" fill="none" stroke="#08090a" stroke-width="18" opacity="0.10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${center}" fill="none" stroke="#c5c2b8" stroke-width="3" opacity="0.025" stroke-dasharray="70 150"/>
    </g>
  </svg>`;
}

async function main() {
  const raw = await fs.readFile(trackPath, 'utf8');
  const meta = JSON.parse(raw);
  const worldW = Math.ceil(Number(meta.worldW));
  const worldH = Math.ceil(Number(meta.worldH));
  if (!worldW || !worldH) throw new Error(`Invalid world dimensions in ${trackPath}`);

  const geom = buildTrackRibbon({
    centerline: meta.centerline || [],
    trackWidth: meta.trackWidth,
    grassMargin: meta.grassMargin ?? 0,
    sampleStepPx: meta.sampleStepPx ?? 12,
    cellSize: meta.cellSize ?? 400
  });
  if (!geom.center?.length || !geom.left?.length || !geom.right?.length) {
    throw new Error(`TrackBuilder returned empty geometry for ${trackKey}`);
  }

  await fs.mkdir(outDir, { recursive: true });
  const svg = Buffer.from(surfaceSvg({ worldW, worldH, geom }));
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
    version: 1,
    generator: 'scripts/bake-track-visual.mjs',
    trackKey,
    source: path.relative(ROOT, trackPath),
    worldW,
    worldH,
    preview: previewFile,
    geometry: {
      centerSamples: geom.center.length,
      trackWidth: meta.trackWidth,
      grassMargin: meta.grassMargin,
      sampleStepPx: meta.sampleStepPx,
      cellSize: meta.cellSize
    },
    tiles: tiles.map((t, i) => ({ file: `${trackKey}-beauty-${i}.webp`, ...t }))
  };
  await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`[track-beauty] ${trackKey}`);
  console.log(`[track-beauty] world ${worldW}x${worldH}; samples ${geom.center.length}`);
  console.log(`[track-beauty] output ${path.relative(ROOT, outDir)}`);
}

main().catch((error) => {
  console.error('[track-beauty] failed');
  console.error(error);
  process.exitCode = 1;
});
