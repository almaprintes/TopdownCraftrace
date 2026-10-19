import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLEAN_LAP_MISSIONS_KEY,syncCleanLapMissionObjectives,beginCleanLapMissionSession,
 endCleanLapMissionSession,recordCleanLapMissionLap,cleanLapsByCarAndTrack,getCleanLapMissionProgress
} from '../src/game/seasons/cleanLapMissionTelemetry.js';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
const car='crown_cuper',track='karting-canarias-4096',second='karting-americas';
const event=(id,clean,session='s1',t=track,c=car,valid=true)=>recordCleanLapMissionLap(
 {eventId:id,sessionId:session,trackId:t,carId:c,clean,valid});
event('old',true,'prior'); // pre-existing stats: not mission progress
syncCleanLapMissionObjectives('mission:streak',{type:'cleanLaps',target:3,carId:car,trackId:track,consecutive:true});
const progress=(id='mission:streak',path='root')=>getCleanLapMissionProgress(id,path);
assert.equal(progress().value,0);
beginCleanLapMissionSession('s1');
event('1',true);event('2',true);event('2',true);
assert.equal(progress().value,2,'no duplicate event');
event('3',false);
assert.equal(progress().currentRun,0,'dirty lap resets live run');
event('4',true);event('5',false,'s1',track,car,false);
assert.equal(progress().currentRun,0,'rejected finish resets');
event('6',true);event('7',true);event('8',true);
assert.equal(progress().value,3,'target reached');
assert.equal(cleanLapsByCarAndTrack(car,track).clean,7,'car+track totals include pre-activation laps');
endCleanLapMissionSession('s1');
assert.equal(progress().currentRun,0,'exit breaks current streak');
assert.equal(progress().value,3,'best achieved streak is preserved');
syncCleanLapMissionObjectives('mission:next',{type:'cleanLaps',target:3,carId:car,trackId:track,consecutive:true});
beginCleanLapMissionSession('s2');
event('1',true,'s2',track,'helix_vortex');
event('2',true,'s2',second,car);
assert.equal(progress('mission:next').value,0,'wrong car or circuit never counts');
event('3',true,'s2');
beginCleanLapMissionSession('s3');
event('1',true,'s3');
assert.equal(progress('mission:next').value,1,'cannot join sessions for a streak');
syncCleanLapMissionObjectives('mission:sum',{type:'cleanLaps',target:3,carId:car,trackId:track});
beginCleanLapMissionSession('s4');
event('1',true,'s4');event('2',false,'s4');event('3',true,'s4');
endCleanLapMissionSession('s4');beginCleanLapMissionSession('s5');event('1',true,'s5');
assert.equal(progress('mission:sum').value,3,'cumulative works across sessions and dirty laps');
syncCleanLapMissionObjectives('mission:both',{type:'combined',parts:[
 {type:'cleanLaps',target:1,carId:car,trackId:track},
 {type:'cleanLaps',target:2,carId:car,trackId:second,consecutive:true}]});
beginCleanLapMissionSession('s6');
event('1',true,'s6',track);event('2',true,'s6',second);event('3',false,'s6',second);
event('4',true,'s6',second);event('5',true,'s6',second);
assert.equal(progress('mission:both','root.0').value,1);
assert.equal(progress('mission:both','root.1').value,2);
assert.ok(storage.has(CLEAN_LAP_MISSIONS_KEY));
const scene=readFileSync('src/game/scenes/RaceCleanLapScene.js','utf8'),race=readFileSync('src/game/scenes/RaceScene.js','utf8');
const seasons=readFileSync('src/game/events/raceEvents.js','utf8'),cloud=readFileSync('src/game/social/cloudProgress.js','utf8');
const cuper=readFileSync('src/game/seasons/cuperCampaign.js','utf8');
for(const word of ['beginCleanLapMissionSession','recordCleanLapMissionLap','endCleanLapMissionSession',"eventId:'rejected:'+n"])
 assert.ok(scene.includes(word),'Race should wire '+word);
assert.ok(race.includes('this._tdrRejectedLapCount=(this._tdrRejectedLapCount||0)+1'));
assert.ok(seasons.includes('syncCleanLapMissionObjectives(missionId,event.objective)'));
assert.ok(seasons.includes("rawObjectiveValue(p,d,missionId,path+'.'+i)"));
assert.ok(seasons.includes("syncCleanLapMissionObjectives(next?current.family+':'+next.id:null,next?.objective)"));
assert.ok(cloud.includes("'tdr2:cleanLapMissions:v1'"));
assert.equal((cuper.match(/"id": "cuper-/g)||[]).length,14,'original Cuper missions unchanged');
console.log('Clean lap mission tracker: car/track, accumulated, single-session streaks, dirty/invalid, no retroactive credit, cloud backup OK');
