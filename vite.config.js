import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function readPackageName() {
  const p = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return pkg.name || 'app';
}

export default defineConfig(({ command, mode }) => {
  const isTdrProd = mode === 'tdr-prod';
  const define = {
    __TDR_PROD_BUILD__: JSON.stringify(isTdrProd)
  };

  // Local dev always serves from root.
  if (command === 'serve') return { base: '/', define };

  const repo = readPackageName();

  // Build base priority:
  // 1) Explicit BASE override.
  // 2) Vercel / Netlify: app is served from domain root.
  // 3) GitHub Pages: app is served from /<repo>/.
  const isRootHost = Boolean(process.env.VERCEL || process.env.NETLIFY);
  const base = process.env.BASE ?? (isRootHost ? '/' : `/${repo}/`);

  return {
    base,
    define,
    plugins: isTdrProd ? [{
      name: 'tdr-production-boundary',
      closeBundle() {
        fs.rmSync(path.resolve(process.cwd(), 'dist/tool'), { recursive: true, force: true });
      }
    }] : [],
    build: {
      target: 'es2020'
    }
  };
});
