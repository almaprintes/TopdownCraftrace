// DEV 1.2.179 — cohesive garage / circuit-selector visual treatment.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const css=read('src/game/ui/selectionPaddock.css');
const installer=read('src/game/ui/selectionPaddockSkin.js');
const garage=read('src/game/scenes/GarageSelectionCenterScene.js');
const track=read('src/game/scenes/TrackGarageAndroidTouchScene.js');
const garageDom=read('src/game/scenes/GarageLazyCardsScene.js');
const trackDom=read('src/game/scenes/TrackGarageProgressionScene.js');
const trackPlayer=read('src/game/scenes/TrackGaragePlayerLightScene.js');
const head=read('src/game/ui/TdrAppHeader.js');
for(const selector of ['#tdr-garage-player-dom','#tdr-track-selector-dom']){
 assert.ok(css.includes(selector),selector+' needs a scoped paddock look');
}
assert.match(css,/\.tdr-garage-dom-hero\{/);
assert.match(css,/\.tdr-ts-hero\{/);
assert.match(css,/clip-path:polygon\(/,'Cutaway sides remain open as in lobby');
assert.match(css,/\.tdr-garage-dom-cardzone:before\{/,'Garage stage glow present');
assert.match(css,/\.tdr-ts-preview svg\{/,'Hero track map remains legible');
assert.match(css,/@media\(max-height:450px\)/,'iPhone landscape protected');
assert.match(css,/@media\(max-width:780px\)/,'Narrow screens protected');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.doesNotMatch(css,/(?:#tdr-garage-player-dom|#tdr-track-selector-dom) button\{[^}]*pointer-events\s*:\s*none/s,
 'No global disabled buttons');
assert.match(installer,/import paddockCss from '\.\/selectionPaddock\.css\?inline'/);
assert.match(installer,/document\.head\.appendChild\(style\)/,'Skin wins cascade after inherited styles');
assert.match(garage,/ensureSelectionPaddockSkin\(\)/);
assert.match(track,/ensureSelectionPaddockSkin\(\)/);
assert.match(garageDom,/data-select/);
assert.match(garageDom,/this\._lockedCar\(selected\.id\)/);
assert.match(garageDom,/localStorage\.setItem\('tdr2:carId',selected\.id\)/);
assert.match(trackDom,/data-index/);
assert.match(trackDom,/\.tdr-ts-select/);
assert.match(trackPlayer,/isPublishedTrackId/);
assert.match(trackPlayer,/this\._lockedTrack\(track\)/);
assert.match(trackPlayer,/localStorage\.setItem\('tdr2:trackKey',key\)/);
assert.match(head,/createAppWallet/);

const mystery=read('src/game/ui/garageLockedVisuals.js');
assert.match(garageDom,/const src=locked\?null:skinPreview\(car\.id,spec\)/,'locked list must not load card artwork');
assert.match(garageDom,/tdr-garage-dom-lockthumb/,'locked rail shows ? instead of silhouettes');
assert.match(garageDom,/syncGarageHeroCardMedia\(zone,img,locked,locked\?null:skinPreview/,'no hero URL for locked cars');
assert.match(garageDom,/tdr-garage-dom-mystery-card/);
const lockedSection=garageDom.split('if(locked){')[1]?.split('}else{')[0]||'';
assert.ok(lockedSection.includes('tdr-garage-dom-title'),'locked detail shows mystery');
assert.ok(!lockedSection.includes('tdr-garage-dom-stats'),'locked detail hides all future values');
assert.match(mystery,/img\.removeAttribute\('src'\)/);
const {syncGarageHeroCardMedia}=await import('../src/game/ui/garageLockedVisuals.js');
const classes=new Set(),zone={classList:{toggle:(name,on)=>{on?classes.add(name):classes.delete(name);}}};
const img={hidden:true,alt:'',value:null,requests:0,getAttribute(k){return k==='src'?this.value:null;},removeAttribute(k){if(k==='src')this.value=null;},set src(v){this.value=v;this.requests++;}};
syncGarageHeroCardMedia(zone,img,true,null);
assert.equal(img.requests,0,'locked car must never request art');
assert.equal(img.value,null);
assert.ok(img.hidden&&classes.has('is-locked'));
syncGarageHeroCardMedia(zone,img,false,'assets/cars/runtime/unlocked.webp');
assert.equal(img.value,'assets/cars/runtime/unlocked.webp');
assert.equal(img.requests,1,'real card appears after unlocking');
assert.ok(!img.hidden&&!classes.has('is-locked'));
syncGarageHeroCardMedia(zone,img,true,null);
assert.equal(img.value,null,'stale unlocked image is removed when switching to mystery');
assert.ok(img.hidden);
assert.equal(img.requests,1);
assert.match(garageDom,/\.tdr-garage-dom-cardzone img\[hidden\]\{display:none!important\}/);

console.log('Garage and circuits: mystery cards hide art/stats, unlock restores art; touch controls and layouts preserved OK');
