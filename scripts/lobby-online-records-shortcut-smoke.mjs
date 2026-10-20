// DEV 1.2.157: Race Control is reachable directly from the lobby and back.
// Navigation is presentation only: ranking/profile/ad logic remains untouched.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const lobby=read('src/game/ui/LobbyDomUi.js');
const css=read('src/game/ui/lobby-dom.css');
const stats=read('src/game/scenes/StatsBroadcastScene.js');
const real=read('src/game/scenes/StatsBroadcastRealReplayScene.js');
const mastery=read('src/game/scenes/StatsMasteryScene.js');
const locales=read('src/game/i18n/playerUiExtra.js');
assert.match(lobby,/function makeOnlineRecordsShortcut\(scene\)/);
assert.match(lobby,/dataset\.lobbyOnlineRecords='1'/);
assert.match(lobby,/tr\('lobby\.onlineRecords'\)/);
assert.match(lobby,/button\.addEventListener\('click',\(\)=>scene\.scene\.start\('StatsScene',\{/);
assert.match(lobby,/raceControlTrackId:selectedCircuitRaceId\(scene\.selectedTrackKey\|\|'track01',localStorage\)/,
  'Race Control opens the selected NORMAL/INVERSO variant without changing historic times');
assert.match(lobby,/onlineFromLobby:true/);
assert.match(lobby,/makeOnlineRecordsShortcut\(scene\)/,
  'Online Records remains in the bottom nav');
assert.match(lobby,/makeStatisticsShortcut\(scene\)/,
  'Statistics remains available in addition to Online Records');
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-bottom-actions\{\s*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-bottom-actions \.tdr-lobby-button\{\s*width:100%;min-width:0/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-button--records\{/);
assert.match(css,/@media\(max-width:900px\)/);
assert.match(locales,/'lobby\.onlineRecords':'RÉCORDS ONLINE'/);
assert.match(locales,/'lobby\.onlineRecords':'ONLINE RECORDS'/);
assert.match(stats,/this\._onlineFromLobby=args\[0\]\?\.onlineFromLobby===true/);
assert.match(real,/trackId=resolveStatsInitialTrack\(data,sessionStorage\.getItem\(RETURN_TRACK_KEY\)\)/,
  'Online Records and Statistics have distinct initial route resolution');
assert.match(real,/if\(trackId\)this\.time\?\.delayedCall\?\.\(0,\(\)=>this\._renderBroadcastRecords\(trackId\)\)/);
assert.match(stats,/if\(this\._onlineFromLobby\)this\.scene\.start\('menu'\);\s*else this\._renderCars\(\)/,
  'Direct-lobby Race Control returns to lobby; the existing Statistics flow still returns to stats');
assert.match(mastery,/if\(!args\[0\]\?\.onlineFromLobby\)showFirstVisitTutorial\('stats'/);
assert.match(stats,/_publishRaceControlRecord\(selected,button\)/);
assert.match(stats,/submitRaceControlRecordWithGhost\(/);
assert.match(stats,/verifiedReward\(ad\)/);
console.log('Lobby one-tap online records route, responsive five CTAs, back behavior and original stats/publish flow verified.');
