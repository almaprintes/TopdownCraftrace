import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildTrackRibbon } from '../src/game/tracks/TrackBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TRACK_KEY = 'track01';
const TRACK_PATH = path.join(ROOT, 'src/game/tracks/library/track01/track.json');
const OUT_ROOT = path.join(ROOT, 'artifacts/track-beauty');
const OUT_DIR = path.join(OUT_ROOT, TRACK_KEY);

const SOURCES = Object.freeze({
  road: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_02/asphalt_02_diff_2k.jpg',
  shoulder: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/sparse_grass/sparse_grass_diff_2k.jpg',
  outer: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rocky_trail_02/rocky_trail_02_diff_2k.jpg'
});

// Final world-space repeat sizes established from the in-game visual tests.
const REPEAT = Object.freeze({ road: 205, shoulder: 1126, outer: 983 });

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function makePatternSource(url, size, brightness = 1) {
  const input = await fetchBuffer(url);
  let image = sharp(input).resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 });
  if (Math.abs(brightness - 1) > 0.001) image = image.modulate({ brightness });
  const buffer = await image.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

function quads(left, right) {
  const n = Math.min(left?.length || 0, right?.length || 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = left[i], b = right[i], c = right[j], d = left[j];
    if (!a || !b || !c || !d) continue;
    out.push(`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}`);
  }
  return out;
}

function polys(list, fill) {
  return list.map(points => `<polygon points="${points}" fill="${fill}"/>`).join('');
}

function pattern(id, uri, size) {
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><image href="${uri}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="none"/></pattern>`;
}

function svgForTile({ worldW, worldH, geom, textures, tile }) {
  const road = quads(geom.left, geom.right);
  const shoulder = quads(geom.grass?.left, geom.grass?.right);
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${tile.w}" height="${tile.h}" viewBox="${tile.x} ${tile.y} ${tile.w} ${tile.h}">
  <defs>
    ${pattern('outer', textures.outer, REPEAT.outer)}
    ${pattern('shoulder', textures.shoulder, REPEAT.shoulder)}
    ${pattern('road', textures.road, REPEAT.road)}
  </defs>
  <rect x="0" y="0" width="${worldW}" height="${worldH}" fill="url(#outer)"/>
  ${polys(shoulder, 'url(#shoulder)')}
  ${polys(road, 'url(#road)')}
</svg>`);
}

async function main() {
  const meta = JSON.parse(await fs.readFile(TRACK_PATH, 'utf8'));
  const worldW = Math.ceil(Number(meta.worldW));
  const worldH = Math.ceil(Number(meta.worldH));
  const geom = buildTrackRibbon({
    centerline: meta.centerline || [],
    trackWidth: meta.trackWidth,
    grassMargin: meta.grassMargin ?? 0,
    sampleStepPx: meta.sampleStepPx ?? 12,
    cellSize: meta.cellSize ?? 400
  });
  if (!worldW || !worldH || !geom.center?.length) throw new Error('Invalid Atlantico geometry');

  console.log(`[atlantico-bake] world ${worldW}x${worldH}; samples ${geom.center.length}`);
  console.log('[atlantico-bake] fetching and pre-scaling Poly Haven materials');
  const [road, shoulder, outer] = await Promise.all([
    makePatternSource(SOURCES.road, REPEAT.road, 0.96),
    makePatternSource(SOURCES.shoulder, REPEAT.shoulder, 1.0),
    makePatternSource(SOURCES.outer, REPEAT.outer, 0.78)
  ]);
  const textures = { road, shoulder, outer };
  await fs.mkdir(OUT_DIR, { recursive: true });

  const splitX = Math.ceil(worldW / 2);
  const splitY = Math.ceil(worldH / 2);
  const tiles = [
    { x:0, y:0, w:splitX, h:splitY },
    { x:splitX, y:0, w:worldW-splitX, h:splitY },
    { x:0, y:splitY, w:splitX, h:worldH-splitY },
    { x:splitX, y:splitY, w:worldW-splitX, h:worldH-splitY }
  ];

  for (let i = 0; i < 4; i++) {
    const tile = tiles[i];
    console.log(`[atlantico-bake] tile ${i + 1}/4 ${tile.w}x${tile.h}`);
    await sharp(svgForTile({ worldW, worldH, geom, textures, tile }), { density:72 })
      .webp({ quality:86, effort:3 })
      .toFile(path.join(OUT_DIR, `${TRACK_KEY}-beauty-${i}.webp`));
  }

  const previewW = 1215;
  const previewH = Math.round(worldH * previewW / worldW);
  const previewSvg = svgForTile({ worldW, worldH, geom, textures, tile:{x:0,y:0,w:worldW,h:worldH} });
  await sharp(previewSvg, { density:72 }).resize(previewW, previewH).webp({ quality:86, effort:3 })
    .toFile(path.join(OUT_DIR, `${TRACK_KEY}-beauty-preview.webp`));

  const manifest = {
    version: 7,
    generator: 'scripts/bake-atlantico-beauty.mjs',
    style: 'polyhaven-calibrated-four-tiles-fast-v1',
    trackKey: TRACK_KEY,
    worldW, worldH,
    sources: SOURCES,
    repeatWorldPx: REPEAT,
    outerBrightness: 0.78,
    tiles: tiles.map((tile, i) => ({ file:`${TRACK_KEY}-beauty-${i}.webp`, ...tile }))
  };
  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const catalog = `// AUTO-GENERATED by scripts/bake-atlantico-beauty.mjs.\nexport const GENERATED_TRACK_BEAUTY_LAYERS = Object.freeze({\n  \"track01\": Object.freeze({\n    useBeautyLayer: true,\n    assetRevision: \"atlantico-polyhaven-v7\",\n    assetsAvailable: true,\n    worldW: ${worldW}, worldH: ${worldH}, depth: 9,\n    replaces: Object.freeze({ asphalt:true, grass:true, offroad:true, kerbs:false, props:false }),\n    tiles: Object.freeze([\n${tiles.map((t,i)=>`      Object.freeze({ key:\"beauty-track01-${i}\", path:\"assets/tracks/track01/beauty/track01-beauty-${i}.webp\", x:${t.x}, y:${t.y}, w:${t.w}, h:${t.h} }),`).join('\n')}\n    ])\n  })\n});\n`;
  await fs.mkdir(OUT_ROOT, { recursive:true });
  await fs.writeFile(path.join(OUT_ROOT, 'trackBeautyLayers.generated.js'), catalog);
  console.log('[atlantico-bake] done');
}

main().catch(err => {
  console.error('[atlantico-bake] failed');
  console.error(err);
  process.exitCode = 1;
});
