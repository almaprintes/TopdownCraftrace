import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'assets/ui/orientation_portrait.png');
const OUTPUT=path.join(ROOT,'public/assets/ui/orientation_portrait_runtime.webp');
const MAX_WIDTH=1290;
const QUALITY=84;

await fs.mkdir(path.dirname(OUTPUT),{recursive:true});

const sourceStat=await fs.stat(SOURCE);
const meta=await sharp(SOURCE).metadata();
const targetWidth=Math.min(Number(meta.width||MAX_WIDTH),MAX_WIDTH);

const info=await sharp(SOURCE)
  .rotate()
  .resize({width:targetWidth,withoutEnlargement:true,fit:'inside'})
  .webp({quality:QUALITY,effort:6,smartSubsample:true})
  .toFile(OUTPUT);

const saving=sourceStat.size>0?100-(info.size/sourceStat.size*100):0;
console.log(`[orientation] master ${meta.width||'?'}x${meta.height||'?'} · ${sourceStat.size} bytes`);
console.log(`[orientation] runtime ${info.width}x${info.height} · ${info.size} bytes · WebP q${QUALITY}`);
console.log(`[orientation] saving ${saving.toFixed(1)}%`);
