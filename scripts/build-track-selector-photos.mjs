// Photo-led circuit selector. Reuse authentic assets already in the game,
// crop/color-tune them at build time into SMALL UI-only WebP images.
// The Americas source photo is unpacked by install-karting-americas-source.mjs
// before this script runs. Do not put 2MB+ full racing textures in DOM cards.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {TRACK_SELECTOR_PHOTO_PATHS} from '../src/game/tracks/trackSelectorPhotos.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const existingPhotoSources=Object.freeze({
  'circuito-atlantico':'assets/tracks/track01/beauty/track01-beauty-preview.webp',
  'santa-cruz':'assets/tracks/santa-cruz/beauty/santa-cruz-beauty-preview.webp',
  'karting-tenerife':'assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-preview.webp',
  'karting-canarias':'assets/tracks/karting-canarias/karting-canarias-new.webp',
  'karting-americas':'assets/tracks/karting-americas/karting-americas-official.webp',
  'rally-arafo-los-loros':'assets/tracks/rally-arafo-los-loros/arafo-los-loros-photo.webp'
});

export async function buildTrackSelectorPhotos(){
  const entries=Object.entries(TRACK_SELECTOR_PHOTO_PATHS);
  if(entries.length!==6)throw Error('Selector: unexpected published circuit count');
  for(const [id,destRel] of entries){
    const srcRel=existingPhotoSources[id];
    if(!srcRel)throw Error('Selector: no authentic source photo for '+id);
    const from=path.join(root,'public',srcRel);
    const dest=path.join(root,'public',destRel);
    if(!fs.existsSync(from))throw Error('Selector: missing existing circuit image '+from);
    const source=await sharp(from).metadata();
    if(!source.width||!source.height||source.width<300||source.height<250)
      throw Error('Selector: source image too small '+id);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    await sharp(from).rotate()
      .resize(900,600,{fit:'cover',position:sharp.strategy.attention,withoutEnlargement:false})
      .modulate({saturation:1.14,brightness:0.99})
      .sharpen({sigma:0.6})
      .webp({quality:77,effort:4}).toFile(dest);
    const info=await sharp(dest).metadata();
    if(info.width!==900||info.height!==600||info.format!=='webp')
      throw Error('Selector: thumbnail not ready '+id);
    if(fs.statSync(dest).size>700000)
      throw Error('Selector: excessive thumbnail size '+id);
    console.log('[track-selector] '+id+': original '+source.width+'x'+source.height+
      ' -> 900x600 ('+Math.ceil(fs.statSync(dest).size/1024)+'KiB)');
  }
  return entries.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await buildTrackSelectorPhotos();
