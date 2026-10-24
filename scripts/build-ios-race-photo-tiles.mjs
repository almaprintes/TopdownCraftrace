// iPhone/WebKit: keep all author/photo world coordinates unchanged while
// serving smaller decoded textures for the SIX native-photo race circuits.
// A WebP file's compressed size is NOT its GPU footprint: a 1536px tile
// expands to ~9MB of RGBA. At 65% dimensions it uses ~42% of the GPU memory.
//
// These are generated at build/predev time from the EXACT existing racing
// photos, not from the circuit selector preview and not from any new artwork.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {IOS_PHOTO_TILE_SCALE} from '../src/game/performance/iosPhotoTileBudget.js';
const root=path.resolve(import.meta.dirname,'..','public','assets','tracks');
const patterns=Object.freeze({
  'karting-tenerife/beauty':/^karting-tenerife-trackstudio-[0-3]\.webp$/,
  'santa-cruz':/^photo-[0-9]+-[0-9]+\.webp$/,
  'karting-americas':/^photo-[0-9]+-[0-9]+\.webp$/,
  'karting-canarias':/^photo-[0-9]+-[0-9]+\.webp$/,
  'karting-canarias-narrow70':/^photo-[0-9]+-[0-9]+\.webp$/,
  'karting-canarias-4096':/^photo-[0-9]+-[0-9]+\.webp$/,
  'rally-arafo-los-loros':/^photo-[0-9]+-[0-9]+\.webp$/,
  'circuito-atlantico':/^photo-[0-9]+-[0-9]+\.webp$/,
  'siete-picos':/^photo-[0-9]+-[0-9]+\.webp$/
});

export async function buildIosRacePhotoTiles(){
  let count=0;
  for(const [dir,pattern] of Object.entries(patterns)){
    const directory=path.join(root,dir);
    if(!fs.existsSync(directory))continue;
    const sources=fs.readdirSync(directory).filter(name=>pattern.test(name));
    for(const name of sources){
      const src=path.join(directory,name);
      const dest=path.join(directory,name.replace(/\.webp$/,'-ios.webp'));
      const meta=await sharp(src).metadata();
      if(meta.format!=='webp'||!meta.width||!meta.height||meta.width>2048||meta.height>2048)
        throw Error('iOS race tile source invalid: '+src);
      const w=Math.max(1,Math.round(meta.width*IOS_PHOTO_TILE_SCALE));
      const h=Math.max(1,Math.round(meta.height*IOS_PHOTO_TILE_SCALE));
      await sharp(src).resize(w,h,{fit:'fill',kernel:'lanczos3'})
        .webp({quality:78,effort:4}).toFile(dest);
      const result=await sharp(dest).metadata();
      if(result.format!=='webp'||result.width!==w||result.height!==h)
        throw Error('iOS race tile wrong output: '+dest);
      count++;
    }
  }
  console.log('[iOS photo memory] Generated '+count+' compact race tiles (65% edge, ~42% RGBA bytes per tile).');
  // Builds without owner's Atlántico source still generate all the
  // other official photo assets; Atlántico is optional until published.
  if(count<16)throw Error('iOS race photo tiles unexpectedly missing');
  return count;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename))
  await buildIosRacePhotoTiles();
