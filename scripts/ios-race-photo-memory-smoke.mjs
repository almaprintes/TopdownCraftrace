// Regression for iPhone stutters after photo-native circuit rollout.
// Files on disk are compressed but each decoded texture consumes RGBA bytes.
// 0.65 x each dimension = ~42% GPU pixels without changing race geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  IOS_PHOTO_TILE_SCALE,useCompactIosPhotoTiles,compactIosPhotoTilePath,
  expectedCompactTileSize,photoTileWorldScale
} from '../src/game/performance/iosPhotoTileBudget.js';

assert.equal(IOS_PHOTO_TILE_SCALE,.65);
assert.equal(useCompactIosPhotoTiles('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'),true);
assert.equal(useCompactIosPhotoTiles('Mozilla/5.0 (iPad)'),false);
assert.equal(useCompactIosPhotoTiles('Mozilla/5.0 (Linux; Android)'),false);
assert.equal(compactIosPhotoTilePath('assets/tracks/santa-cruz/photo-0-0.webp'),
  'assets/tracks/santa-cruz/photo-0-0-ios.webp');
assert.equal(compactIosPhotoTilePath('not-webp'),null);
let originals=0,compactPixels=0,number=0;
const patterns={
  'karting-tenerife/beauty':/^karting-tenerife-trackstudio-[0-3]\.webp$/,
  'santa-cruz':/^photo-[0-9]+-[0-9]+\.webp$/,
  'karting-americas':/^photo-[0-9]+-[0-9]+\.webp$/,
  'karting-canarias':/^photo-[0-9]+-[0-9]+\.webp$/,
  'rally-arafo-los-loros':/^photo-[0-9]+-[0-9]+\.webp$/,
  'circuito-atlantico':/^photo-[0-9]+-[0-9]+\.webp$/,
  'siete-picos':/^photo-[0-9]+-[0-9]+\.webp$/
};
for(const [dir,pattern] of Object.entries(patterns)){
  const d='public/assets/tracks/'+dir;
  const files=fs.existsSync(d)?fs.readdirSync(d).filter(x=>pattern.test(x)):[];
  if(dir!=='circuito-atlantico')assert.ok(files.length>=4,'Missing native photo tiles: '+dir);
  for(const f of files){
    const origin=path.join(d,f);
    const compact=path.join(d,f.replace(/\.webp$/,'-ios.webp'));
    assert.ok(fs.existsSync(compact),'Missing iPhone tile '+compact);
    const a=await sharp(origin).metadata(),b=await sharp(compact).metadata();
    assert.deepEqual([b.width,b.height],expectedCompactTileSize(a.width,a.height));
    assert.equal(b.format,'webp');
    const scale=photoTileWorldScale(a.width,b.width);
    assert.ok(Math.abs(b.width*scale-a.width)<1e-10,'X world-space width must be preserved');
    assert.ok(Math.abs(b.height*photoTileWorldScale(a.height,b.height)-a.height)<1e-10);
    const px=a.width*a.height,small=b.width*b.height;
    originals+=px;compactPixels+=small;number++;
    assert.ok(small/px<.46,'iPhone texture should save at least 54% RGBA memory');
  }
}
assert.ok(number>=20,"Must cover all photo-native circuits including the new Atlántico");
assert.ok(compactPixels/originals<.46);
const loader=fs.readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
const base=fs.readFileSync('src/game/scenes/RaceScene.js','utf8');
const surfaces=fs.readFileSync('src/game/scenes/RaceRealSurfaceAssetsScene.js','utf8');
const installer=fs.readFileSync('scripts/install-karting-tenerife-source.mjs','utf8');
assert.match(loader,/useCompactIosPhotoTiles\(navigator\?\.userAgent/);
assert.match(loader,/compactIosPhotoTilePath\(path\)/);
assert.match(loader,/img\.src=root\+path/,'Always fall back to original photo tile if optional iOS variant is unavailable');
assert.match(loader,/tileScaleX:photoTileWorldScale\(w,img\.naturalWidth\)/);
assert.match(loader,/tileScaleY:photoTileWorldScale\(h,img\.naturalHeight\)/);
assert.match(loader,/const displayScaleX=worldScale\*tileScaleX,displayScaleY=worldScale\*tileScaleY/,'Keep X/Y alignment and Canarias x2.5 world scale');
assert.match(loader,/scene\.uiCam\?\.ignore\?\.\(sprite\)/);
assert.match(base,/if \(!imageNativeVisual\) \{[\s\S]*?this\.ensureBgTexture\(\)/,'Skip invisible procedural background generation');
assert.match(surfaces,/isImageNativeTrackMeta\(registered\)/);
assert.match(surfaces,/if\(photoNative\)\{[\s\S]*?return;/,'Skip unnecessary 2k material downloads');
assert.match(installer,/karting-tenerife-trackstudio-'\+i\+'\.webp'/,
  'Tenerife must load four existing 1672x941 tiles, not master');
console.log('iPhone native photo memory OK: '+number+' real tiles, '+Math.round(100*(1-compactPixels/originals))+'% fewer decoded pixels, exact world-space display, safe original fallback and no hidden material costs.');
