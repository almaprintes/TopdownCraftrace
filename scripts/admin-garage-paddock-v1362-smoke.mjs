// DEV 1.3.63 · Admin Garage Paddock and Ficha image regression.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {carPreviewCandidates,attachCarPreviewFallback} from '../src/game/ui/carPreviewAssets.js';
import {carCardUrl} from '../src/game/cars/carCardArt.js';

const read=p=>readFileSync(p,'utf8');
const scene=read('src/game/scenes/GarageSelectionCenterScene.js');
const admin=read('src/game/ui/adminGaragePaddock.js');
const css=read('src/game/ui/adminGaragePaddock.css');
const ficha=read('src/game/ui/garageDetailPaddock.js');
const fichaCss=read('src/game/ui/garageDetailPaddock.css');
const helper=read('src/game/ui/carPreviewAssets.js');
const game=read('src/game/game.js');
const player=read('src/game/scenes/GarageLazyCardsScene.js');
const page=read('index.html');
assert.match(page,/name="tdr-dev-version" content="DEV 1\.3\.63"/);
assert.match(game,/GarageScene:\{load:\(\)=>import\('\.\/scenes\/GarageSelectionCenterScene\.js'\)/);
assert.match(scene,/if\(this\._mode==='admin'\)/);
assert.match(scene,/mountAdminGaragePaddock\(this\)/);
assert.match(scene,/showFirstVisitTutorial\('garage'/);
assert.match(scene,/this\._adminPaddockGarage\?\.cleanup\?\.\(\)/);
assert.match(scene,/_showDomHeroCard\(\.\.\.args\)/);
assert.match(scene,/_rebuild\(\.\.\.args\)/);
assert.match(player,/if\(this\._mode==='admin'\)\{/);
assert.match(player,/this\._installPlayerDomGarage\(\)/);
for(const x of ['data-agp-wallet','data-agp-hero','data-agp-list','data-agp-stats',
 'data-agp-action="edit"','data-agp-action="ficha"','data-agp-action="back"']){
 assert.ok(admin.includes(x),'Admin Garage lost '+x);
}
assert.match(admin,/scene\._activatePrimary\(\)/);
assert.match(admin,/scene\._activateSecondary\(\)/);
assert.match(admin,/scene\.scene\.start\('admin-hub'\)/);
assert.match(admin,/scene\._selectedIndex=index/);
assert.match(admin,/getEffectiveCarSpec\(id\)/);
assert.match(admin,/attainableTopSpeedKmh\(stats\)/);
assert.match(admin,/createAppWallet/);
assert.match(admin,/disposeAppWallets\(root\)/);
assert.match(admin,/legacyHeader\.style\.display='none'/);
assert.match(admin,/scene\.events\.once\('shutdown',cleanup\)/);
assert.match(css,/grid-template-columns:minmax\(210px,27%\) minmax\(200px,32%\) minmax\(0,1fr\)/);
assert.match(css,/env\(safe-area-inset-left/);
assert.match(css,/\.agp-list\{/);
assert.match(css,/overflow-y:auto/);
assert.match(css,/@media\(max-height:500px\)/);
assert.match(ficha,/carPreviewCandidates\(carId,spec/);
assert.match(ficha,/attachCarPreviewFallback\(imageEl,imageCandidates/);
assert.match(ficha,/removePreviewHandlers\(\)/);
assert.match(ficha,/onExhausted/);
assert.match(fichaCss,/\.vl-ficha-car\.has-image \.vl-ficha-fallback/);
assert.match(helper,/img\.addEventListener\('error',next\)/);
assert.match(helper,/img\.removeEventListener\('load',loaded\)/);
const carId='crown_equinox',spec={rarity:'Raro',collectionNo:6};
const base='/TopdownCraftrace/dev/';
const candidates=carPreviewCandidates(carId,spec,base);
assert.ok(candidates.length>=3);
assert.equal(candidates[0],base+'assets/cars/lobby/crown_equinox.webp');
assert.ok(candidates.includes(carCardUrl(carId,spec,base)));
assert.ok(existsSync('public/assets/cars/lobby/crown_equinox.webp'));
assert.ok(existsSync('public/assets/cars/runtime/card_crown_equinox_raro_006.webp'));
const listeners={};
const img={
 hidden:false,src:'',
 addEventListener(name,fn){listeners[name]=fn;},
 removeEventListener(name,fn){if(listeners[name]===fn)delete listeners[name];},
 removeAttribute(name){if(name==='src')this.src='';}
};
let loaded=0,exhausted=0;
const stop=attachCarPreviewFallback(img,candidates,{
 onLoad(){loaded++;},
 onExhausted(){exhausted++;}
});
assert.equal(img.src,candidates[0]);
listeners.error();assert.equal(img.src,candidates[1]);
listeners.error();assert.equal(img.src,candidates[2]);
listeners.load();assert.equal(loaded,1);
stop();assert.equal(listeners.load,undefined);assert.equal(listeners.error,undefined);
assert.equal(exhausted,0);
const img2={...img,hidden:false,src:''};
const handlers={};
img2.addEventListener=(name,fn)=>{handlers[name]=fn;};
img2.removeEventListener=(name,fn)=>{if(handlers[name]===fn)delete handlers[name];};
attachCarPreviewFallback(img2,['bad1','bad2'],{onExhausted(){exhausted++;}});
handlers.error();handlers.error();
assert.equal(exhausted,1);assert.equal(img2.hidden,true);
for(const p of ['src/game/scenes/GarageSelectionCenterScene.js',
 'src/game/ui/adminGaragePaddock.js','src/game/ui/carPreviewAssets.js',
 'src/game/ui/garageDetailPaddock.js']){
 const out=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
 assert.equal(out.status,0,p+' failed syntax: '+out.stderr);
}
console.log('PASS DEV 1.3.63: admin paddock garage actions + source art, Ficha fallback chain and cleanup, player mode isolation, iPhone layout');
