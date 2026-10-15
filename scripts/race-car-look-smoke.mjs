import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RACE_CAR_LOOK,RACE_CAR_LOOK_SWITCH,raceCarLookEnabled,raceCarLookKey,raceCarLookTexture} from '../src/game/visual/raceCarLook.js';
const read=p=>readFileSync(p,'utf8');
assert.equal(RACE_CAR_LOOK.maxTextureEdge,320);
assert.equal(RACE_CAR_LOOK.prefilterEdge,640);
assert.ok(RACE_CAR_LOOK.microBlurPixels>0&&RACE_CAR_LOOK.microBlurPixels<=1);
assert.equal(RACE_CAR_LOOK_SWITCH,'tdr2:devRaceCarLook');
assert.equal(raceCarLookKey('car_crown_cuper_gold'),'car_crown_cuper_gold__raceSoft204');
const on={getItem:()=>null},off={getItem:()=> 'off'};
assert.equal(raceCarLookEnabled({prod:true,storage:on}),false);
assert.equal(raceCarLookEnabled({prod:false,storage:on}),true);
assert.equal(raceCarLookEnabled({prod:false,storage:off}),false);
let made=0,added=0,draws=0,filterSet=[];
const canvases=[];
const makeCanvas=()=>{
 const c={width:0,height:0,getContext:()=>({imageSmoothingEnabled:false,imageSmoothingQuality:'low',
  filter:'none',drawImage(...args){draws++;assert.equal(args.length,5);}})};
 made++;canvases.push(c);return c;
};
const src={naturalWidth:1448,naturalHeight:1086};
const tex={getSourceImage:()=>src};
const map=new Map([['car_crown_cuper',tex]]);
const scene={textures:{
 exists:key=>map.has(key),
 get:key=>map.get(key),
 addCanvas:(key,canvas)=>{
  added++;assert.ok(canvas.width<=320&&canvas.height<=320);
  const t={setFilter(mode){filterSet.push(mode);},source:[{setFilter(mode){filterSet.push(mode);}}]};
  map.set(key,t);return t;
 }}};
const preview=raceCarLookTexture(scene,'car_crown_cuper',{prod:false,storage:on,createCanvas:makeCanvas});
assert.equal(preview,'car_crown_cuper__raceSoft204');
assert.equal(added,1);assert.equal(made,2);assert.equal(draws,2);
assert.equal(canvases[0].width,0,'temporary downsample canvas freed');
assert.equal(canvases[0].height,0);
assert.equal(canvases[1].width,320);
assert.equal(canvases[1].height,240);
assert.deepEqual(filterSet,[1,1]);
assert.equal(raceCarLookTexture(scene,'car_crown_cuper',{prod:false,storage:on,createCanvas:makeCanvas}),preview,'cached race texture');
assert.equal(made,2,'one-time CPU work, no extra allocations on repeated requests');
assert.equal(raceCarLookTexture(scene,'car_crown_cuper',{prod:true,storage:on,createCanvas:makeCanvas}),'car_crown_cuper','production keeps original');
assert.equal(raceCarLookTexture(scene,'car_crown_cuper',{prod:false,storage:off,createCanvas:makeCanvas}),'car_crown_cuper','rollback keeps original');
assert.equal(raceCarLookTexture(scene,'missing',{prod:false,storage:on,createCanvas:makeCanvas}),'missing','missing texture safe');
const race=read('src/game/scenes/RaceScene.js');
assert.match(race,/raceCarLookTexture\(this,texKey,\{prod:IS_PROD_BUILD\}\)/);
assert.equal(race.match(/raceCarLookTexture\(this,texKey,\{prod:IS_PROD_BUILD\}\)/g).length,2,'cached and freshly loaded sprites');
assert.match(race,/this\.ensureCarSkinTexture\(aiSpec\)\.then/,'AI cars share the race-only render path');
const game=read('src/game/game.js');
assert.match(game,/const antialias=iosDevice\?false:/,'preserve iPhone thermal compromise');
assert.match(game,/render:\{pixelArt:false,antialias/,'do not change global renderer');
assert.match(read('src/game/ui/LobbyRaceDeparture.js'),/turn:1600,hold:180,drive:520/);
assert.match(read('src/game/ui/LobbyDomUi.js'),/data-lobby-car/);
assert.doesNotMatch(read('src/game/ui/LobbyDomUi.js'),/raceCarLookTexture/,'the lobby never uses softened race art');
assert.match(read('index.html'),/name="tdr-dev-version" content="DEV 1\.2\.\d+"/);
console.log('Race visual look: linear-filtered one-time 320px high-quality prefilter; DEV-only; zero per-frame FX; lobby, original files, physics, iOS framebuffer and 1.2.203 departure untouched');
