import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT=process.cwd();
const MANIFEST_PATH=path.join(ROOT,'assets/ui/orientation/manifest.json');

const manifest=JSON.parse(await fs.readFile(MANIFEST_PATH,'utf8'));
const activeKey=String(manifest.active||'').trim();
const variant=manifest.variants?.[activeKey];
if(!activeKey||!variant)throw new Error(`[orientation] unknown active variant: ${activeKey||'(empty)'}`);

const SOURCE=path.join(ROOT,String(variant.master||''));
const OUTPUT=path.join(ROOT,String(manifest.output||'public/assets/ui/orientation_active.webp'));
const MAX_WIDTH=Number(variant.maxWidth||manifest.defaults?.maxWidth||1290);
const QUALITY=Number(variant.quality||manifest.defaults?.quality||84);
const EFFORT=Number(variant.effort||manifest.defaults?.effort||6);

await fs.mkdir(path.dirname(OUTPUT),{recursive:true});

const sourceStat=await fs.stat(SOURCE);
const meta=await sharp(SOURCE).metadata();
const targetWidth=Math.min(Number(meta.width||MAX_WIDTH),MAX_WIDTH);

const info=await sharp(SOURCE)
  .rotate()
  .resize({width:targetWidth,withoutEnlargement:true,fit:'inside'})
  .webp({quality:QUALITY,effort:EFFORT,smartSubsample:true})
  .toFile(OUTPUT);

const saving=sourceStat.size>0?100-(info.size/sourceStat.size*100):0;
console.log(`[orientation] active ${activeKey} · ${variant.label||activeKey}`);
console.log(`[orientation] master ${meta.width||'?'}x${meta.height||'?'} · ${sourceStat.size} bytes · ${variant.master}`);
console.log(`[orientation] runtime ${info.width}x${info.height} · ${info.size} bytes · WebP q${QUALITY} · ${manifest.output}`);
console.log(`[orientation] saving ${saving.toFixed(1)}%`);
