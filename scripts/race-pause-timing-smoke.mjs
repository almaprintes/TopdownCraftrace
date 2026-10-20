import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beginRacePauseClock,resumeRacePauseClock} from '../src/game/ui/racePauseTiming.js';

const makeScene=()=>({
  timing:{started:true,lapStart:1000,s1:8000,s2:15000},
  _tdrSessionLapClockStart:1000,
  _ghostLapStartPerf:1000,
  _tdrPauseTimingStartedAt:NaN,
  _cpState:2,
  lapCount:3,
  ttHistory:[{lapMs:34833}]
});

const scene=makeScene();
const beforeElapsed=30000-scene.timing.lapStart;
assert.equal(beginRacePauseClock(scene,30000),true);
assert.equal(beginRacePauseClock(scene,47000),false,'rebuilt capture menu must not restart the pause');
assert.equal(resumeRacePauseClock(scene,120000),90000,'long pause excluded once');
assert.equal(scene.timing.lapStart,91000);
assert.equal(scene._tdrSessionLapClockStart,91000);
assert.equal(scene._ghostLapStartPerf,91000);
assert.equal(120000-scene.timing.lapStart,beforeElapsed,'same race lap elapsed on resume');
assert.equal(scene.timing.s1,8000,'captured sector offsets stay unchanged');
assert.equal(scene.timing.s2,15000);
assert.equal(scene._cpState,2,'pause cannot reset checkpoints');
assert.equal(scene.lapCount,3,'pause cannot change lap number');
assert.equal(scene.ttHistory.length,1,'pause cannot write a ghost lap');
assert.equal(resumeRacePauseClock(scene,121000),0,'duplicate CONTINUAR must not adjust clocks twice');
assert.equal(scene.timing.lapStart,91000);

assert.equal(beginRacePauseClock(scene,123000),true);
assert.equal(resumeRacePauseClock(scene,128000),5000);
assert.equal(scene.timing.lapStart,96000);
assert.equal(scene._tdrSessionLapClockStart,96000);
assert.equal(scene._ghostLapStartPerf,96000);

const beforeStart={timing:{started:false,lapStart:null},_tdrSessionLapClockStart:NaN,_ghostLapStartPerf:null};
assert.equal(beginRacePauseClock(beforeStart,0),true);
assert.equal(resumeRacePauseClock(beforeStart,180000),180000);
assert.equal(beforeStart.timing.lapStart,null,'pre-start pause must not invent a lap');
assert.ok(Number.isNaN(beforeStart._tdrSessionLapClockStart));
assert.equal(beforeStart._ghostLapStartPerf,null);
assert.equal(beginRacePauseClock(beforeStart,200000),true,'new pause works after a previous resume');

const experience=readFileSync('src/game/scenes/RaceExperienceScene.js','utf8');
const liveDelta=readFileSync('src/game/ui/liveDeltaReferenceRuntime.js','utf8');
assert.match(experience,/beginRacePauseClock\(this\)/,'shipping pause captures start');
assert.match(experience,/resumeRacePauseClock\(this\)/,'shipping pause excludes wall time on continue');
assert.match(experience,/this\._tdrPauseTimingStartedAt=NaN/,'fresh race resets paused time');
assert.match(liveDelta,/this\._tdrPauseMenuOpen\|\|this\._pauseMenuOpen/,'live delta must freeze during either pause overlay');
assert.doesNotMatch(liveDelta,/const startedAt=Number\(this\._tdrPauseTimingStartedAt\)/,'avoid duplicate DELTA correction in wrapper');
console.log('PASS: 90-second pause and multiple pauses/capture rebuilds exclude wall time once from lap, DELTA and ghost while checkpoints and records remain intact.');
