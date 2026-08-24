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

function edgePath(points) {
  if (!points?.length) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i][0]} ${points[i][1]}`;
  return `${d} Z`;
}

function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function turnAt(center, i, span = 5) {
  const n = center.length;
  const a = center[(i - span + n) % n];
  const b = center[i];
  const c = center[(i + span) % n];
  const a1 = Math.atan2(b.y - a.y, b.x - a.x);
  const a2 = Math.atan2(c.y - b.y, c.x - b.x);
  return Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
}

function premiumDetails(geom, worldW, worldH) {
  const rand = seeded(0x8a31c4d7);
  const center = geom.center || [];
  const patches = [];
  const dirtMarks = [];
  const grassVariation = [];
  const braking = [];

  for (let i = 0; i < 26; i++) {
    const x = rand() * worldW;
    const y = rand() * worldH;
    const rx = 70 + rand() * 210;
    const ry = 45 + rand() * 150;
    const rot = rand() * 180;
    const light = rand() > 0.52;
    grassVariation.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${light ? '#8da45a' : '#153a1c'}" opacity="${(0.035 + rand() * 0.045).toFixed(3)}"/>`);
  }

  for (let i = 0; i < 34; i++) {
    const x = rand() * worldW;
    const y = rand() * worldH;
    const rx = 35 + rand() * 130;
    const ry = 20 + rand() * 85;
    const rot = rand() * 180;
    dirtMarks.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${rand() > 0.5 ? '#4b4034' : '#9d8e75'}" opacity="${(0.035 + rand() * 0.055).toFixed(3)}"/>`);
  }

  for (let i = 80; i < center.length; i += 145) {
    const p = center[i];
    const next = center[(i + 16) % center.length];
    const angle = Math.atan2(next.y - p.y, next.x - p.x) * 180 / Math.PI;
    const len = 65 + rand() * 100;
    const wid = 10 + rand() * 18;
    patches.push(`<rect x="${(p.x - len * 0.5).toFixed(1)}" y="${(p.y - wid * 0.5).toFixed(1)}" width="${len.toFixed(1)}" height="${wid.toFixed(1)}" rx="${(3 + rand() * 7).toFixed(1)}" transform="rotate(${angle.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})" fill="#17191a" opacity="${(0.045 + rand() * 0.035).toFixed(3)}"/>`);
  }

  for (let i = 12; i < center.length; i += 6) {
    const turn = Math.abs(turnAt(center, i, 6));
    if (turn < 0.085) continue;
    const p = center[i];
    const prev = center[(i - 8 + center.length) % center.length];
    const angle = Math.atan2(p.y - prev.y, p.x - prev.x) * 180 / Math.PI;
    const len = Math.min(125, 50 + turn * 360);
    const opacity = Math.min(0.14, 0.045 + turn * 0.28);
    braking.push(`<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${len.toFixed(1)}" ry="${(8 + turn * 26).toFixed(1)}" transform="rotate(${angle.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})" fill="#060707" opacity="${opacity.toFixed(3)}"/>`);
  }

  return {
    patches: patches.join(''),
    dirtMarks: dirtMarks.join(''),
    grassVariation: grassVariation.join(''),
    braking: braking.join('')
  };
}

