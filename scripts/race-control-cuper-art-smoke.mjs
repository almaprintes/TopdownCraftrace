// DEV 1.2.298: Cuper has skin WebP, not assets/cars/lobby/crown_cuper.webp.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {carVisualCandidates,applyCarVisual} from '../src/game/skins/carDisplayArt.js';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
import {equipCarSkin} from '../src/game/skins/carSkins.js';

const base='/TopdownCraftrace/dev/';
const oldLobby='public/assets/cars/lobby/crown_cuper.webp';
assert.equal(existsSync(oldLobby),false,'the original bug must not depend on inventing a lobby sprite');
for(const variant of ['original','gold'])
 assert.ok(existsSync('public/assets/skins/skin_crown_cuper_'+variant+'.webp'),'published '+variant+' sprite must exist');
const storageData=new Map();
const storage={getItem:k=>storageData.get(k)||null,setItem:(k,v)=>storageData.set(k,String(v))};
const id='crown_cuper',spec=CAR_SPECS[id];
let src=carVisualCandidates(id,spec,{base,storage,dev:true});
assert.equal(src[0],base+'assets/skins/skin_crown_cuper_original.webp');
assert.ok(src.every(x=>!x.includes('crown_cuper.webp')),'legacy missing file cannot be selected');
assert.equal(equipCarSkin(id,'gold',{storage,dev:true}).ok,true);
src=carVisualCandidates(id,spec,{base,storage,dev:true});
assert.equal(src[0],base+'assets/skins/skin_crown_cuper_gold.webp');
assert.equal(src.at(-1),base+'assets/skins/skin_crown_cuper_original.webp','Original is fallback');
const mock={style:{visibility:'hidden'},src:'',onerror:null};
applyCarVisual(mock,id,spec,{base,storage,dev:true});
assert.equal(mock.src,base+'assets/skins/skin_crown_cuper_gold.webp');
mock.onerror();
assert.equal(mock.src,base+'assets/cars/lobby/crown_cuper.webp','candidate fallback is attempted');
mock.onerror();
assert.equal(mock.src,base+'assets/skins/skin_crown_cuper_original.webp','final fallback keeps Original visible');
assert.equal(mock.style.visibility,'');
assert.equal(carVisualCandidates('helix_spark',CAR_SPECS.helix_spark,{base,storage,dev:true})[0],base+'assets/cars/lobby/helix_spark.webp');
const scene=readFileSync('src/game/scenes/StatsBroadcastScene.js','utf8');
assert.match(scene,/import \{ carVisualCandidates,applyCarVisual \} from '\.\.\/skins\/carDisplayArt\.js'/);
assert.match(scene,/carVisualCandidates\(id,CAR_SPECS\?\.\[id\],\{base:BASE,dev:!IS_PROD_BUILD\}\)/);
assert.doesNotMatch(scene,/const carSrc=id=>\x60\$\{BASE\}assets\/cars\/lobby\//);
assert.match(scene,/class="br-record-car" data-br-car-image="\$\{esc\(bestCar\)\}"/,'PB image uses shared resolver');
assert.match(scene,/class="br-online-car"><img data-br-car-image="\$\{esc\(r\.car_id\)\}"/,'online rows use shared resolver');
assert.match(scene,/body\.querySelectorAll\('\[data-br-car-image\]'\)\.forEach\(img=>/);
assert.match(scene,/applyCarVisual\(img,id,CAR_SPECS\?\.\[id\],\{base:BASE,dev:!IS_PROD_BUILD\}\)/);
for(const f of ['src/game/scenes/StatsBroadcastScene.js','src/game/skins/carDisplayArt.js'])
 execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
console.log('Race Control Cuper: Original/Gold visuals and image fallback in PB + online records OK');
