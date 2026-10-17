// Selector thumbnails: update only Tenerife and Santa Cruz to their latest
// official .tdrtrack photographs. Atlántico deliberately retains its previous
// selector art until the owner supplies his already-prepared new photograph.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {TRACK_SELECTOR_PHOTO_PATHS} from '../src/game/tracks/trackSelectorPhotos.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DEST_WIDTH=900,DEST_HEIGHT=600;
const fromPublic=p=>path.join(ROOT,'public',p);
const sources=Object.freeze({
  'circuito-atlantico':'assets/tracks/track01/beauty/track01-beauty-preview.webp',
  'santa-cruz':'assets/tracks/santa-cruz/santa-cruz-official.webp',
  'karting-tenerife':'assets/tracks/karting-tenerife/karting-tenerife-official.webp',
  'karting-canarias':'assets/tracks/karting-canarias/karting-canarias-new.webp',
  'karting-americas':'assets/tracks/karting-americas/karting-americas-official.webp',
  'rally-arafo-los-loros':'assets/tracks/rally-arafo-los-loros/arafo-los-loros-photo.webp'
});
async function photoThumbnail(input,{legacyAtlantico=false}={}){
  const md=await sharp(input).metadata();
  if(!md.width||!md.height||md.width<300||md.height<250)
    throw Error('Selector: source photo invalid: '+input);
  if(legacyAtlantico){
    // Preserve the exact selector processing used before this correction.
    return sharp(input).rotate()
      .resize(DEST_WIDTH,DEST_HEIGHT,{fit:'cover',position:sharp.strategy.attention})
      .modulate({saturation:1.14,brightness:.99})
      .sharpen({sigma:.6})
      .webp({quality:77,effort:4}).toBuffer();
  }
  return sharp(input).rotate()
    .resize(DEST_WIDTH,DEST_HEIGHT,{fit:'contain',background:'#07131d'})
    .modulate({saturation:1.15,brightness:.99})
    .sharpen({sigma:.6})
    .webp({quality:78,effort:4}).toBuffer();
}

export async function buildTrackSelectorPhotos(){
  const entries=Object.entries(TRACK_SELECTOR_PHOTO_PATHS);
  if(entries.length!==6)throw Error('Selector: unexpected published circuit count');
  for(const [id,destRel] of entries){
    const dest=fromPublic(destRel);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    const source=sources[id];
    if(!source)throw Error('Selector: image source missing for '+id);
    // Atlántico remains unchanged: its replacement image is coming from owner.
    const buffer=await photoThumbnail(fromPublic(source),{legacyAtlantico:id==='circuito-atlantico'});
    fs.writeFileSync(dest,buffer);
    const md=await sharp(buffer).metadata();
    if(md.format!=='webp'||md.width!==DEST_WIDTH||md.height!==DEST_HEIGHT)
      throw Error('Selector: bad image '+id);
    if(buffer.length>700000)throw Error('Selector: image too heavy '+id);
    console.log('[selector] '+id+' '+source+' -> '+
      DEST_WIDTH+'x'+DEST_HEIGHT+' '+Math.ceil(buffer.length/1024)+' KiB');
  }
  return entries.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await buildTrackSelectorPhotos();
