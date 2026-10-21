import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ghostPanelViewportRect} from '../src/game/ui/ghostPanelViewport.js';
import {CLOSED_CIRCUIT_VARIANTS} from '../src/game/tracks/trackReverseVariant.js';

const status=readFileSync('src/game/scenes/RaceStaticGhostStatusScene.js','utf8');
const original=readFileSync('src/game/scenes/RaceGhostModeScene.js','utf8');
const minimap=readFileSync('src/game/scenes/RaceStaticMinimapScene.js','utf8');
const directions=readFileSync('scripts/all-circuit-directions-smoke.mjs','utf8');
assert.match(status,/this\._tdrGameMode==='ghost'/,'Panel must be gated to ghost mode, not time attack');
assert.match(status,/document\.body\.appendChild\(root\)/,
  'Ghost controls must live outside transformed canvas parents');
assert.match(status,/this\._ghostControlsLayout\(\)/,'Use viewport UI geometry, never Phaser text coordinates');
assert.match(status,/ghostPanelViewportRect\(/,'DOM position is calculated from fixed viewport geometry');
assert.match(status,/super\._createGhostHud\(\)/,'Hide legacy Phaser controls on their actual creation');
assert.match(status,/this\._hideLegacyGhostHud\(\)/,'Do not leave the old zoom-sensitive Ghost buttons visible');
assert.ok(!status.includes('flattenScene(')&&!status.includes('isRecordLoadedLabel(')&&!status.includes('objectPoint('),
  'No string-matching or scene scans may control the panel');
assert.match(status,/_isGhostCurrentPersonalBest\(\)/,'Local replay record stays tied to active PB');
assert.match(status,/_onlineGhostChallenge/,'Online rival must remain independent');
assert.match(status,/_tdrGhostVisibilityIndex/,'Ghost visibility cycle must be preserved');
assert.match(status,/this\._replayActive/,'Replay must hide the normal panel');
assert.match(status,/this\.events\?\.off\?\.\('postupdate'/,
  'Clean up ghost scene postupdate listeners');
assert.match(status,/window\.removeEventListener\('tdr:viewportchange'/,
  'Clean up visual viewport listeners');
assert.match(original,/const GHOST_PREFIX='tdr2:ghost:'/);
assert.match(original,/this\._ghostTrackKey=data\?\.trackKey\|\|this\.trackKey/,
  'Ghost key must not collapse inverse variants to the physical base track');
assert.match(minimap,/const screenX = vw - FRAME_W \+ 18/,'Do not move the minimap layout');
assert.match(directions,/ghost isolation/,'Normal and reverse ghosts have isolated storage keys');

const inverses=CLOSED_CIRCUIT_VARIANTS.filter(v=>
  ['karting-tenerife','karting-americas','karting-canarias-4096','santa-cruz','circuito-atlantico'].includes(v.base));
assert.equal(inverses.length,5,'All five published inverse circuits are covered');

const layouts=[
 {vw:896,vh:414,x:794,controlWidth:184,topY:130},
 {vw:1200,vh:520,x:1098,controlWidth:184,topY:150}
];
for(const p of layouts){
  const canvasRect={left:17,top:32,width:p.vw*1.2,height:p.vh*1.2};
  const layout={x:p.x,controlWidth:p.controlWidth,topY:p.topY};
  const expected=ghostPanelViewportRect({canvasRect,viewportWidth:p.vw,viewportHeight:p.vh,
    ghostLayout:layout,panelWidth:282,panelHeight:90});
  assert.ok(expected&&expected.width>0&&expected.height>0);
  assert.ok(expected.left>=canvasRect.left&&expected.left+expected.width<=canvasRect.left+canvasRect.width,
    'Ghost buttons must remain on-screen');
  for(const track of inverses){
    for(const zoom of [.48,.62,.86,1.06,1.45]){
      // Changing the world zoom must never change the screen rectangle.
      const measured=ghostPanelViewportRect({canvasRect,viewportWidth:p.vw,viewportHeight:p.vh,
        ghostLayout:layout,panelWidth:282,panelHeight:90,worldZoom:zoom,trackKey:track.alternate});
      assert.deepEqual(measured,expected,'Inverse circuit ghost controls drift at zoom '+zoom+': '+track.alternate);
    }
  }
}
assert.equal(ghostPanelViewportRect({canvasRect:{width:0,height:5},viewportWidth:1,viewportHeight:1,
  ghostLayout:{x:1,controlWidth:1,topY:1},panelWidth:282,panelHeight:90}),null);
const version=readFileSync('index.html','utf8').match(/content="DEV 1\.2\.(\d+)"/);
assert.ok(Number(version?.[1])>=332,'Ghost zoom fix requires next DEV version');
console.log('PASS: Ghost static HUD is independent of camera zoom in five inverses, no legacy panel scan, fixed canvas-relative layout and cleanup');
