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

function debugSvg({ worldW, worldH, geom }) {
  const roadQuads = quadPolygons(geom.left, geom.right);
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${worldW}" height="${worldH}" viewBox="0 0 ${worldW} ${worldH}">
    <rect width="${worldW}" height="${worldH}" fill="#24552b"/>
    ${polyLayer(roadQuads, '#ff2020')}
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
  const svg = Buffer.from(debugSvg({ worldW, worldH, geom }));
  const fullPngBuffer = await sharp(svg, { density: 72 }).png().toBuffer();

  const previewFile = `${trackKey}-beauty-preview.webp`;
  await sharp(fullPngBuffer).webp({ quality: 96, effort: 5 }).toFile(path.join(outDir, previewFile));

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
      .webp({ quality: 96, effort: 5 })
      .toFile(path.join(outDir, `${trackKey}-beauty-${i}.webp`));
  }

  const manifest = {
    version: 3,
    generator: 'scripts/bake-track-visual.mjs',
    style: 'debug-red-asphalt-mask',
    trackKey,
    source: path.relative(ROOT, trackPath),
    worldW,
    worldH,
    preview: previewFile,
    geometry: {
      centerSamples: geom.center.length,
      trackWidth: meta.trackWidth,
      perPointWidth: true,
      grassMargin: meta.grassMargin,
      sampleStepPx: meta.sampleStepPx,
      cellSize: meta.cellSize
    },
    tiles: tiles.map((t, i) => ({ file: `${trackKey}-beauty-${i}.webp`, ...t }))
  };

  await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[track-beauty-debug] ${trackKey} ${worldW}x${worldH}; samples ${geom.center.length}`);
}

main().catch((error) => {
  console.error('[track-beauty-debug] failed');
  console.error(error);
  process.exitCode = 1;
});
