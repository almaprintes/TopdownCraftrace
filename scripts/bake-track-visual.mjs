import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildTrackRibbon } from '../src/game/tracks/TrackBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LIBRARY_DIR = path.join(ROOT, 'src/game/tracks/library');
const OUT_ROOT = path.join(ROOT, 'artifacts/track-beauty');
const requested = String(process.argv[2] || 'all').trim().toLowerCase();

const MATERIALS = Object.freeze({
  asphalt: 'public/assets/materials/asphalt-pbr/clean_asphalt_diff_2k.jpg',
  grass: 'public/assets/materials/grass/rocky_terrain_02_diff_2k.jpg',
  offroad: 'public/assets/materials/offroad/rocky_terrain_diff_2k.jpg',
  dirt: 'public/assets/materials/offroad/rocky_terrain_diff_2k.jpg',
  'dirt-road': 'public/assets/materials/dirt-road/road_damaged_2_diff_2k.jpg'
});

function quadPolygons(left, right) {
  const count = Math.min(left?.length || 0, right?.length || 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const l0 = left[i], r0 = right[i], l1 = left[j], r1 = right[j];
    if (!l0 || !r0 || !l1 || !r1) continue;
    out.push(`${l0[0]},${l0[1]} ${r0[0]},${r0[1]} ${r1[0]},${r1[1]} ${l1[0]},${l1[1]}`);
  }
  return out;
}

function svgPolys(polys, fill) {
  return polys.map((pts) => `<polygon points="${pts}" fill="${fill}"/>`).join('');
}

function normalizeSurface(value, fallback) {
  const v = String(value || fallback || '').trim().toLowerCase();
  if (v === 'road' || v === 'tarmac') return 'asphalt';
  if (v === 'soil' || v === 'earth') return 'dirt';
  if (v === 'off' || v === 'gravel') return 'offroad';
  return MATERIALS[v] ? v : fallback;
}

function surfacePlan(trackKey, meta) {
  const authored = meta?.meta || {};
  let trackSurface = normalizeSurface(authored.trackSurface || meta.surface || 'asphalt', 'asphalt');
  const shoulderSurface = normalizeSurface(authored.shoulderSurface || 'grass', 'grass');
  const outerSurface = normalizeSurface(authored.outerSurface || 'grass', 'grass');

  if (trackKey === 'offroad-raven-hollow') trackSurface = 'dirt-road';

  return { trackSurface, shoulderSurface, outerSurface };
}

async function textureData(surface) {
  const rel = MATERIALS[surface] || MATERIALS.grass;
  const abs = path.join(ROOT, rel);
  const input = await fs.readFile(abs);
  const meta = await sharp(input).metadata();
  const mime = meta.format === 'png' ? 'image/png' : meta.format === 'webp' ? 'image/webp' : 'image/jpeg';
  return {
    surface,
    rel,
    width: Math.max(1, Number(meta.width) || 1024),
    height: Math.max(1, Number(meta.height) || 1024),
    uri: `data:${mime};base64,${input.toString('base64')}`
  };
}

