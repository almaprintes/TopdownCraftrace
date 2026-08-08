import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function readPackageName() {
  const p = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return pkg.name || 'app';
}

export default defineConfig(({ command }) => {
  // Local dev always serves from root.
  if (command === 'serve') return { base: '/' };

  const repo = readPackageName();

  // Build base priority:
  // 1) Explicit BASE override.
  // 2) Vercel / Netlify: app is served from domain root.
  // 3) GitHub Pages: app is served from /<repo>/.
  const isRootHost = Boolean(process.env.VERCEL || process.env.NETLIFY);
  const base = process.env.BASE ?? (isRootHost ? '/' : `/${repo}/`);

  return {
    base,
    build: {
      target: 'es2020'
    }
  };
});
