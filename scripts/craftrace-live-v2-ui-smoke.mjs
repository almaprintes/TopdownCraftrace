import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const legacy=file('src/game/ui/craftraceLiveLobby.js');
const next=file('src/game/ui/craftraceLiveV2Lobby.js');
const css=file('src/game/ui/craftraceLiveV2Lobby.css');
const client=file('src/game/online/craftraceLiveV2LobbyClient.js');
for(const path of ['src/game/ui/craftraceLiveV2Lobby.js',
 'src/game/ui/craftraceLiveLobby.js','src/game/online/craftraceLiveV2LobbyClient.js',
 'src/game/online/craftraceLiveV2Roster.js'])
 execFileSync(process.execPath,['--check',new URL('../'+path,import.meta.url).pathname],
  {stdio:'pipe'});
assert.ok(legacy.includes("get('live4')==='1'"));
assert.ok(legacy.includes("path.includes('/dev/')"));
assert.ok(legacy.includes("import('./craftraceLiveV2Lobby.js')"));
assert.ok(legacy.includes('CrafRaceLiveTransport'),'Proven 2P entry preserved');
for(const field of ['data-capacity','data-ai','data-fill','data-code','data-copy',
 'data-seats','data-ready','data-host-settings','data-apply','data-leave'])
 assert.ok(next.includes(field),'Missing 4P control: '+field);
assert.ok(next.includes('CrafRaceLiveV2LobbyMonitor'));
assert.ok(next.includes('getTrackPublicName'));
assert.ok(next.includes("get('race4')==='1'"),'Race requires separate DEV-only flag');
assert.ok(next.includes("scene.scene.start('race',"),'Experimental 4P race must launch');
assert.ok(next.includes('startLiveV2Lobby(room.id)'),'Host must use protected server start');
assert.ok(next.includes('stageLive4RaceSession(s,identity)'),'Handoff must retain authenticated server roster');
assert.ok(next.includes("['countdown','racing'].includes(s?.state)"),'Race reconnection requires server-owned seat');
assert.ok(!next.includes('Date.now()-30000'),'30-second rejoin trap removed');
assert.ok(next.includes('sin monedas ni récords'),'Experimental results must remain unofficial');
assert.ok(css.includes('safe-area-inset-top'));
assert.ok(css.includes('@media(max-height:460px)'));
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(client.includes('liveIdentity()'));
assert.ok(client.includes('this.heartbeatMs'));
console.log('PASS LIVE 4 DEV-only UI: two opt-in flags, legacy isolation, protected race start, account handoff and responsive layout');
