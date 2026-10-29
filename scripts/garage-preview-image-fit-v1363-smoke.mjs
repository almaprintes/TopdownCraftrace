// DEV 1.3.63 - image loading and actual size constraints for iPhone Garage.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {carPreviewCandidates,attachCarPreviewFallback} from '../src/game/ui/carPreviewAssets.js';
import {carCardUrl} from '../src/game/cars/carCardArt.js';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
const read=p=>readFileSync(p,'utf8');
const ficha=read('src/game/ui/garageDetailPaddock.js');
const fichaCss=read('src/game/ui/garageDetailPaddock.css');
const garageCss=read('src/game/ui/adminGaragePaddock.css');
const helper=read('src/game/ui/carPreviewAssets.js');
const garage=read('src/game/ui/adminGaragePaddock.js');
const page=read('index.html');
assert.match(page,/name="tdr-dev-version" content="DEV 1\.3\.63"/);
assert.match(ficha,/officialArtSpec=CAR_SPECS\?\.\[carId\]\|\|spec/);
assert.match(ficha,/carCardUrl\(carId,officialArtSpec,base\)/);
assert.match(ficha,/src="\$\{safe\(imageCandidates\[0\]\|\|''\)\}"/,'Actual image src must be present in HTML');
assert.match(ficha,/attachCarPreviewFallback\(imageEl,imageCandidates/);
assert.match(ficha,/onLoad:\(\)=>\{/);
assert.match(ficha,/onExhausted:\(\)=>\{/);
assert.match(ficha,/removePreviewHandlers\(\)/);
assert.match(fichaCss,/\.vl-ficha \.vl-ficha-car \[data-ficha-image\]/);
assert.match(fichaCss,/position:absolute!important;inset:0!important/);
assert.match(fichaCss,/object-fit:contain!important/);
assert.match(garageCss,/\.tdr-garage-admin-paddock \.agp-thumb\{/);
assert.match(garageCss,/\.tdr-garage-admin-paddock \.agp-thumb img\{/);
assert.match(garageCss,/object-position:50% 44%/);
assert.match(garageCss,/overflow:hidden/);
assert.match(garageCss,/max-height:100%!important/);
assert.match(garage,/carCardUrl\(id,spec,BASE\)/);
assert.match(helper,/img\.getAttribute\?\.\('src'\)/,'Existing image source must survive cached loads');
assert.ok(CAR_SPECS.crown_equinox,'Canonical factory car exists');
const spec=CAR_SPECS.crown_equinox;
const prefix='/TopdownCraftrace/dev/';
const publishedCard=carCardUrl('crown_equinox',spec,prefix);
// cardCardUrl appends a browser cache-busting ?v=N; on-disk path excludes it.
const publishedFile=publishedCard.split('?')[0];
assert.ok(existsSync('public/'+publishedFile.slice(prefix.length)),'Published photo is in public');
assert.ok(existsSync('public/assets/cars/lobby/crown_equinox.webp'),'Lobby backup exists');
assert.ok(existsSync('public/assets/skins/skin_crown_equinox.webp'),'Skin backup exists');
const sources=[...new Set([publishedCard,...carPreviewCandidates('crown_equinox',spec,prefix)])];
assert.equal(sources[0],publishedCard,'Ficha must first use working Garage artwork');
assert.ok(sources.length>2);
const listeners={};
const img={
  src:sources[0],complete:true,naturalWidth:600,hidden:false,
  getAttribute(n){return n==='src'?this.src:null},
  addEventListener(n,fn){listeners[n]=fn},
  removeEventListener(n,fn){if(listeners[n]===fn)delete listeners[n]},
  removeAttribute(n){if(n==='src')this.src=''}
};
let loaded=0;
const stop=attachCarPreviewFallback(img,sources,{onLoad(){loaded++}});
assert.equal(img.src,sources[0],'Do not change cached first image');
assert.equal(loaded,1,'Cached image must be signaled ready immediately');
stop();
assert.equal(listeners.error,undefined);
let onFail=0;
const img2={...img,src:sources[0],complete:false,naturalWidth:0};
const events={};
img2.addEventListener=(n,fn)=>events[n]=fn;
img2.removeEventListener=(n,fn)=>{if(events[n]===fn)delete events[n]};
const stop2=attachCarPreviewFallback(img2,sources,{onExhausted(){onFail++}});
assert.equal(img2.src,sources[0]);
events.error();assert.equal(img2.src,sources[1]);
events.error();assert.equal(img2.src,sources[2]);
for(let i=2;i<sources.length;i++)events.error();
assert.equal(onFail,1);assert.equal(img2.hidden,true);
stop2();
for(const p of ['src/game/ui/garageDetailPaddock.js','src/game/ui/carPreviewAssets.js','src/game/ui/adminGaragePaddock.js']){
  const result=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
  assert.equal(result.status,0,'Syntax '+p+': '+result.stderr);
}
console.log('PASS Garage DEV 1.3.63: published art loads first, Safari cache/error handling, backups, gallery card sizing');
