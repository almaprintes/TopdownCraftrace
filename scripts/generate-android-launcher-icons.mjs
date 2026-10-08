import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

// Use the actual approved Google Play launcher asset (steering wheel + flags).
// public/icons/icon-512.png is regenerated from a legacy TDR2 placeholder by
// scripts/generate-icons.mjs during the web build; never use it for Android.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(resolve(root,'assets/branding/tdr-play-store-icon.png'));
const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
for(const [density,size] of Object.entries(densities)){
  const dir=resolve(root,'android/app/src/main/res/mipmap-'+density);
  await mkdir(dir,{recursive:true});
  const base=await sharp(source).resize(size,size,{fit:'contain'}).png().toBuffer();
  await writeFile(resolve(dir,'ic_launcher.png'),base);
  await writeFile(resolve(dir,'ic_launcher_round.png'),base);
  const adaptive=Math.round(size*108/48);
  const inner=Math.round(adaptive*0.68);
  const foreground=await sharp(source).resize(inner,inner,{fit:'contain'}).png().toBuffer();
  const canvas=await sharp({create:{width:adaptive,height:adaptive,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:foreground,gravity:'centre'}]).png().toBuffer();
  await writeFile(resolve(dir,'ic_launcher_foreground.png'),canvas);
}
console.log('Android launcher icons generated from approved Google Play TDR wheel icon');
