import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playableStatisticsTrackIds} from '../src/game/stats/playableStatisticsTracks.js';
const read=p=>readFileSync(p,'utf8');
const registry={
  'karting-tenerife':{id:'karting-tenerife'},
  'karting-canarias-4096':{id:'karting-canarias-4096'},
  'santa-cruz':{id:'santa-cruz'},
  'karting-americas':{id:'karting-americas'},
  'karting-canarias':{id:'karting-canarias',meta:{hiddenFromTrackSelect:true}},
  'karting-canarias-narrow70':{id:'karting-canarias-narrow70'},
  'track01':{id:'track01'},
  'practice-area':{id:'practice-area'},
  'future-track':{id:'future-track'}
};
const published=['karting-tenerife','karting-canarias-4096','santa-cruz','karting-americas','karting-canarias'];
const unlocked=new Set(['karting-tenerife','karting-canarias-4096','karting-americas','karting-canarias','track01']);
const get=()=>playableStatisticsTrackIds(registry,published,id=>unlocked.has(id));
assert.deepEqual(get(),['karting-tenerife','karting-canarias-4096','karting-americas'],
  'only playable unlocked and visible published circuits show, never obsolete or prototype');
unlocked.delete('karting-canarias-4096');
assert.deepEqual(get(),['karting-tenerife','karting-americas'],
  'locked circuit disappears immediately without deleting records');
unlocked.add('santa-cruz');
assert.deepEqual(get(),['karting-tenerife','santa-cruz','karting-americas'],
  'newly unlocked circuit appears without requiring a recorded lap');
assert.deepEqual(playableStatisticsTrackIds(registry,['track01','practice-area'],()=>true),['track01','practice-area'],
  'publication policy comes from the supplied canonical published list');
assert.deepEqual(playableStatisticsTrackIds(registry,['karting-tenerife','karting-tenerife'],()=>true),['karting-tenerife']);
assert.deepEqual(playableStatisticsTrackIds(registry,[],()=>true),[]);
// Check that both navigation surfaces consult the SAME live unlock source.
const stats=read('src/game/scenes/StatsScene.js'),broadcast=read('src/game/scenes/StatsBroadcastScene.js');
assert.match(stats,/playableStatisticsTrackIds\(TRACK_REGISTRY,PUBLISHED_TRACK_IDS,isTrackUnlocked\)/);
assert.match(stats,/const list=this\._playableTracks\(\)\.map\(id=>/);
assert.match(stats,/if\(!this\._playableTracks\(\)\.includes\(trackId\)\)return/);
assert.match(stats,/bestForCar\(car,playable\)/);
assert.doesNotMatch(stats,/Object\.entries\(TRACK_REGISTRY\|\|\{\}\)/);
assert.match(broadcast,/const playable=this\._playableTracks\(\)/);
assert.match(broadcast,/const records=playable\.map\(id=>/);
assert.doesNotMatch(broadcast,/Object\.keys\(TRACK_REGISTRY\|\|\{\}\)/);
assert.match(broadcast,/records\.find\(r=>r\.trackId===trackId\)\|\|records\.find/);
assert.match(read('src/game/tracks/trackUnlocks.js'),/export const PUBLISHED_TRACK_IDS/);
assert.match(read('src/game/scenes/TrackGaragePlayerLightScene.js'),/isPublishedTrackId\(key\)/);
console.log('STATS unlocked circuits: personal comparison, Race Control, stale selections, live unlocks and hidden variants OK');
