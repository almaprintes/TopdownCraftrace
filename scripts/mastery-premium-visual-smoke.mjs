// Nine canonical mastery levels on centered roof shields,
// nine visually distinct 1/2/3-star shield ranks, sized to the painted cabin.
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
  assert.match(svg,/linearGradient id="mastery-star"/);
  assert.match(svg,/fill="url\(#mastery-star\)" stroke="#020a11" stroke-width="5"/,
    'All rank stars need their own metallic gradient and a dark separation stroke');
  assert.match(svg,/stop-color="#02070d"/,
    'The shield enamel stays deep charcoal regardless of tier');
  for(const key of ['starHighlight','starLight','starShadow'])
    assert.match(spec[key]||'',/^#[0-9a-f]{6}$/i,'Star finish missing: '+key);
  const channel=n=>n/255<=.04045?n/(255*12.92):((n/255+.055)/1.055)**2.4;
  const luminance=hex=>{
    const v=hex.slice(1);
    return .2126*channel(parseInt(v.slice(0,2),16))+
      .7152*channel(parseInt(v.slice(2,4),16))+
      .0722*channel(parseInt(v.slice(4,6),16));
  };
  assert.ok((luminance(spec.starLight)+.05)/(luminance('#0d2330')+.05)>7,
    'Stars must remain readable against dark enamel even in the bronze grade');
  assert.match(svg,/M64 6 L112 25 L108 72/,
    'Each mastery design must be a shield, not a wheel');
  assert.equal((svg.match(/data-mastery-star=/g)||[]).length,(i-1)%3+1,
    'Each metal must have obvious one, two or three central stars');
  assert.match(svg,/<polygon data-mastery-star="1" points="/,
    'At least one prominent championship star must be visible');
  if(i%3===0)assert.match(svg,/M42 35 L45 23/,'Grade III crown must be visible');
  if(i%3===2)assert.match(svg,/M31 47 L39 54/,'Grade II side wings must be visible');
  assert.doesNotMatch(svg,/<circle /,
    'No circular hub/disc/tyre motif remains');
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
assert.equal(tall.y,60+300*.46,'Crest moves upwards to the cabin, away from the bonnet');
assert.ok(tall.size>=tall.paintWidth*.57&&tall.size<=tall.paintWidth*.61,
  'Lobby shield stays within the painted roof without covering the windscreen');
const letterbox=lobbyMasteryPlacement({left:0,top:0,width:200,height:400},1000,500);
assert.equal(letterbox.paintWidth,200);
assert.equal(letterbox.paintHeight,100);
assert.equal(letterbox.y,(400-100)/2+100*.46);
assert.ok(letterbox.size>=57&&letterbox.size<=61,'Wide roof crests scale with the painted short axis');
assert.equal(lobbyMasteryPlacement({width:0,height:200},400,1000),null);
const vertical=raceMasteryPlacement(46,96);
assert.equal(vertical.x,0);assert.ok(vertical.y<0&&vertical.y>=-4,'Race crest sits toward front roof');
assert.ok(vertical.radius>=46*.31&&vertical.radius<=46*.32,
  'Race emblem is centered and smaller than the full roof width');
const horizontal=raceMasteryPlacement(96,46);
assert.equal(horizontal.x,0);assert.ok(horizontal.y<0,'Race crest stays forward of sprite midpoint');
assert.equal(horizontal.radius,vertical.radius,
  'Car orientation must not change the centred full-roof crest');
assert.ok(raceMasteryPlacement(20,80).radius>=6.2,
  'Badge remains legible on smaller cars');
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
assert.match(race,/g\.fillPoints\(shell,true\)/,
  'Race uses a fully filled championship shield');
assert.match(race,/for\(const item of starLayout\)/);
assert.match(race,/rank===1\?/);
assert.match(race,/g\.fillStyle\(0x07151e,1\)/,
  'In-race enamel is as dark as the lobby enamel');
assert.match(race,/g\.fillStyle\(0x02080d,1\);g\.fillPoints\(outline,true\)/,
  'In-race stars must have a dark silhouette halo');
assert.match(race,/const starBright=hexToInt\(visual\.starLight/,
  'Race stars use the same bright metallic palette as SVG');
assert.match(race,/g\.fillPoints\(star,true\)/,
  'Race paints 1, 2 or 3 distinct championship stars');
assert.doesNotMatch(race,/g\.fillCircle\(/,
  'No wheel-shaped circles in race crest');
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
assert.match(html,/content="DEV 1\.2\.\d+"/);
console.log('Mastery nine levels: bronze/silver/gold 1–2–3 bold star ranks, crowned third grade, smaller aligned roof shields, physics untouched OK');
