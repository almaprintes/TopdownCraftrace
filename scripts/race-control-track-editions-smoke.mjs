import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {raceControlServerTrackId,raceControlCurrentEdition,decodeRaceControlServerTrackId}
 from '../src/game/online/raceControlTrackEdition.js';
assert.equal(raceControlServerTrackId('circuito-atlantico'),'circuito-atlantico@g2-20261023');
assert.equal(raceControlServerTrackId('santa-cruz'),'santa-cruz@g2-20261023');
assert.ok(raceControlServerTrackId('circuito-atlantico').length<=80);
for(const id of ['karting-tenerife','karting-americas','karting-canarias',
  'santa-cruz-inverso','circuito-atlantico-inverso','siete-picos']){
  assert.equal(raceControlCurrentEdition(id),null);
  assert.equal(raceControlServerTrackId(id),id);
}
assert.deepEqual(decodeRaceControlServerTrackId('circuito-atlantico@g2-20261023'),
 {trackId:'circuito-atlantico',currentLayout:true,historical:false});
assert.equal(decodeRaceControlServerTrackId('circuito-atlantico').historical,true);
assert.equal(decodeRaceControlServerTrackId('circuito-atlantico@g9-20990101'),null);
const api=readFileSync('src/game/online/raceControlOnline.js','utf8');
const cache=readFileSync('src/game/stats/localRaceRecords.js','utf8');
const replay=readFileSync('src/game/scenes/StatsBroadcastRealReplayScene.js','utf8');
const board=readFileSync('src/game/scenes/StatsBroadcastScene.js','utf8');
const report=readFileSync('src/game/ui/sessionRecordPublishOffer.js','utf8');
assert.match(api,/p_track_id:raceControlServerTrackId\(trackId\)/);
assert.match(api,/p_track_id:raceControlServerTrackId\(id\)/);
assert.match(api,/const id=raceControlServerTrackId\(trackId\)/);
assert.match(api,/record\?\.track_id!==raceControlServerTrackId\(id\)/);
assert.match(api,/online_geometry_current:edition.currentLayout/);
assert.match(api,/if\(!board&&decodeRaceControlServerTrackId\(id\)\?\.currentLayout\)return \[\]/);
assert.match(cache,/tdr2:leaderboardSnapshot:\$\{raceControlServerTrackId\(trackId\)\}/);
assert.match(replay,/if\(row\?\.online_geometry_current===true\)/);
assert.match(replay,/ghost.geometryRevision=revision/);
assert.match(replay,/ghostReplayCompatibility\(ghost,row.track_id,TRACK_REGISTRY\[row.track_id\]\)/);
assert.match(board,/CLASIFICACIÓN · TRAZADO ACTUAL/);
assert.match(board,/getMyRaceControlRecord\(selected.trackId\)/);
assert.match(report,/getMyRaceControlRecord\(trackId\)/);
console.log('PASS: versioned current Atlántico/Santa Cruz records isolated from historical times, ghosts and caches.');
