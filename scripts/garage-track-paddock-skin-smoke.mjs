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
console.log('Garage and circuits: open lobby visual language, locked/unlocked, touch buttons, stats, wallets and iPhone landscape preserved OK');