function pattern(id, tex, scale = 0.5) {
  const w = Math.max(64, Math.round(tex.width * scale));
  const h = Math.max(64, Math.round(tex.height * scale));
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}"><image href="${tex.uri}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/></pattern>`;
}

async function artisticSvg({ trackKey, worldW, worldH, geom, surfaces }) {
  const [roadTex, shoulderTex, outerTex] = await Promise.all([
    textureData(surfaces.trackSurface),
    textureData(surfaces.shoulderSurface),
    textureData(surfaces.outerSurface)
  ]);

  const roadQuads = quadPolygons(geom.left, geom.right);
  const shoulderQuads = quadPolygons(geom.grass?.left, geom.grass?.right);

  return `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${worldW}" height="${worldH}" viewBox="0 0 ${worldW} ${worldH}">
    <defs>
      ${pattern('outer', outerTex, 0.46)}
      ${pattern('shoulder', shoulderTex, 0.46)}
      ${pattern('road', roadTex, trackKey === 'offroad-raven-hollow' ? 0.42 : 0.50)}
    </defs>
    <rect width="${worldW}" height="${worldH}" fill="url(#outer)"/>
    ${svgPolys(shoulderQuads, 'url(#shoulder)')}
    ${svgPolys(roadQuads, 'url(#road)')}
  </svg>`;
}

async function listTrackKeys() {
  const entries = await fs.readdir(LIBRARY_DIR, { withFileTypes: true });
  const keys = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      await fs.access(path.join(LIBRARY_DIR, entry.name, 'track.json'));
      keys.push(entry.name);
    } catch {}
  }
  return keys.sort();
}

async function bakeTrack(trackKey) {
  const trackPath = path.join(LIBRARY_DIR, trackKey, 'track.json');
  const outDir = path.join(OUT_ROOT, trackKey);
  const raw = await fs.readFile(trackPath, 'utf8');
  const meta = JSON.parse(raw);
  const worldW = Math.ceil(Number(meta.worldW));
  const worldH = Math.ceil(Number(meta.worldH));
  if (!worldW || !worldH) throw new Error(`Invalid world dimensions in ${trackPath}`);

  console.log(`[track-beauty] starting ${trackKey} ${worldW}x${worldH}`);

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

  const surfaces = surfacePlan(trackKey, meta);
  await fs.mkdir(outDir, { recursive: true });
  const svg = Buffer.from(await artisticSvg({ trackKey, worldW, worldH, geom, surfaces }));
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
    version: 4,
    generator: 'scripts/bake-track-visual.mjs',
    style: 'world-space-materials-v1',
    trackKey,
    source: path.relative(ROOT, trackPath),
    worldW,
    worldH,
    preview: previewFile,
    surfaces,
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
  console.log(`[track-beauty] finished ${trackKey} ${worldW}x${worldH}; samples ${geom.center.length}; ${surfaces.trackSurface}/${surfaces.shoulderSurface}/${surfaces.outerSurface}`);
  return manifest;
}

async function writeCatalog(manifests) {
  const lines = [];
  lines.push('// AUTO-GENERATED by scripts/bake-track-visual.mjs. Do not edit by hand.');
  lines.push('export const GENERATED_TRACK_BEAUTY_LAYERS = Object.freeze({');
  for (const manifest of manifests) {
    const key = manifest.trackKey;
    lines.push(`  ${JSON.stringify(key)}: Object.freeze({`);
    lines.push('    useBeautyLayer: true,');
    lines.push(`    assetRevision: ${JSON.stringify(`bake-v${manifest.version}`)},`);
    lines.push('    assetsAvailable: true,');
    lines.push(`    worldW: ${manifest.worldW}, worldH: ${manifest.worldH}, depth: 9,`);
    lines.push('    replaces: Object.freeze({ asphalt:true, grass:true, offroad:true, kerbs:false, props:false }),');
    lines.push('    tiles: Object.freeze([');
    for (let i = 0; i < manifest.tiles.length; i++) {
      const t = manifest.tiles[i];
      lines.push(`      Object.freeze({ key:${JSON.stringify(`beauty-${key}-${i}`)}, path:${JSON.stringify(`assets/tracks/${key}/beauty/${t.file}`)}, x:${t.x}, y:${t.y}, w:${t.w}, h:${t.h} }),`);
    }
    lines.push('    ])');
    lines.push('  }),');
  }
  lines.push('});');
  lines.push('');
  await fs.writeFile(path.join(OUT_ROOT, 'trackBeautyLayers.generated.js'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const allKeys = await listTrackKeys();
  const keys = requested === 'all' ? allKeys : [requested];
  for (const key of keys) {
    if (!allKeys.includes(key)) throw new Error(`Unknown track key: ${key}`);
  }

  const manifests = [];
  for (const key of keys) manifests.push(await bakeTrack(key));

  await writeCatalog(manifests);
}

main().catch((error) => {
  console.error('[track-beauty] failed');
  console.error(error);
  process.exitCode = 1;
});
