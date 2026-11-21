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
},{apexCommitment:.22,racecraftPreview:true});
assert.ok(baseline.valid);
const points=[[958.7044591835196,3028.6913447192965],[473.3582229277389,2300.1970447789217],[921.4511882978474,1748.0219784075573],[1465.2263073591866,1806.7027466515867],[1505.086315151928,444.9958035685489],[2173.9852891055625,780.9991482269222],[2022.7328528569028,1254.0422907669106],[1676.6774644201096,2832.241858807157],[1726.029260056513,3809.7890398863774],[1035.552220385101,3590.714171775334]];
const guides={version:1,points:points.map(([x,y],i)=>({
 id:'apex-'+(i+1),x,y,kind:'apex',direction:'forward',
 radiusPx:39.6,strength:.65
}))};
const invalid=buildGuidedTrackRacingLineModel(baseline,guides,null,track);
assert.equal(invalid.report.active,false);
assert.equal(invalid.model,baseline);
const {model,report}=buildGuidedTrackRacingLineModel(
 baseline,guides,track.trackShape,track,{carRadius:14,recoveryMargin:8});
console.log('REAL GUIDES Santa Cruz',JSON.stringify({
 source:track.meta?.sourceFile,modelPoints:baseline.offsets.length,...report
}));
assert.ok(report.active,'The user-authored guides must activate on photo Santa Cruz');
assert.ok(report.accepted>=5,'At least five visible real guide points should be useful');
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
assert.ok(director.includes('if(preview&&scene.track?.meta?.aiLineGuides?.points?.length)'));
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
console.log('PASS TrackStudio authored soft apex -> local Realizador G with physical boundary checks');
