// Regression: keep the Race Control ranking visible above the first fold.
// This validates structure and launch wiring; real-device visual QA remains separate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=path=>fs.readFileSync(path,'utf8');
const board=read('src/game/scenes/StatsBroadcastScene.js');
const video=read('src/game/scenes/StatsBroadcastRealReplayScene.js');
const css=read('src/game/ui/raceControlRankingFirst.css');
assert.match(board,/class="br-panel br-hero br-hero--compact"/,'PB must use compact presentation');
const from=board.indexOf('class="br-panel br-hero br-hero--compact"');
const to=board.indexOf('class="br-panel br-chart br-online-arena"',from);
assert.ok(from>0&&to>from,'Online ranking must be immediately after compact PB');
const hero=board.slice(from,to);
for(const marker of ['br-hero-head','br-car-strip br-record-brand-banner','br-pb','br-record-car','data-br-publish'])
  assert.ok(hero.includes(marker),'PB still exposes '+marker);
const nearbyAuto='if(actualTrackId)this._installTimeMatchedRivals(selected);';
assert.ok(!video.includes(nearbyAuto),'Nearby filters must not auto-mount or auto-fetch on the ranking page');
const render=video.slice(video.indexOf('_renderBroadcastRecords(trackId=null){'),video.indexOf('_installReplayModalActions(trackId){'));
assert.doesNotMatch(render,/_installTimeMatchedRivals\(/,'No second rival panel between PB and leaderboard');
assert.ok(video.includes("import raceControlRankingFirstCss from '../ui/raceControlRankingFirst.css?inline'"));
assert.ok(video.includes("s.textContent += '\\n' + raceControlRankingFirstCss"));
for(const marker of ['br-board-tabs','br-online-head','br-online-board','br-online-row','data-br-vs','data-br-scope','data-br-online'])
  assert.ok(board.includes(marker),'Existing ranking/filter/VS must remain: '+marker);
assert.match(css,/grid-template-areas:"track car pb publish"/);
assert.match(css,/\.br-hero\.br-hero--compact\s*\{[^}]*min-height:0!important/s);
assert.match(css,/\.br-online-board/);
assert.match(css,/@media\(max-height:430px\)/);
assert.match(css,/\.br-publish-hero/);
assert.ok(video.includes('this._installReplayModalActions(trackId)'),'Replay and VS actions are still connected');
assert.ok(board.includes('getRaceControlSnapshot('),'Server snapshot path is untouched');
console.log('PASS Race Control ranking-first: compact PB, no automatic near-rival filters, preserved leaderboard/replay/VS');