function surfaceSvg({ worldW, worldH, geom }) {
  const roadQuads = quadPolygons(geom.left, geom.right);
  const grassQuads = quadPolygons(geom.grass.left, geom.grass.right);
  const center = centerPath(geom.center);
  const leftEdge = edgePath(geom.left);
  const rightEdge = edgePath(geom.right);
  const details = premiumDetails(geom, worldW, worldH);

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${worldW}" height="${worldH}" viewBox="0 0 ${worldW} ${worldH}">
    <defs>
      <filter id="dirtNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.010" numOctaves="4" seed="13" result="large"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.19" numOctaves="2" seed="19" result="fine"/>
        <feBlend in="large" in2="fine" mode="multiply" result="mix"/>
        <feColorMatrix in="mix" type="saturate" values="0.12" result="ns"/>
        <feBlend in="SourceGraphic" in2="ns" mode="soft-light"/>
      </filter>
      <filter id="grassNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.030" numOctaves="4" seed="31" result="broad"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.22 0.55" numOctaves="2" seed="37" result="blade"/>
        <feBlend in="broad" in2="blade" mode="soft-light" result="mix"/>
        <feColorMatrix in="mix" type="matrix" values="0.14 0 0 0 0  0 0.30 0 0 0  0 0 0.12 0 0  0 0 0 .34 0" result="gn"/>
        <feBlend in="SourceGraphic" in2="gn" mode="overlay"/>
      </filter>
      <filter id="asphaltNoise" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="47" result="broad"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.32" numOctaves="2" seed="53" result="aggregate"/>
        <feBlend in="broad" in2="aggregate" mode="multiply" result="mix"/>
        <feColorMatrix in="mix" type="saturate" values="0" result="grey"/>
        <feComponentTransfer in="grey" result="soft"><feFuncA type="table" tableValues="0 0.16"/></feComponentTransfer>
        <feBlend in="SourceGraphic" in2="soft" mode="soft-light"/>
      </filter>
      <filter id="softBlur"><feGaussianBlur stdDeviation="8"/></filter>
      <clipPath id="grassClip">${polyLayer(grassQuads, '#fff')}</clipPath>
      <clipPath id="roadClip">${polyLayer(roadQuads, '#fff')}</clipPath>
      <linearGradient id="dirtTone" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#756d5f"/><stop offset="0.5" stop-color="#665e52"/><stop offset="1" stop-color="#827765"/>
      </linearGradient>
      <linearGradient id="grassTone" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#35572f"/><stop offset="0.40" stop-color="#46663a"/><stop offset="0.72" stop-color="#385832"/><stop offset="1" stop-color="#29492a"/>
      </linearGradient>
      <linearGradient id="asphaltTone" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="#37383a"/><stop offset="0.42" stop-color="#2b2c2e"/><stop offset="0.72" stop-color="#303134"/><stop offset="1" stop-color="#242527"/>
      </linearGradient>
    </defs>

    <rect width="${worldW}" height="${worldH}" fill="url(#dirtTone)" filter="url(#dirtNoise)"/>
    <g opacity="1">${details.dirtMarks}</g>

    <g clip-path="url(#grassClip)">
      <rect width="${worldW}" height="${worldH}" fill="url(#grassTone)" filter="url(#grassNoise)"/>
      ${details.grassVariation}
      <path d="${leftEdge}" fill="none" stroke="#b59c62" stroke-width="19" opacity="0.055" filter="url(#softBlur)"/>
      <path d="${rightEdge}" fill="none" stroke="#b59c62" stroke-width="19" opacity="0.055" filter="url(#softBlur)"/>
    </g>

    <g clip-path="url(#roadClip)">
      <rect width="${worldW}" height="${worldH}" fill="url(#asphaltTone)" filter="url(#asphaltNoise)"/>
      ${details.patches}
      <path d="${center}" fill="none" stroke="#070808" stroke-width="23" opacity="0.105" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${center}" fill="none" stroke="#050606" stroke-width="10" opacity="0.070" stroke-linecap="round" stroke-linejoin="round"/>
      ${details.braking}
      <path d="${center}" fill="none" stroke="#b7b0a3" stroke-width="2" opacity="0.020" stroke-dasharray="110 210"/>
    </g>

    <path d="${leftEdge}" fill="none" stroke="#d8d2c5" stroke-width="2.0" opacity="0.70" stroke-linejoin="round"/>
    <path d="${rightEdge}" fill="none" stroke="#d8d2c5" stroke-width="2.0" opacity="0.70" stroke-linejoin="round"/>
    <path d="${leftEdge}" fill="none" stroke="#332b23" stroke-width="5.5" opacity="0.16" stroke-linejoin="round"/>
    <path d="${rightEdge}" fill="none" stroke="#332b23" stroke-width="5.5" opacity="0.16" stroke-linejoin="round"/>
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
  await sharp(fullPngBuffer).webp({ quality: 92, effort: 5 }).toFile(path.join(outDir, previewFile));

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
      .webp({ quality: 90, effort: 5 })
      .toFile(path.join(outDir, `${trackKey}-beauty-${i}.webp`));
  }

  const manifest = {
    version: 2,
    generator: 'scripts/bake-track-visual.mjs',
    style: 'premium-material-pass-v2',
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
  console.log(`[track-beauty] style premium-material-pass-v2`);
  console.log(`[track-beauty] world ${worldW}x${worldH}; samples ${geom.center.length}`);
  console.log(`[track-beauty] output ${path.relative(ROOT, outDir)}`);
}

main().catch((error) => {
  console.error('[track-beauty] failed');
  console.error(error);
  process.exitCode = 1;
});
