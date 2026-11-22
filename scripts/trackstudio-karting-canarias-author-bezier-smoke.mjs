// Karting Canarias 4096: 14 authored apexes are a local Realizador candidate,
// not a publication of the road, LIVE 4 mode or lap records.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {KARTING_CANARIAS_AI_AUTHORING_ID,KARTING_CANARIAS_AI_SOURCE_SHA,
 KARTING_CANARIAS_AI_GUIDES,KARTING_CANARIAS_AI_BEZIER}
 from '../src/game/online/craftraceKartingCanariasAuthorBezier.js';
import {resolveDirectorGuideSource}
 from '../src/game/online/craftraceDirectorGuideSource.js';
import {normalizeAiBezierLine,sampleAiBezierLine}
 from '../src/game/studio/trackAiBezierLine.js';
import {normalizeAiLineGuides}
 from '../src/game/studio/trackAiLineGuides.js';
import {buildTrackRacingLineModel}
 from '../src/game/ai/trackRacingLinePlanner.js';
import {buildBezierAiRacingLineModel}
 from '../src/game/ai/trackBezierAiRacingLinePlanner.js';

assert.equal(KARTING_CANARIAS_AI_AUTHORING_ID,'karting-canarias-4096');
assert.equal(KARTING_CANARIAS_AI_GUIDES.points.length,14);
assert.equal(KARTING_CANARIAS_AI_BEZIER.nodes.length,14);
assert.ok(normalizeAiBezierLine(KARTING_CANARIAS_AI_BEZIER));
assert.equal(normalizeAiLineGuides(KARTING_CANARIAS_AI_GUIDES).points.length,14);
assert.equal(KARTING_CANARIAS_AI_BEZIER.nodes[6].handleOut.x,1840);
const originalSource=readFileSync('src/game/online/craftraceKartingCanariasAuthorBezier.js','utf8');
assert.ok(originalSource.includes('1898.2789 -> 1840'));
assert.ok(originalSource.includes('Never modify official track JSON'));
const runtime={
 id:KARTING_CANARIAS_AI_AUTHORING_ID,
 worldW:4096,worldH:6144,raceDirection:'forward',
 meta:{originalOwnerBundleSha256:KARTING_CANARIAS_AI_SOURCE_SHA}
};
const identified=resolveDirectorGuideSource({meta:runtime});
assert.equal(identified.source,'owner-director-candidate');
assert.equal(identified.guides.points.length,14);
assert.deepEqual(identified.bezier,KARTING_CANARIAS_AI_BEZIER);
for(const altered of [
 {...runtime,id:'karting-canarias'},
 {...runtime,worldW:2048},
 {...runtime,raceDirection:'reverse'},
 {...runtime,meta:{originalOwnerBundleSha256:'other'}}
]){
 assert.equal(resolveDirectorGuideSource({meta:altered}).bezier,null,
 'Never attach author's points to a different official track geometry');
}
const actualSource='src/game/tracks/library/karting-canarias-4096/track.json';
if(existsSync(actualSource)){
 const track=JSON.parse(readFileSync(actualSource,'utf8'));
 assert.equal(track.meta.originalOwnerBundleSha256,KARTING_CANARIAS_AI_SOURCE_SHA,
   'The source geometry must match owner bundle for authoring');
 const base=buildTrackRacingLineModel({
  raceCenterline:track.centerline,trackWidth:track.trackWidth
 },{apexCommitment:.22});
 assert.ok(base.valid);
 const result=buildBezierAiRacingLineModel(base,KARTING_CANARIAS_AI_BEZIER,
  track.trackShape,track,{carRadius:14});
 assert.equal(result.report.active,true,
  'Karting Canarias author teaching line must stay safe in official road: '+
  JSON.stringify(result.report));
 assert.equal(result.report.total,14);
 assert.equal(result.report.homologated,false);
 console.log('CANARIAS AI: exact official road, safe borders, correct direction and 14 authored nodes');
}else{
 // Some code-only checks do not unpack the owner's binary; still protect
 // metadata identity and require real geometry validation in the deploy build.
 assert.ok(sampleAiBezierLine(KARTING_CANARIAS_AI_BEZIER,30).length>=420);
 console.log('CANARIAS AI: isolated local author line checked; source track unavailable to this CI job');
}
const source=readFileSync('src/game/online/craftraceDirectorGuideSource.js','utf8');
assert.ok(source.includes("officialCanarias?KARTING_CANARIAS_AI_BEZIER:null"));
console.log('PASS DEV Karting Canarias independent author Bézier candidate, without production race changes');
