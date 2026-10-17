// Selector thumbnails from CURRENT racing assets only. The official Tenerife
// and Santa Cruz photographs are unpacked from their final .tdrtrack sources.
// Atlántico is a generated (not photographic) circuit: render its CURRENT
// track01 geometry over the game's own road/grass textures, never a stale
// /beauty/ preview or an invented satellite photograph.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {TRACK_SELECTOR_PHOTO_PATHS} from '../src/game/tracks/trackSelectorPhotos.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DEST_WIDTH=900,DEST_HEIGHT=600;
const fromPublic=p=>path.join(ROOT,'public',p);
const sources=Object.freeze({
  'santa-cruz':'assets/tracks/santa-cruz/santa-cruz-official.webp',
  'karting-tenerife':'assets/tracks/karting-tenerife/karting-tenerife-official.webp',
  'karting-canarias':'assets/tracks/karting-canarias/karting-canarias-new.webp',
  'karting-americas':'assets/tracks/karting-americas/karting-americas-official.webp',
  'rally-arafo-los-loros':'assets/tracks/rally-arafo-los-loros/arafo-los-loros-photo.webp'
});
const xmlEscape=v=>String(v).replace(/[<>&"']/g,ch=>({
  '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'
}[ch]));
function actualAtlanticoGeometry(){
  const file=path.join(ROOT,'src/game/tracks/library/track01/track.json');
  const track=JSON.parse(fs.readFileSync(file,'utf8'));
  const pts=track.centerline;
  if(pts?.length<20||track.worldW!==2430||track.worldH!==2000)
    throw Error('Selector Atlántico: current playable track geometry not found');
  return {track,pts};
}
async function renderAtlantico(){
  const {track,pts}=actualAtlanticoGeometry();
  const W=DEST_WIDTH,H=DEST_HEIGHT;
  const margin=24,zoom=Math.min((W-margin*2)/track.worldW,(H-margin*2)/track.worldH);
  const ox=(W-track.worldW*zoom)/2,oy=(H-track.worldH*zoom)/2;
  const point=p=>[+(ox+p.x*zoom).toFixed(2),+(oy+p.y*zoom).toFixed(2)];
  const d=pts.map((p,i)=>`${i?'L':'M'}${point(p).join(' ')}`).join(' ')+' Z';
  const roadW=(track.trackWidth||160)*zoom;
  const grass=fromPublic('assets/materials/grass/rocky_terrain_02_diff_2k.jpg');
  const asphalt=fromPublic('assets/materials/asphalt-pbr/aerial_asphalt_01_diff_1k.jpg');
  if(!fs.existsSync(grass)||!fs.existsSync(asphalt))
    throw Error('Selector Atlántico: missing active game materials');
  const bg=await sharp(grass).resize(W,H,{fit:'fill'}).modulate({saturation:1.35,brightness:.67}).png().toBuffer();
  const pavement=await sharp(asphalt).resize(W,H,{fit:'fill'}).modulate({brightness:.9}).png().toBuffer();
  // A source-derived road mask: the road is constructed from the CURRENT
  // centerline and its width, rather than outdated prebaked thumbnails.
  const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <path d="${xmlEscape(d)}" fill="none" stroke="#fff" stroke-width="${roadW}" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`);
  const texture=await sharp(pavement).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  const shadow=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><filter id="sh"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <path d="${xmlEscape(d)}" fill="none" stroke="#020a10" stroke-opacity=".76" stroke-width="${roadW+15}" stroke-linecap="round" stroke-linejoin="round" filter="url(#sh)"/>
    <path d="${xmlEscape(d)}" fill="none" stroke="#88938d" stroke-opacity=".80" stroke-width="${roadW+3}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`);
  const center=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <path d="${xmlEscape(d)}" fill="none" stroke="#040a0f" stroke-opacity=".21" stroke-width="3" stroke-linecap="round"/>
  </svg>`);
  return sharp(bg).composite([{input:shadow},{input:texture},{input:center}])
    .modulate({saturation:1.1}).sharpen({sigma:.7})
    .webp({quality:78,effort:4}).toBuffer();
}
async function photoThumbnail(input){
  const md=await sharp(input).metadata();
  if(!md.width||!md.height||md.width<300||md.height<250)
    throw Error('Selector: source photo invalid: '+input);
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
    const buffer=id==='circuito-atlantico'
      ?await renderAtlantico()
      :await photoThumbnail(fromPublic(source||'__missing__'));
    fs.writeFileSync(dest,buffer);
    const md=await sharp(buffer).metadata();
    if(md.format!=='webp'||md.width!==DEST_WIDTH||md.height!==DEST_HEIGHT)
      throw Error('Selector: bad image '+id);
    if(buffer.length>700000)throw Error('Selector: image too heavy '+id);
    console.log('[selector] '+id+' '+(source||'current playable geometry')+' -> '+
      DEST_WIDTH+'x'+DEST_HEIGHT+' '+Math.ceil(buffer.length/1024)+' KiB');
  }
  return entries.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await buildTrackSelectorPhotos();
