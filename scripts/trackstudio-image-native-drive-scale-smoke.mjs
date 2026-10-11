import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  spawnUpstreamOfFinish,imageNativeDrivingProfile
} from '../src/game/tracks/imageNativeDriving.js';
import {makeKartingPreviewRecord} from '../src/game/tracks/localKartingPreview.js';

// Repro fixture from the user's approved Karting Tenerife. The original start
// sits ~209px BEFORE the line and the painted finish crosses at x=1361,y=456.
const authored=[
  [1335,664],[1336,656],[1337,646],[1339,634],[1341,620],
  [1343,604],[1345,586],[1347,567],[1350,547],[1353,525],
  [1356,503],[1358,480],[1361,456],[1364,433],[1367,409],
  [1370,385],[1373,361],[1376,338],[1379,316],[1382,294]
].map(([x,y])=>({x,y,width:70}));
const way=[...authored,{x:1400,y:170},{x:1100,y:150},{x:500,y:300},
  {x:350,y:700},{x:1000,y:800},{x:1335,y:664}];
const gate={
  a:{x:1327,y:452},b:{x:1396,y:461},
  normal:{x:.12518097485904683,y:-.9921339241923636}
};
const original=JSON.stringify(way);
const spawn=spawnUpstreamOfFinish(way,gate,65);
assert.ok(spawn,'Find a valid point before the user-painted finish line');
assert.ok(spawn.y>=515 && spawn.y<=527,
  'Expected ~65px BEFORE finish, not the 209px original start: '+JSON.stringify(spawn));
assert.ok(spawn.x>=1350 && spawn.x<=1360);
assert.ok(spawn.r<-.9 && spawn.r> -1.8,'Car must face forward and toward finish');
assert.ok(Math.hypot(spawn.x-1335,spawn.y-664)>100,'Spawn must visibly move nearer the gate');
assert.deepEqual(JSON.stringify(way),original,'Never move any centerline points');
assert.equal(spawnUpstreamOfFinish(way,null),null);
assert.equal(spawnUpstreamOfFinish([],gate),null);
assert.equal(spawnUpstreamOfFinish(way,{a:{x:30000,y:30000},b:{x:30100,y:30000}}),null);

// Small authored world gets a mild physical px/s normalization; never try to
// change the world size (would desync photograph, geometry and track/grass).
const params={
  accel:745.9,maxFwd:532.7*1.4,maxRev:260,brakeForce:1074.5,
  engineBrake:260,turnRate:3.8,
  steering:{yawSpeedMin:13,lowSpeedSteer:.31,highSpeedLimit:.72}
};
const originalParams=JSON.stringify(params);
const track={worldW:1672,worldH:941};
const edited=imageNativeDrivingProfile(params,track);
assert.ok(edited.imageNativeDriving.velocityScale>.65&&edited.imageNativeDriving.velocityScale<.80);
assert.ok(edited.maxFwd<params.maxFwd&&edited.maxFwd>params.maxFwd*.60);
assert.equal(edited.maxFwd/params.maxFwd,edited.accel/params.accel);
assert.ok(edited.turnRate>params.turnRate*1.4);
assert.ok(edited.steering.yawSpeedMin<params.steering.yawSpeedMin);
assert.ok(edited.steering.lowSpeedSteer>=.43);
assert.equal(JSON.stringify(params),originalParams,'Do not mutate factory/car profiles');
assert.equal(imageNativeDrivingProfile(params,null),params,'Other tracks unchanged');
const legacy=imageNativeDrivingProfile(params,{worldW:8000,worldH:5000});
assert.equal(legacy.imageNativeDriving.velocityScale,1);
assert.ok(legacy.turnRate>=params.turnRate);

const src=readFileSync('src/game/scenes/RaceScene.js','utf8'),
      local=readFileSync('src/game/tracks/localKartingPreview.js','utf8');
assert.ok(src.includes('this.trackKey === LOCAL_KARTING_PREVIEW_KEY'));
assert.ok(src.includes('imageNativeDrivingProfile(factoryParams,getLocalKartingPreview'));
assert.ok(local.includes('spawnUpstreamOfFinish(gameTrack.centerline,gameTrack.finishLine,65)'));
assert.ok(local.includes('start:{x:start.x,y:start.y,r:start.r}'));
assert.ok(!local.includes('worldW:8000')&&!local.includes('worldH:5000'),
  'Image/world pixel coordinate alignment is inviolate');
console.log('TrackStudio small-map driving: finish-aligned spawn, preserve nodes, preview-only speeds/yaw, stock cars unchanged: OK');
