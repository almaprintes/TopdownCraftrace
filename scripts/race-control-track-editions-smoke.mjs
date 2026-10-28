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
const migration=readFileSync('supabase/migrations/20261028_022_race_control_current_circuits_only.sql','utf8');
assert.match(migration,/tdr_web_private\.track_records_backup_20261028/,
  'Retired physical layouts require an isolated backup including ghost bytes');
assert.match(migration,/delete from public\.track_records/,
  'Replace obsolete editions without deleting accounts or current record rows');
for(const currentId of ['circuito-atlantico@g2-20261023','santa-cruz@g2-20261023',
  'karting-canarias-4096','karting-canarias-4096-inverso',
  'karting-tenerife-horario','karting-tenerife']){
  assert.ok(migration.includes("('"+currentId+"')")||
    migration.includes("    ('"+currentId+"'),"),
    'Official live backend snapshot must include '+currentId);
}
assert.doesNotMatch(migration,/union select distinct track_id from public\.track_records/,
  'Retired source records must not reappear when public rankings refresh');
assert.match(api,/p_track_id:raceControlServerTrackId\(trackId\)/);
assert.match(api,/p_track_id:raceControlServerTrackId\(id\)/);
assert.match(api,/const id=raceControlServerTrackId\(trackId\)/);
assert.match(api,/record\?\.track_id!==raceControlServerTrackId\(id\)/);
assert.match(api,/online_geometry_current:edition.currentLayout/);
assert.match(api,/if\(!board\)throw new Error\('La clasificación pública de este circuito aún se está actualizando\.'/,
  'A stale guest snapshot must not overwrite an actual record with an empty board');
assert.match(cache,/tdr2:leaderboardSnapshot:\$\{raceControlServerTrackId\(trackId\)\}/);
assert.match(replay,/if\(row\?\.online_geometry_current===true\)/);
assert.match(replay,/ghost.geometryRevision=revision/);
assert.match(replay,/ghostReplayCompatibility\(ghost,row.track_id,TRACK_REGISTRY\[row.track_id\]\)/);
assert.doesNotMatch(board,/Las marcas del trazado anterior se conservan aparte/,
  'Retired layouts and technical edition messages are no longer shown');
assert.match(board,/getTrackPublicName|trackName\(/,
  'RACE Control displays friendly public track names, not internal keys');
assert.match(board,/getMyRaceControlRecord\(selected.trackId\)/);
assert.match(report,/getMyRaceControlRecord\(trackId\)/);
console.log('PASS: versioned current Atlántico/Santa Cruz records isolated from historical times, ghosts and caches.');
