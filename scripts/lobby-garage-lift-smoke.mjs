import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {garageLiftFootprint,garageLiftMaskBounds,garageLiftApertureFrames,garageLiftSoftRadius,GARAGE_LIFT_DEPTH_STOPS,GARAGE_LIFT_TIMING,GARAGE_LIFT_DEPTH,GARAGE_LIFT_SWITCH,GARAGE_LIFT_RETURN_KEY,garageLiftEnabled,markGarageLiftReturn,consumeGarageLiftReturn} from '../src/game/ui/LobbyGarageLiftTransition.js';
const read=p=>readFileSync(p,'utf8');
assert.deepEqual(GARAGE_LIFT_TIMING,{down:1850,up:1900});
assert.deepEqual(GARAGE_LIFT_DEPTH,{platform:0,car:1,mastery:4});
assert.equal(GARAGE_LIFT_SWITCH,'tdr2:devGarageLift');
const on={getItem:()=>null},off={getItem:()=> 'off'};
assert.equal(garageLiftEnabled({prod:true,storage:on}),false,'public build unchanged');
assert.equal(garageLiftEnabled({prod:false,storage:on}),true);
assert.equal(garageLiftEnabled({prod:false,storage:off}),false,'local rollback switch');
const map=new Map();
const session={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
assert.equal(markGarageLiftReturn({prod:true,storage:session}),false);
assert.equal(markGarageLiftReturn({prod:false,storage:session}),true);
assert.equal(map.get(GARAGE_LIFT_RETURN_KEY),'rise');
assert.equal(consumeGarageLiftReturn({prod:false,storage:session}),true);
assert.equal(map.size,0,'consume exactly once');
assert.equal(consumeGarageLiftReturn({prod:false,storage:session}),false);
const box={left:200,top:100,width:430,height:400};
const measured=garageLiftFootprint(box,512,512,{left:.1,top:.1,width:.8,height:.8});
assert.deepEqual(measured,{left:255,top:140,width:320,height:320},'match transparent image artwork, not element box');
const fallback=garageLiftFootprint(box,512,512);
assert.equal(fallback.left,200+(430-430*.81)/2);
assert.equal(fallback.top,100+(400-400*.68)/2);
assert.equal(fallback.width,430*.81);
assert.equal(fallback.height,400*.68);
const maskBox=garageLiftMaskBounds({left:100,top:100,width:200,height:240},
 [{left:80,top:60,width:240,height:320},{left:170,top:110,width:60,height:280}]);
assert.equal(maskBox.width,maskBox.height,'radial Gaussian feather must use a square/circle');
assert.ok(maskBox.left<80&&maskBox.top<60,'mask overscans TOP/LEFT of the artwork');
assert.ok(maskBox.left+maskBox.width>320&&maskBox.top+maskBox.height>380,
 'mask overscans BOTTOM/RIGHT even with a non-square platform');
const narrow=garageLiftMaskBounds({left:100,top:100,width:200,height:240});
assert.equal(narrow.width,narrow.height);
assert.ok(narrow.width>=269,'mask includes margin around measured alpha footprint');
const close=garageLiftApertureFrames(true),open=garageLiftApertureFrames(false);
assert.deepEqual(close.map(p=>p.offset),[0,.2,.5,.8,1]);
assert.deepEqual(open.map(p=>p.offset),[0,.2,.5,.8,1]);
assert.equal(close[0].radius,145);
assert.equal(close.at(-1).radius,-45);
assert.equal(open[0].radius,-45);
assert.equal(open.at(-1).radius,145);
for(let i=0;i<close.length;i++){
 assert.ok(Math.abs(close[i].radius-open.at(-1-i).radius)<1e-9,'soft radial falloff reverses exactly');
 if(i)assert.ok(close[i].radius<close[i-1].radius,'radius closes smoothly from outside in');
}
assert.ok(garageLiftSoftRadius(.3,true)>garageLiftSoftRadius(.7,true));
assert.equal(garageLiftSoftRadius(-1,true),145);
assert.equal(garageLiftSoftRadius(2,true),-45);
assert.deepEqual(GARAGE_LIFT_DEPTH_STOPS.map(frame=>frame.offset),[0,.16,.30,.48,.68,.84,1],
 'shared depth timing uses perceptible early recession');
const early=GARAGE_LIFT_DEPTH_STOPS.find(frame=>frame.offset===.30);
const first=GARAGE_LIFT_DEPTH_STOPS[0],last=GARAGE_LIFT_DEPTH_STOPS.at(-1);
assert.ok(early.scale<.94,'the car and platform already recede in the first 30%');
assert.ok(early.brightness>.98,'the light remains almost unchanged during initial descent');
assert.ok((first.scale-early.scale)/(first.scale-last.scale)>.50,
 'more than half the size change precedes the strong shadow');
assert.ok(last.scale>=.86&&last.scale<=.89,'depth reduction stays subtle, not a zoom-out');
for(let i=1;i<GARAGE_LIFT_DEPTH_STOPS.length;i++){
 const prev=GARAGE_LIFT_DEPTH_STOPS[i-1],next=GARAGE_LIFT_DEPTH_STOPS[i];
 assert.ok(next.scale<=prev.scale,'stage cannot re-enlarge while descending');
 assert.ok(next.brightness<=prev.brightness,'light cannot increase as the lift sinks');
}
assert.ok(garageLiftSoftRadius(.30,true)>100,'the broad Gaussian feather remains outside at early shrink');
assert.ok(garageLiftSoftRadius(.48,true)<60,'the shadow starts covering after visible recession');
const source=read('src/game/ui/LobbyGarageLiftTransition.js');
for(const str of ['.tdr-lobby-car-platform',"[data-lobby-car]","[data-lobby-mastery]",
 'createFloorWell','copyAtPivot','anchoredPart','Promise.all(progress)',
 'scene._garageLiftBusy','root.appendChild(mask)',
 "visibility:'visible'","scene?.scene?.start?.('menu')",
 "scene?.scene?.start?.('GarageScene',{mode:'player'})",
 "root.classList.add('tdr-lobby-garage-lifting')"])assert.ok(source.includes(str),str);
assert.doesNotMatch(source,/document\.body\.appendChild/,'no screen-covering overlay');
assert.match(source,/tdr-lobby-garage-rim/,'rim occludes the edge of the descending turntable');
assert.match(source,/platformArtworkBounds\(platform\)/,'measure visible silhouette');
assert.match(source,/garageLiftFootprint\(pr,platform\.naturalWidth/,'use natural image metrics');
assert.match(source,/animateWait\(rim,rimFrames/,'rim uses the same animation duration');
assert.match(source,/rim\?\.remove\(\)/,'rim is always removed on cleanup');
assert.doesNotMatch(source,/214748|zIndex:\s*['"]999/,'native z-index required');
assert.doesNotMatch(source,/translate3d\(0,16px,0\)/,'no Y displacement in ortho view');
assert.ok(source.includes('platform:depthKeyframes,') && source.includes('car:depthKeyframes,') && source.includes('mastery:depthKeyframes'),
 'platform/car/mastery share EXACTLY the same transform and brightness timeline');
assert.ok(source.includes("const easing='linear'"),
 'depth keyframes and the Gaussian radius run on the same normalized clock');
assert.match(source,/tdr-lobby-garage-aperture/,'Gaussian mask exists above stage');
assert.ok(source.includes('garageLiftMaskBounds(footprint,[pr,car.getBoundingClientRect()'),
 'stage, car and mastery rectangles determine mask overscan');
assert.ok(!source.includes("clipPath:'ellipse(51%"),'remove old hard 51% ellipse crop');
assert.ok(source.includes('width:maskBounds.width') && source.includes('height:maskBounds.height'),
 'mask and Gaussian circle use same square bounds');
assert.ok(source.includes('animateSoftApertures('),'three synchronized soft masks instead of sharp clips');
assert.ok(source.includes('[platformLayer.mask,carLayer.mask,masteryLayer?.mask]'),'mask all car, platform and mastery layers together');
assert.ok(source.includes("setProperty('--tdr-garage-soft-radius'"),'per-frame radius interpolation even if CSS registered properties are unsupported');
assert.ok(!source.includes("clipPath:'ellipse(38%"),'hard shrinking iris has been removed');
assert.ok(source.includes('if(goingDown){'),'do not restore the garage platform before destination scene is ready');
const css=read('src/game/ui/lobby-dom.css');
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-garage-aperture/);
assert.match(css,/-webkit-mask-image:radial-gradient/,'iPhone / Safari WebKit soft mask');
assert.match(css,/mask-image:radial-gradient/,'standard CSS soft mask');
assert.ok(css.includes('rgba(0,0,0,.500)'),'wide Gaussian CDF midpoint');
assert.ok(css.includes('-webkit-mask-image:radial-gradient(circle farthest-side at 50% 50%'),
 'WebKit gradient must be circular');
assert.ok(css.includes('mask-image:radial-gradient(circle farthest-side at 50% 50%'),
 'standard gradient must be circular');
assert.ok(!css.slice(css.indexOf('/* DEV 1.2.210 —')).includes('ellipse farthest-side'),
 'do not stretch mask into oval on short/wide viewports');
assert.ok(css.includes('transparent calc(var(--tdr-garage-soft-radius) + 40%)'),'wide feathered transition, no hard edge');



assert.ok(source.includes('opacity:1,') && source.includes("filter:'brightness('+brightness"), 'shared stage/car/magenta mastery stay opaque while Gaussian shadow takes over');
for(const oldAlpha of ['opacity:.03','opacity:.34','opacity:.25'])assert.ok(!source.includes(oldAlpha),'old whole-stage opacity fade is absent');
assert.match(source,/liftFrames\(descendingFrames\.platform,goingDown\)/);
assert.match(source,/liftFrames\(descendingFrames\.car,goingDown\)/);
assert.match(source,/liftFrames\(descendingFrames\.mastery,goingDown\)/);
assert.match(source,/root\.appendChild\(rim\)/);
assert.match(source,/scene\?\.events\?\.once\?\.\('shutdown',cleanup\)/);
assert.match(source,/if\(attempts\+\+>35\)return restore\(\)/,'image failures must fall back');
const lobby=read('src/game/ui/LobbyDomUi.js'),polish=read('src/game/ui/LobbyPublishPolish.js');
assert.match(lobby,/lobby_background_topdown_garage\.webp/,'new cenital image is visible');
assert.doesNotMatch(lobby,/assets\/ui\/menu_bg\.webp/,'old DOM background is gone');
assert.match(read('src/game/ui/lobby-dom.css'),/tdr-lobby-garage-well::before/,'inset shaft wall');
assert.match(read('src/game/ui/lobby-dom.css'),/tdr-lobby-garage-well::after/,'deep floor');
assert.match(read('src/game/ui/lobby-dom.css'),/tdr-lobby-garage-rim/,'orthographic metallic rim');
assert.doesNotMatch(read('src/game/ui/lobby-dom.css'),/tdr-lobby-garage-lip/,'no old perspective lip overlay');
assert.match(lobby,/label:tr\('lobby\.garage'\),action:\(\)=>goToPlayerGarageWithLift\(scene\)/);
assert.match(polish,/makeCardButton\(car,t\('lobby\.openGarage'\),\(\)=>goToPlayerGarageWithLift\(scene\)\)/);
const garage=read('src/game/scenes/GarageLazyCardsScene.js');
assert.match(garage,/this\._garageReturnPending=false/);
assert.match(garage,/onBack:\(\)=>returnToLobbyFromGarage\(this\)/);
assert.match(garage,/data-select.*?returnToLobbyFromGarage\(this\)/s);
assert.match(garage,/data-back.*?returnToLobbyFromGarage\(this\)/s);
assert.match(garage,/this\._lockedCar\(selected\.id\)/);
const menu=read('src/game/scenes/MenuDomUiScene.js');
assert.match(menu,/polishLobbyForPublish\(this, lobbyRoot\);[\s\S]{0,240}beginGarageLiftRise\(this,lobbyRoot\)/);
assert.match(read('src/game/ui/LobbyRaceDeparture.js'),/turn:1600,hold:180,drive:520/,'approved departure unchanged');
assert.match(read('src/game/ui/lobby-dom.css'),/\.tdr-lobby-dom\.tdr-lobby-garage-lifting/);
assert.match(read('index.html'),/name="tdr-dev-version" content="DEV 1\.2\.\d+"/);
console.log('Garage lift: stage+car down/up in native lobby layers; all player garage navigation; one-shot return; rollback; no public change; race departure untouched');
