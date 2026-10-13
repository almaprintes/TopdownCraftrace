// DEV 1.2.162 — nine canonical mastery levels, a unified metal medal,
// true painted-car roof alignment and nonintrusive race decal.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  masteryVisualSpec,masteryLevelForMeters,masteryWheelSvg,
  masteryWheelDataUri,masteryRoofVisible
} from '../src/game/stats/carMastery.js';
import {
  lobbyMasteryPlacement,raceMasteryPlacement
} from '../src/game/stats/masteryBadgePlacement.js';
const read=path=>readFileSync(path,'utf8');
const metas=[
  ['bronze',5],['bronze',8],['bronze',12],
  ['silver',5],['silver',8],['silver',12],
  ['gold',5],['gold',8],['gold',12]
];
for(let i=1;i<=9;i++){
  const spec=masteryVisualSpec(i);
  assert.equal(spec.material,metas[i-1][0],'Level '+i+' material must stay canonical');
  assert.equal(spec.spokes,metas[i-1][1],'Level '+i+' spoke count must stay canonical');
  const svg=masteryWheelSvg(i,{size:128,blackBackground:false});
  assert.match(svg,/viewBox="0 0 128 128"/);
  assert.match(svg,/linearGradient id="mastery-metal"/);
  assert.match(svg,/radialGradient id="mastery-enamel"/);
  assert.equal((svg.match(/<line /g)||[]).length,spec.spokes);
  assert.ok(svg.includes(spec.rim));
  assert.ok(masteryWheelDataUri(i,{size:128,blackBackground:false}).startsWith('data:image/svg+xml'));
}
const threshold=[25,100,250,500,750,1000,1500,2000,3000];
threshold.forEach((km,i)=>{
  assert.equal(masteryLevelForMeters(km*1000),i+1);
  assert.equal(masteryLevelForMeters(km*1000-1),i);
});
const sourceBounds={left:100,top:60,width:200,height:300};
const tall=lobbyMasteryPlacement(sourceBounds,400,1000);
assert.equal(tall.paintWidth,120);
assert.equal(tall.paintHeight,300);
assert.equal(tall.x,200,'Badge stays at true painted centre, not container edge');
assert.equal(tall.y,60+300*.57,'Badge moves toward the roof/rear rather than windscreen');
assert.ok(tall.size<=31&&tall.size>=15,'Emblem must never dominate the car');
const letterbox=lobbyMasteryPlacement({left:0,top:0,width:200,height:400},1000,500);
assert.equal(letterbox.paintWidth,200);
assert.equal(letterbox.paintHeight,100);
assert.equal(letterbox.y,(400-100)/2+100*.57);
assert.equal(lobbyMasteryPlacement({width:0,height:200},400,1000),null);
const vertical=raceMasteryPlacement(46,96);
assert.equal(vertical.x,0);assert.ok(vertical.y>0);
assert.ok(vertical.radius<7);
const horizontal=raceMasteryPlacement(96,46);
assert.ok(horizontal.x<0);assert.equal(horizontal.y,0);
assert.ok(horizontal.radius<7);
globalThis.localStorage={getItem:()=>JSON.stringify({video:{showMasteryBadge:false}})};
assert.equal(masteryRoofVisible(),false,'Hide on car must remain available');
globalThis.localStorage={getItem:()=>JSON.stringify({video:{showMasteryBadge:true}})};
assert.equal(masteryRoofVisible(),true);
const lobby=read('src/game/ui/LobbyPublishPolish.js');
const race=read('src/game/scenes/RaceMasteryRoofScene.js');
const stats=read('src/game/scenes/StatsMasteryScene.js');
const unlock=read('src/game/ui/MasteryUnlockModal.js');
const css=read('src/game/ui/mastery-premium.css');
assert.match(lobby,/lobbyMasteryPlacement\(cr,car\.naturalWidth,car\.naturalHeight\)/);
assert.match(lobby,/masteryWheelDataUri\(mastery\.level,\{size:128,blackBackground:false\}\)/);
assert.match(lobby,/if\(!visible\)\{badge\.hidden=true;badge\.removeAttribute\('src'\);/);
assert.match(lobby,/car\.addEventListener\('load',position\)/);
assert.match(lobby,/window\.addEventListener\('resize',position\)/);
assert.match(race,/raceMasteryPlacement\(w,h\)/);
assert.match(race,/g\.setPosition\(x,y\)/);
assert.match(race,/rig\.add\(g\);this\._masteryRoofWheel=g/);
assert.match(race,/this\.time\?\.delayedCall\?\.\(900/,
  'Re-align once after asynchronously loaded car textures');
assert.doesNotMatch(race,/this\.physics\.|carBody\.body/,
  'Mastery styling must not touch racing physics');
assert.match(stats,/masteryPremiumCss/);
assert.match(unlock,/premiumSkin\.textContent=masteryPremiumCss/);
assert.match(css,/\.sh-mastery-panel\{/);
assert.match(css,/\.tdr-mastery-unlock \.mu-card\{/);
const html=read('index.html');
assert.match(html,/content="DEV 1\.2\.162"/);
console.log('Mastery nine levels, metal rims, car-painted alignment, race decal, visibility and premium statistics OK');
