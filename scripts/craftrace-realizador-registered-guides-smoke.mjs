// Prevent a repeat of the iPhone 13:57 bug: Santa Cruz displayed
// B / SIN GUÍAS because RaceScene wraps the registered track in
// scene.track.meta and authored guides live in scene.track.meta.meta.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveDirectorGuideSource}
 from '../src/game/online/craftraceDirectorGuideSource.js';
import {buildTrackRacingLineModel}
 from '../src/game/ai/trackRacingLinePlanner.js';
import {buildGuidedTrackRacingLineModel}
 from '../src/game/ai/trackGuidedRacingLinePlanner.js';
import {buildBezierAiRacingLineModel} from '../src/game/ai/trackBezierAiRacingLinePlanner.js';
import {SANTA_CRUZ_AUTHOR_BEZIER} from '../src/game/online/craftraceSantaCruzAuthorBezier.js';
import {buildTrackSpeedProfile}
 from '../src/game/ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan}
 from '../src/game/ai/trackManeuverPlanner.js';

const official=JSON.parse(readFileSync(
 'src/game/tracks/library/santa-cruz/track.json','utf8'));
assert.equal(official.meta?.aiLineGuides?.points?.length,10);

// The ACTUAL RaceScene topology, rather than raw track.json.
const sceneTrack={meta:{...official,id:'santa-cruz',meta:{...official.meta}}};
const picked=resolveDirectorGuideSource(sceneTrack);
assert.equal(picked.source,'registered-circuit');
assert.equal(picked.guides.points.length,10);
assert.deepEqual(picked.guides,official.meta.aiLineGuides);
assert.equal(picked.shape,official.trackShape);
assert.deepEqual(picked.dimensions,
 {worldW:official.worldW,worldH:official.worldH});
assert.equal(picked.carScale,official.carScale??1);
assert.deepEqual(picked.bezier,SANTA_CRUZ_AUTHOR_BEZIER,
 'Paddock Realizador should load the 10 exact author-edited Bézier anchors');
assert.equal(picked.bezier.nodes.length,10);
assert.ok(picked.bezier.nodes.every(p=>
 p.x>0&&p.x<official.worldW&&p.y>0&&p.y<official.worldH));
const noOfficial={meta:{...sceneTrack.meta,worldW:1900,worldH:2900}};
assert.equal(resolveDirectorGuideSource(noOfficial).bezier,null,
 'Never project author Bézier into wrong photographic world dimensions');
const baseline=buildTrackRacingLineModel({
 raceCenterline:official.raceCenterline||official.centerline,
 trackWidth:official.trackWidth
},{apexCommitment:.22});
assert.ok(baseline.valid);
const authoredBezier=buildBezierAiRacingLineModel(
 baseline,picked.bezier,picked.shape,picked.dimensions,{carRadius:14});
console.log('[SANTA CRUZ BÉZIER ON OFFICIAL PHOTO]',JSON.stringify(authoredBezier.report));
assert.equal(authoredBezier.report.active,true,
 'The user-validated author Bézier must be safe on the official photo: '+
 JSON.stringify(authoredBezier.report));
assert.equal(authoredBezier.report.accepted,10);
assert.equal(authoredBezier.model.metrics.authoredBezier,true);
const result=buildGuidedTrackRacingLineModel(
 baseline,picked.guides,picked.shape,picked.dimensions,
 {carRadius:Math.max(8,Math.round(14*Number(picked.carScale||1)))});
assert.equal(result.report.active,true,
 'The registered Santa Cruz must offer G in the local Realizador');
assert.equal(result.report.accepted,9);
assert.equal(result.report.total,10);
assert.ok(result.report.changedSamples>100);
const profile=buildTrackManeuverPlan(buildTrackSpeedProfile(result.model,{
 maxSpeed:420,lateralAccel:2050,minCornerSpeed:80,maxYawRate:2.4,
 curvatureSmoothWindow:21,driveAccel:520,brakeDecel:720
}));
assert.equal(profile.valid,true,'G must have a valid physical speed plan');
assert.ok(profile.samples?.length>=12);

// TrackStudio preview uses the direct level and must continue working.
const studio=resolveDirectorGuideSource({meta:{
 ...official,aiLineGuides:official.meta.aiLineGuides,
 meta:{...official.meta,aiLineGuides:undefined}
}});
assert.equal(studio.source,'trackstudio');
assert.deepEqual(studio.guides,official.meta.aiLineGuides);
const empty=resolveDirectorGuideSource({meta:{...official,
 aiLineGuides:undefined,meta:{...official.meta,aiLineGuides:undefined}}});
assert.equal(empty.source,'none');
assert.equal(empty.guides,null);

const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
assert.ok(race.includes('this.track = {\n  meta: t01,'),
 'RaceScene wrapper changed; review guide source assumptions');
assert.ok(director.includes('const authored=resolveDirectorGuideSource(scene.track);'));
assert.ok(director.includes('if(preview){'),
 'Guide resolution must remain exclusive to the local Realizador');
console.log('PASS registered Santa Cruz -> actual RaceScene nesting -> 9/10 safe guides -> physical G ready');
