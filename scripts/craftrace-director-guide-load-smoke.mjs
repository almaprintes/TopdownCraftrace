// A visible load button must correspond to an ACTUALLY usable G pilot profile,
// not just a saved Bézier or a hidden checkbox in the online lobby.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildBezierAiRacingLineModel} from '../src/game/ai/trackBezierAiRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../src/game/ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan} from '../src/game/ai/trackManeuverPlanner.js';
import {resolveDirectorGuideSource} from '../src/game/online/craftraceDirectorGuideSource.js';
const source=readFileSync('src/game/online/craftraceDirectorPreview.js','utf8');
const style=readFileSync('src/game/ui/craftraceDirectorPreview.css','utf8');
const online=readFileSync('src/game/online/craftraceLive4GuidedGExperiment.js','utf8');
for(const required of [
 'data-load-guide','data-guide-status','CARGAR BÉZIER + GUÍAS',
 'loadGuideButton.disabled=!guideReady','bots.previewBezierActive&&bots.previewGuidedProfile',
 "if(guideReady)selectMode('G')","bots.previewMode==='G'&&bots.previewBezierActive",
 'authoredGuidePoints',
])assert.ok(source.includes(required),'Realizador must expose '+required);
assert.ok(style.includes('.crdir-guide-picker'));
assert.ok(online.includes("trackId==='santa-cruz'"),
 'No accidental LIVE 4 expansion to Karting Canarias');
const path='src/game/tracks/library/karting-canarias-4096/track.json';
if(existsSync(path)){
 const track=JSON.parse(readFileSync(path,'utf8'));
 const runtime={...track,id:'karting-canarias-4096',key:'karting-canarias-4096'};
 const guide=resolveDirectorGuideSource({meta:runtime});
 assert.equal(guide.guides?.points?.length,14);
 assert.equal(guide.bezier?.nodes?.length,14);
 const baseline=buildTrackRacingLineModel({
  raceCenterline:runtime.raceCenterline||runtime.centerline,
  trackWidth:runtime.trackWidth
 },{apexCommitment:.22});
 assert.ok(baseline.valid);
 const validated=buildBezierAiRacingLineModel(baseline,guide.bezier,guide.shape,
   guide.dimensions,{carRadius:14});
 assert.equal(validated.report.active,true,'Safety check failed: '+JSON.stringify(validated.report));
 const physical=buildTrackManeuverPlan(buildTrackSpeedProfile(validated.model,{
  maxSpeed:420,lateralAccel:2050,minCornerSpeed:80,maxYawRate:2.4,
  curvatureSmoothWindow:21,driveAccel:520,brakeDecel:720
 }));
 assert.ok(physical.valid,'Realizador expert cannot drive saved Bézier');
 assert.ok(physical.samples?.length>=12);
 console.log('PASS: Karting Canarias G Bézier has safe route and real speed/steering plan.');
}else console.log('Source not installed: UI contract checked; Pages checks after photo install.');
console.log('PASS: explicit local Realizador load button; LIVE 4 Santa Cruz-only untouched.');
