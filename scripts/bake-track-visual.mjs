import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildTrackRibbon } from '../src/game/tracks/TrackBuilder.js';
import { TRACK_BEAUTY_CONFIGS } from './track-beauty-config.mjs';

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
  'dirt-road': 'public/assets/materials/dirt-road/road_damaged_2_diff_2k.jpg',

  // Atlántico: frozen approved surfaces. Do not rebake it while working on another track.
  'atlantico-asphalt': Object.freeze({
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_02/asphalt_02_diff_2k.jpg',
    brightness: 0.96
  }),
  'atlantico-grass': Object.freeze({
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/sparse_grass/sparse_grass_diff_2k.jpg',
    brightness: 1.0
  }),
  'atlantico-dirt': Object.freeze({
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rocky_trail_02/rocky_trail_02_diff_2k.jpg',
    brightness: 0.78
  }),

  // Karting Tenerife: exact families supplied/approved by the user.
  // Source packs exist in 1K/2K/4K; the offline baker uses the 2K diffuse map
  // and publishes four compact WebP tiles, so runtime never loads the source packs.
  'tenerife-asphalt': Object.freeze({
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/clean_asphalt/clean_asphalt_diff_2k.jpg',
    brightness: 1.0
  }),
  'tenerife-grass': Object.freeze({
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/grass_medium_01/grass_medium_01_diff_2k.jpg',
    brightness: 1.0
  }),
  'tenerife-dirt': Object.freeze({
    source: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rocky_trail_02/rocky_trail_02_diff_2k.jpg',
    brightness: 0.78
  })
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
  if (trackKey === 'track01') {
    return {
      trackSurface: 'atlantico-asphalt',
      shoulderSurface: 'atlantico-grass',
      outerSurface: 'atlantico-dirt'
    };
  }
  if (trackKey === 'karting-tenerife') {
    return {
      trackSurface: 'tenerife-asphalt',
      shoulderSurface: 'tenerife-grass',
      outerSurface: 'tenerife-dirt'
    };
  }

  const authored = meta?.meta || {};
  let trackSurface = normalizeSurface(authored.trackSurface || meta.surface || 'asphalt', 'asphalt');
  const shoulderSurface = normalizeSurface(authored.shoulderSurface || 'grass', 'grass');
  const outerSurface = normalizeSurface(authored.outerSurface || 'grass', 'grass');
  if (trackKey === 'offroad-raven-hollow') trackSurface = 'dirt-road';
  return { trackSurface, shoulderSurface, outerSurface };
}

async function readMaterialInput(spec) {
  const cfg = typeof spec === 'string' ? { source: spec, brightness: 1 } : spec;
  const source = String(cfg?.source || '');
  if (!source) throw new Error('Material source is empty');

  let input;
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Could not fetch ${source}: HTTP ${response.status}`);
    input = Buffer.from(await response.arrayBuffer());
  } else {
    input = await fs.readFile(path.join(ROOT, source));
  }

  const brightness = Number(cfg?.brightness ?? 1);
  if (Number.isFinite(brightness) && Math.abs(brightness - 1) > 0.001) {
    input = await sharp(input).modulate({ brightness }).jpeg({ quality: 95 }).toBuffer();
  }
  return { input, source };
}

async function textureData(surface) {
  const spec = MATERIALS[surface] || MATERIALS.grass;
  const { input, source } = await readMaterialInput(spec);
  const meta = await sharp(input).metadata();
  const mime = meta.format === 'png' ? 'image/png' : meta.format === 'webp' ? 'image/webp' : 'image/jpeg';
  return {
    surface,
    rel: source,
    width: Math.max(1, Number(meta.width) || 1024),
    height: Math.max(1, Number(meta.height) || 1024),
    uri: `data:${mime};base64,${input.toString('base64')}`
  };
}

async function loadSurfaceTextures(surfaces) {
  const [roadTex, shoulderTex, outerTex] = await Promise.all([
    textureData(surfaces.trackSurface),
    textureData(surfaces.shoulderSurface),
    textureData(surfaces.outerSurface)
  ]);
  return { roadTex, shoulderTex, outerTex };
}

function physicalPatternScales(trackKey) {
  if (trackKey === 'track01') {
    // Existing frozen Atlántico calibration: ~205 / 1126 / 983 world px.
    return { road: 0.10, shoulder: 0.55, outer: 0.48 };
  }
  if (trackKey === 'karting-tenerife') {
    // First Karting Tenerife pass: ~225 px clean-asphalt repeat, ~574 px grass,
    // and exactly Atlántico's approved ~983 px dirt scale.
    return { road: 0.11, shoulder: 0.28, outer: 0.48 };
  }
  return {
    road: trackKey === 'offroad-raven-hollow' ? 0.42 : 0.50,
    shoulder: 0.46,
    outer: 0.46
  };
}

function pattern(id, tex, scale = 0.5) {
  const w = Math.max(32, Math.round(tex.width * scale));
  const h = Math.max(32, Math.round(tex.height * scale));
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}"><image href="${tex.uri}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/></pattern>`;
}

