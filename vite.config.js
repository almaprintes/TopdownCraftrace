import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import {installKartingTenerife} from './scripts/install-karting-tenerife-source.mjs';

function readPackageName() {
  const p = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return pkg.name || 'app';
}

export default defineConfig(async ({ command, mode }) => {
  // Canonical .tdrtrack -> precise runtime JSON + original WebP + four GPU-safe tiles.
  await installKartingTenerife({withAssets:true});
  const isTdrProd = mode === 'tdr-prod';
  const define = {
    __TDR_PROD_BUILD__: JSON.stringify(isTdrProd)
  };

  // Local dev always serves from root.
  if (command === 'serve') return { base: '/', define, worker:{format:'es'} };

  const repo = readPackageName();

  // Build base priority:
  // 1) Explicit BASE override.
  // 2) Vercel / Netlify: app is served from domain root.
  // 3) GitHub Pages: app is served from /<repo>/.
  const isRootHost = Boolean(process.env.VERCEL || process.env.NETLIFY);
  const base = process.env.BASE ?? (isTdrProd ? './' : isRootHost ? '/' : `/${repo}/`);

  return {
    base,
    define,
    // libwebp Web Worker code-splits into SIMD/fallback codecs; IIFE cannot.
    worker:{format:'es'},
    plugins: isTdrProd ? [{
      name: 'tdr-production-boundary',
      transformIndexHtml(html) {
        // Portrait overlay is served by HTML before Phaser starts. Remove both
        // Spanish and English DEV notices at build time, not after first paint.
        const devNotices=/<div class="rot-beta"><div class="rot-beta-title">[\s\S]*?<\/div><div class="rot-beta-text">[\s\S]*?<\/div><\/div>/g;
        const count=[...html.matchAll(devNotices)].length;
        if(count!==2)throw new Error(`Expected 2 DEV orientation warnings to remove, found ${count}`);
        const releaseVersion=fs.readFileSync('android/app/build.gradle','utf8')
          .match(/production\s*\{[\s\S]*?versionName '([^']+)'/)?.[1];
        if(!releaseVersion)throw new Error('Missing production version');
        return html.replace(devNotices,'')
          .replace(/(<meta name="tdr-dev-version" content=")[^"]+/,`$1${releaseVersion}`);
      },
      closeBundle() {
        fs.rmSync(path.resolve(process.cwd(), 'dist/tool'), { recursive: true, force: true });
      }
    }] : [],
    build: {
      target: 'es2020'
    }
  };
});
