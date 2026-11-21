// Experimento puramente local: diez vértices exportados por TrackStudio
// para Santa Cruz, sin añadir el archivo/imagen privados al repositorio.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildGuidedTrackRacingLineModel}
 from '../src/game/ai/trackGuidedRacingLinePlanner.js';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';

const track=JSON.parse(readFileSync('src/game/tracks/library/santa-cruz/track.json','utf8'));
assert.equal(track.meta?.sourceFile,'Santa-Cruz-x3-nitido.tdrtrack',
 'Install the official Santa Cruz source before this test');
const centerline=track.raceCenterline||track.centerline;
const baseline=buildTrackRacingLineModel({
 raceCenterline:centerline,trackWidth:track.trackWidth
},{apexCommitment:.22});
assert.ok(baseline.valid);
const authored=JSON.parse(readFileSync('src/game/tracks/library/santa-cruz/source/santa-cruz-ai-line-guides.json','utf8'));
const guides=track.meta?.aiLineGuides;
assert.equal(guides?.points?.length,10,'The installed built-in Santa Cruz must expose all ten author tips');
assert.deepEqual(guides.points,authored.points,'No rounding or reauthoring of original user vertices');
assert.equal(track.meta?.aiGuideSource,'TrackStudio user-export 2026-11-21');

const invalid=buildGuidedTrackRacingLineModel(baseline,guides,null,track);
assert.equal(invalid.report.active,false);
assert.equal(invalid.model,baseline);
const {model,report}=buildGuidedTrackRacingLineModel(
 baseline,guides,track.trackShape,track,{carRadius:14,recoveryMargin:8});
console.log('REAL GUIDES Santa Cruz',JSON.stringify({
 source:track.meta?.sourceFile,modelPoints:baseline.offsets.length,...report
}));
assert.ok(report.active,'The user-authored guides must activate on photo Santa Cruz');
assert.equal(report.accepted,9,'Nine safe tips are expected; the tenth is too near the edge');
assert.ok(report.changedSamples>=5);
assert.equal(report.homologated,false);
assert.equal(model.racingLine.length,baseline.racingLine.length);
assert.ok(model.offsets.every((v,i)=>
 Number.isFinite(v)&&Math.abs(v)<=model.limits[i]+1e-7));
const mask=makeKartingShapeMask(track.trackShape,track.worldW,track.worldH);
let tested=0;
for(let i=0;i<model.offsets.length;i++){
 if(Math.abs(model.offsets[i]-baseline.offsets[i])<=.25)continue;
 const p=model.racingLine[i];
 assert.ok(mask.isOnTrack(p.x,p.y),'Guided sample outside asphalt: '+i);
 for(let k=0;k<12;k++){
  const a=Math.PI*k/6;
  assert.ok(mask.isOnTrack(p.x+22*Math.cos(a),p.y+22*Math.sin(a)),
   'Guided body/recovery margin outside asphalt: '+i);
 }
 tested++;
}
assert.ok(tested>=5);
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const preview=readFileSync('src/game/online/craftraceDirectorPreview.js','utf8');
const editor=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const ui=readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
assert.ok(director.includes('resolveDirectorGuideSource(scene.track)'));
assert.ok(director.includes("if(!this.preview||this.raceStarted"));
assert.ok(director.includes('this.previewGuidedProfile=guidedProfile'));
assert.ok(preview.includes("bots.previewGuidedProfile?'G':'B'"));
assert.ok(preview.includes("['A','B','G']"));
assert.ok(editor.includes("s._startGuidedAiPreview=async()=>"));
assert.ok(editor.includes("directorPreview:true"));
assert.ok(ui.includes('▶ PROBAR IA GUIADA'));
const room=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
assert.ok(!room.includes('previewGuidedProfile'),
 'The competitive race bridge must not activate the guided test');
console.log('PASS installed Santa Cruz author tips -> local Realizador G with physical boundary checks');
