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

const REPEAT = Object.freeze({ roadCell: 205, roadMacroGrid: 4, shoulder: 1126, outer: 983 });
const ROAD_MACRO_SIZE = REPEAT.roadCell * REPEAT.roadMacroGrid;
const ROAD_CRACK_DETAIL = 0.22;

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

async function makePatternSource(input, size, brightness = 1) {
  let image = sharp(input).resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 });
  if (Math.abs(brightness - 1) > 0.001) image = image.modulate({ brightness });
  const buffer = await image.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

async function suppressRoadCracks(input) {
  // Keep the approved asphalt colour and micro-grain, but remove most of the
  // recognisable long crack contrast. A heavily blurred copy supplies only the
  // low-frequency tone; a small fraction of the original restores fine detail.
  const base = await sharp(input)
    .resize(2048, 2048, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .modulate({ brightness: 0.96 })
    .toBuffer();
  const lowFrequency = await sharp(base).blur(18).toBuffer();
  return sharp(lowFrequency)
    .composite([{ input: base, blend: 'over', opacity: ROAD_CRACK_DETAIL }])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

async function roadVariant(input, transform) {
  let image = sharp(input).resize(REPEAT.roadCell, REPEAT.roadCell, { fit: 'fill', kernel: sharp.kernel.lanczos3 });
  if (transform === 'flip') image = image.flip();
  else if (transform === 'flop') image = image.flop();
  else if (transform === 'flipflop') image = image.flip().flop();
  else if (transform === 'rotate180') image = image.rotate(180);
  return image.jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer();
}

async function makeRoadMacroSource(input) {
  const softenedInput = await suppressRoadCracks(input);
  const transforms = ['base', 'flop', 'rotate180', 'flip', 'flip', 'base', 'flipflop', 'rotate180', 'rotate180', 'flipflop', 'base', 'flop', 'flop', 'rotate180', 'flip', 'base'];
  const unique = Object.fromEntries(await Promise.all(
    ['base', 'flip', 'flop', 'flipflop', 'rotate180'].map(async name => [name, await roadVariant(softenedInput, name)])
  ));
  const composites = [];
  for (let y = 0; y < REPEAT.roadMacroGrid; y++) {
    for (let x = 0; x < REPEAT.roadMacroGrid; x++) {
      const name = transforms[y * REPEAT.roadMacroGrid + x];
      composites.push({ input: unique[name], left: x * REPEAT.roadCell, top: y * REPEAT.roadCell });
    }
  }
  const macro = await sharp({
    create: { width: ROAD_MACRO_SIZE, height: ROAD_MACRO_SIZE, channels: 3, background: { r: 90, g: 90, b: 90 } }
  }).composite(composites).jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer();
  return `data:image/jpeg;base64,${macro.toString('base64')}`;
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
    ${pattern('road', textures.road, ROAD_MACRO_SIZE)}
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
  console.log('[atlantico-bake] fetching Poly Haven materials');
  const [roadInput, shoulderInput, outerInput] = await Promise.all([
    fetchBuffer(SOURCES.road), fetchBuffer(SOURCES.shoulder), fetchBuffer(SOURCES.outer)
  ]);
  console.log(`[atlantico-bake] softening dominant asphalt cracks (${Math.round((1 - ROAD_CRACK_DETAIL) * 100)}% reduction) and building ${REPEAT.roadMacroGrid}x${REPEAT.roadMacroGrid} macro`);
  const [road, shoulder, outer] = await Promise.all([
    makeRoadMacroSource(roadInput),
    makePatternSource(shoulderInput, REPEAT.shoulder, 1.0),
    makePatternSource(outerInput, REPEAT.outer, 0.78)
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
    version: 9,
    generator: 'scripts/bake-atlantico-beauty.mjs',
    style: 'polyhaven-four-tiles-asphalt-softcracks-v1',
    trackKey: TRACK_KEY,
    worldW, worldH,
    sources: SOURCES,
    repeatWorldPx: { roadCell: REPEAT.roadCell, roadMacro: ROAD_MACRO_SIZE, shoulder: REPEAT.shoulder, outer: REPEAT.outer },
    asphaltAntiRepeat: { grid: REPEAT.roadMacroGrid, transforms: ['base','flip','flop','flipflop','rotate180'] },
    asphaltCrackDetail: ROAD_CRACK_DETAIL,
    outerBrightness: 0.78,
    tiles: tiles.map((tile, i) => ({ file:`${TRACK_KEY}-beauty-${i}.webp`, ...tile }))
  };
  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const catalog = `// AUTO-GENERATED by scripts/bake-atlantico-beauty.mjs.\nexport const GENERATED_TRACK_BEAUTY_LAYERS = Object.freeze({\n  \"track01\": Object.freeze({\n    useBeautyLayer: true,\n    assetRevision: \"atlantico-polyhaven-v9-softcracks\",\n    assetsAvailable: true,\n    worldW: ${worldW}, worldH: ${worldH}, depth: 9,\n    replaces: Object.freeze({ asphalt:true, grass:true, offroad:true, kerbs:false, props:false }),\n    tiles: Object.freeze([\n${tiles.map((t,i)=>`      Object.freeze({ key:\"beauty-track01-${i}\", path:\"assets/tracks/track01/beauty/track01-beauty-${i}.webp?v=atlantico-v9\", x:${t.x}, y:${t.y}, w:${t.w}, h:${t.h} }),`).join('\n')}\n    ])\n  })\n});\n`;
  await fs.mkdir(OUT_ROOT, { recursive:true });
  await fs.writeFile(path.join(OUT_ROOT, 'trackBeautyLayers.generated.js'), catalog);
  console.log('[atlantico-bake] done');
}

main().catch(err => {
  console.error('[atlantico-bake] failed');
  console.error(err);
  process.exitCode = 1;
});
