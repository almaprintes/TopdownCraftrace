import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clearImageNativeTrackOverlays,LOCAL_KARTING_PREVIEW_KEY }
  from '../src/game/tracks/localKartingPreview.js';
import { isImageNativeTrackScene } from '../src/game/tracks/imageNativeTrackIdentity.js';

let cleaned=0,markerCalled=0;
const fake=()=>({scene:true,destroy(){cleaned++;}});
const scene={
  trackKey:LOCAL_KARTING_PREVIEW_KEY,
  track:{id:LOCAL_KARTING_PREVIEW_KEY,
    meta:{localPreview:true,source:'trackstudio-image-native'}},
  _ktPaddock:[fake(),fake()], _ktStructures:[fake()],
  _ktDenseVegetation:[fake()],_circuitEnvironment:[fake()],
  _authoredEnvironmentObjects:[fake()],_authoredSurfaceZones:[{x:1}],
  _shoulderLeft:fake(),_shoulderRight:fake(),_curbOuter:fake(),
  _curbInner:fake(),_borderLeft:fake(),_borderRight:fake(),
  _iosStageAsphalt:fake(),finishGfx:fake(),cpGfx:fake(),
  finishLineDebug:fake(),startLineDebug:fake(),gridDebug:fake(),
  finishIntegratedGfx:fake(),cp1IntegratedGfx:fake(),cp2IntegratedGfx:fake(),
  _flashSectorMarker(){markerCalled++;},
  finishLine:{a:{x:100,y:100},b:{x:150,y:100}},
  checkpoints:{cp1:{a:{x:200,y:10},b:{x:250,y:10}}},
  _isOnTrack:()=>true,
  _ghostSamples:[{t:50}]
};
assert.equal(isImageNativeTrackScene(scene),true);
const originalGate=scene.finishLine,originalCheckpoints=scene.checkpoints;
const originalSurface=scene._isOnTrack,originalGhost=scene._ghostSamples;
clearImageNativeTrackOverlays(scene);
assert.equal(cleaned,21,'Remove 6 legacy sprites and 15 procedural graphics');
for(const name of [
  '_ktPaddock','_ktStructures','_ktDenseVegetation',
  '_circuitEnvironment','_authoredEnvironmentObjects','_authoredSurfaceZones'
])assert.deepEqual(scene[name],[],'Stale layer must be cleared: '+name);
for(const name of [
  '_shoulderLeft','_shoulderRight','_curbOuter','_curbInner',
  '_borderLeft','_borderRight','_iosStageAsphalt',
  'finishGfx','cpGfx','finishLineDebug','startLineDebug','gridDebug',
  'finishIntegratedGfx','cp1IntegratedGfx','cp2IntegratedGfx'
])assert.equal(scene[name],null,'Old painted track mark still alive: '+name);
scene._flashSectorMarker(1);
assert.equal(markerCalled,0,'Hidden sector graphics must not be recreated by flash');
assert.equal(scene.finishLine,originalGate,'Timing gate must remain intact');
assert.equal(scene.checkpoints,originalCheckpoints,'Sector timing gates must remain intact');
assert.equal(scene._isOnTrack,originalSurface,'Track/grass physics must remain intact');
assert.equal(scene._ghostSamples,originalGhost,'Ghost data must remain intact');

const styled=readFileSync('src/game/scenes/RaceStyledHudScene.js','utf8');
for(const required of [
  "const authoredImage = isImageNativeTrackScene(this)",
  "authoredImage ? null : drawFinish()",
  "authoredImage ? null : drawSector(this.checkpoints?.cp1",
  "authoredImage ? null : drawSector(this.checkpoints?.cp2"
])assert.ok(styled.includes(required),'Styled HUD must not generate duplicate paint: '+required);
assert.ok(styled.includes('this.raceInfoHudV2 = c'),
 'The competition HUD must still exist on native tracks');

const ghost=readFileSync('src/game/scenes/RaceGhostModeScene.js','utf8');
assert.ok(!ghost.includes('VER REPETICIÓN'),'Broken replay prompt not removed');
assert.ok(!ghost.includes('_ensureReplayEntryButton'),'Ghost HUD still generates replay prompt');
assert.ok(!ghost.includes("this._replayEntryBtn=this._makeReplayButton("));
assert.ok(ghost.includes("this._makeReplayButton(72"),'Other replay controls must remain');
assert.ok(ghost.includes('writeGhost(this._ghostStorageKey,saved)'),
 'PB ghost saving must remain functional');
assert.ok(ghost.includes('this._ghostSamples.push('),'Ghost samples must still be recorded');
const feedback=readFileSync('src/game/scenes/RaceCleanLapScene.js','utf8');
assert.ok(feedback.includes("eyebrow:'🏆 NUEVO RÉCORD'"),
 'New personal-best feedback must remain functional');
console.log('Image-native clean visuals + replay prompt removal: 21 graphics removed, timing/physics preserved, record and ghost workflows unaffected.');
