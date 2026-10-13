// DEV 1.2.159 — statistics/leaderboard are distinct lobby routes, and
// the real round lobby car platform and cutaway side panels are visible.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { resolveStatsInitialTrack } from '../src/game/scenes/statsEntryRoute.js';
const read=path=>readFileSync(path,'utf8');
const lobby=read('src/game/ui/LobbyDomUi.js');
const stats=read('src/game/scenes/StatsBroadcastRealReplayScene.js');
const menu=read('src/game/scenes/MenuDomUiScene.js');
const css=read('src/game/ui/lobby-dom.css');
const polish=read('src/game/ui/LobbyPublishPolish.js');
assert.equal(resolveStatsInitialTrack({statsView:'overview'},'karting-tenerife'),'',
  'Statistics should not reopen previously stored Race Control view');
assert.equal(resolveStatsInitialTrack({statsView:'overview',raceControlTrackId:'karting-canarias'},''),
  'Explicit personal statistics route always wins over stale Race Control params');
assert.equal(resolveStatsInitialTrack({onlineFromLobby:true,raceControlTrackId:'karting-tenerife'},'old'),'karting-tenerife',
  'Online Records must go straight to the selected track');
assert.equal(resolveStatsInitialTrack({},'karting-canarias'),'karting-canarias',
  'Replay return retains its intended Race Control destination');
assert.equal(resolveStatsInitialTrack({},''),'',
  'No route means the ordinary statistics overview');
assert.match(lobby,/scene\.scene\.start\('StatsScene',\{statsView:'overview'\}\)/,
  'Stats lobby button must request the overview explicitly');
assert.match(lobby,/scene\.scene\.start\('StatsScene',\{\s*raceControlTrackId:/,
  'Online button must still request a specific Race Control track');
assert.match(stats,/trackId=resolveStatsInitialTrack\(data,sessionStorage\.getItem\(RETURN_TRACK_KEY\)\)/);
assert.match(stats,/sessionStorage\.removeItem\(RETURN_TRACK_KEY\)/);
assert.ok(lobby.includes('<img class="tdr-lobby-car-platform" src="\${BASE}assets/ui/lobby/car_platform.webp"'),
  'Visible round stage must be an actual DOM element above the lobby background');
assert.doesNotMatch(menu,/this\._installCarPlatform\(\)/,
  'Do not allocate a second invisible platform underneath the opaque DOM lobby');
assert.doesNotMatch(menu,/this\.load\.image\('lobby-platform'/,
  'Do not preload unused old Phaser platform texture');
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-car-platform\{/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-car-platform\{[\s\S]*?z-index:0;[\s\S]*?pointer-events:none;/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-car-preview\{\s*z-index:1;/);
assert.match(css,/\.tdr-lobby-dom \.tdr-event-card\{\s*--tdr-wing:/);
assert.match(css,/\.tdr-lobby-dom \.tdr-track-card\{\s*--tdr-wing:/);
assert.match(css,/clip-path:polygon\(0 0,calc\(100% - 29px\)/);
assert.match(css,/clip-path:polygon\(29px 0,100% 0/);
assert.match(css,/\.tdr-lobby-dom \.tdr-track-map\{\s*background:transparent;\s*border:0;/);
assert.match(css,/@media\(max-height:430px\)/);
assert.doesNotMatch(polish,/bottom\.replaceChildren\(/,
  'The publish layer must not erase the independent Stats and Online Records buttons');
assert.match(lobby,/makeStatisticsShortcut\(scene\)/);
assert.match(lobby,/makeOnlineRecordsShortcut\(scene\)/);
console.log('Distinct Stats/Online entry, real DOM car platform, open side wings and unchanged clickable navigation OK');