function artisticSvg({ trackKey, worldW, worldH, geom, textures, viewBox, outputW, outputH }) {
  const { roadTex, shoulderTex, outerTex } = textures;
  const roadQuads = quadPolygons(geom.left, geom.right);
  const shoulderQuads = quadPolygons(geom.grass?.left, geom.grass?.right);
  const vb = viewBox || { x: 0, y: 0, w: worldW, h: worldH };
  const rasterW = Math.max(1, Math.round(outputW || vb.w));
  const rasterH = Math.max(1, Math.round(outputH || vb.h));
  const scales = physicalPatternScales(trackKey);

  return `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${rasterW}" height="${rasterH}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">
    <defs>
      ${pattern('outer', outerTex, scales.outer)}
      ${pattern('shoulder', shoulderTex, scales.shoulder)}
      ${pattern('road', roadTex, scales.road)}
    </defs>
    <rect x="0" y="0" width="${worldW}" height="${worldH}" fill="url(#outer)"/>
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
  const textures = await loadSurfaceTextures(surfaces);
  await fs.mkdir(outDir, { recursive: true });

  const previewFile = `${trackKey}-beauty-preview.webp`;
  const previewW = Math.min(worldW, 1400);
  const previewH = Math.max(1, Math.round(worldH * previewW / worldW));
  const previewSvg = Buffer.from(artisticSvg({
    trackKey, worldW, worldH, geom, textures,
    viewBox: { x: 0, y: 0, w: worldW, h: worldH },
    outputW: previewW, outputH: previewH
  }));
  await sharp(previewSvg, { density: 72 }).webp({ quality: 88, effort: 4 }).toFile(path.join(outDir, previewFile));

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
    console.log(`[track-beauty] tile ${i + 1}/4 @ ${t.x},${t.y} ${t.w}x${t.h}`);
    const tileSvg = Buffer.from(artisticSvg({
      trackKey, worldW, worldH, geom, textures,
      viewBox: t,
      outputW: t.w, outputH: t.h
    }));
    await sharp(tileSvg, { density: 72 }).webp({ quality: 86, effort: 4 }).toFile(path.join(outDir, `${trackKey}-beauty-${i}.webp`));
  }

  const cfg = TRACK_BEAUTY_CONFIGS[trackKey] || null;
  const manifest = {
    version: 8,
    revision: cfg?.revision || `${trackKey}-beauty-v8`,
    generator: 'scripts/bake-track-visual.mjs',
    style: trackKey === 'track01'
      ? 'polyhaven-calibrated-four-tiles-v1'
      : trackKey === 'karting-tenerife'
        ? 'karting-tenerife-approved-three-surfaces-v1'
        : 'direct-svg-tiles-v2',
    trackKey,
    source: path.relative(ROOT, trackPath),
    worldW,
    worldH,
    depth: Number(cfg?.depth ?? 9),
    replaces: cfg?.replaces || { asphalt:true, grass:true, offroad:true, kerbs:false, props:false },
    preview: previewFile,
    surfaces,
    physicalPatternScales: physicalPatternScales(trackKey),
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
  console.log(`[track-beauty] finished ${trackKey} ${worldW}x${worldH}; ${surfaces.trackSurface}/${surfaces.shoulderSurface}/${surfaces.outerSurface}`);
  return manifest;
}

async function writeArtifactCatalog(manifests) {
  const lines = [];
  lines.push('// ARTIFACT-ONLY catalog generated by scripts/bake-track-visual.mjs.');
  lines.push('// Runtime catalog is rebuilt from all published manifests by build-track-beauty-catalog.mjs.');
  lines.push('export const GENERATED_TRACK_BEAUTY_LAYERS = Object.freeze({');
  for (const manifest of manifests) {
    const key = manifest.trackKey;
    lines.push(`  ${JSON.stringify(key)}: Object.freeze({`);
    lines.push('    useBeautyLayer: true,');
    lines.push(`    assetRevision: ${JSON.stringify(manifest.revision)},`);
    lines.push('    assetsAvailable: true,');
    lines.push(`    worldW: ${manifest.worldW}, worldH: ${manifest.worldH}, depth: ${manifest.depth},`);
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
  for (const key of keys) if (!allKeys.includes(key)) throw new Error(`Unknown track key: ${key}`);
  const manifests = [];
  for (const key of keys) manifests.push(await bakeTrack(key));
  await writeArtifactCatalog(manifests);
}

main().catch((error) => {
  console.error('[track-beauty] failed');
  console.error(error);
  process.exitCode = 1;
});