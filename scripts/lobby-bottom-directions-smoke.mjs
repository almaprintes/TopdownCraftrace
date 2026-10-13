// Live lobby regression: publish layer may never erase first-class nav buttons.
// The actual track geometry, not "forward", determines winding on its card.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trackDisplayDirection} from '../src/game/tracks/trackDisplayDirection.js';
const read=p=>readFileSync(p,'utf8');
const lobby=read('src/game/ui/LobbyDomUi.js');
const polish=read('src/game/ui/LobbyPublishPolish.js');
const css=read('src/game/ui/lobby-dom.css');
const polishCss=read('src/game/ui/lobby-publish-polish.css');
const locales=read('src/game/i18n/playerUiExtra.js');
for(const slug of ['karting-tenerife','karting-canarias']){
  const raw=JSON.parse(read('src/game/tracks/library/'+slug+'/track.json'));
  assert.equal(raw.raceDirection,'forward',slug+' follows its authored centerline');
  assert.equal(trackDisplayDirection({...raw,raceCenterline:raw.centerline}),'counterclockwise',
    slug+' is ANTICLOCKWISE, despite being labeled forward in source data');
  assert.equal(trackDisplayDirection({...raw,raceCenterline:[...raw.centerline].reverse()}),'clockwise',
    'Reverse racing '+slug+' is clockwise');
}
assert.equal(trackDisplayDirection({closed:false,raceCenterline:[]}), 'stage');
assert.equal(trackDisplayDirection({closed:true,centerline:[]}), 'unknown');
assert.ok(lobby.includes('const directionKey=trackDisplayDirection(track);'));
assert.ok(lobby.includes("directionKey==='counterclockwise'?tr('lobby.counterclockwise')"));
assert.ok(lobby.includes("directionKey==='clockwise'?tr('lobby.clockwise')"));
assert.ok(lobby.includes("directionKey==='stage'?tr('lobby.pointToPoint')"));
assert.match(locales,/'lobby\.pointToPoint':'TRAMO A → B'/);
assert.match(locales,/'lobby\.pointToPoint':'POINT TO POINT'/);
assert.doesNotMatch(polish,/bottom\.replaceChildren\(/,
 'Publish polish used to destroy all but two nav targets');
assert.doesNotMatch(polish,/installBottomActions/,
 'No secondary bottom nav owner is allowed');
assert.doesNotMatch(polishCss,/tdr-lobby-bottom-actions--two/,
 'No stale two-column CSS');
const pos=lobby.indexOf('bottom.append(\n');
assert.ok(pos>=0,'Bottom row append must exist');
const actionRow=lobby.slice(pos,lobby.indexOf(');',pos)+2);
for(const part of ['makeStatisticsShortcut(scene)',"label:tr('lobby.garage')","label:tr('lobby.factory')","label:tr('lobby.tracks')",'makeOnlineRecordsShortcut(scene)']){
  assert.ok(actionRow.includes(part),'Missing button: '+part);
}
assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-bottom-actions \.tdr-lobby-button\{\s*width:100%;min-width:0/);
assert.match(lobby,/raceControlTrackId:scene\.selectedTrackKey\|\|'track01'/);
assert.match(lobby,/onlineFromLobby:true/);
console.log('Lobby single nav owner and Karting clockwise labels verified.');
