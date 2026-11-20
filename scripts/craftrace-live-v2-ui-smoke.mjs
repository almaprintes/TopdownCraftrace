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
assert.ok(legacy.includes("path.includes('/dev/')"),'Default 4P must be browser DEV only');
assert.ok(legacy.includes('if(devAllowed&&!classic)'),'Normal DEV opens 4P; classic remains accessible');
assert.ok(legacy.includes("!globalThis.Capacitor?.isNativePlatform?.()"),'No native rollouts');
assert.ok(legacy.includes("import('./craftraceLiveV2Lobby.js')"));
assert.ok(legacy.includes('onOpenClassic:()=>openCrafRaceLiveLobby(scene,{carId,trackId,classic:true})'));
assert.ok(legacy.includes('CrafRaceLiveTransport'),'Proven 2P entry preserved');
assert.ok(!legacy.includes("get('live4')==='1'"),'No special link required');
for(const field of ['data-capacity','data-ai','data-fill','data-code','data-copy',
 'data-seats','data-ready','data-host-settings','data-apply','data-leave'])
 assert.ok(next.includes(field),'Missing 4P control: '+field);
assert.ok(next.includes('CrafRaceLiveV2LobbyMonitor'));
assert.ok(next.includes('getTrackPublicName'));
assert.ok(next.includes("window.location.pathname.includes('/dev/')"),'Server race start restricted to DEV path');
assert.ok(next.includes("!globalThis.Capacitor?.isNativePlatform?.()"),'4P must stay out of native builds');
assert.ok(next.includes('data-classic'),'Classic lobby switch should be visible');
assert.ok(next.includes('classicButton.addEventListener'),'Classic must remain reachable');
assert.ok(!next.includes("get('race4')==='1'"),'No special race link required');
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
assert.ok(next.includes('data-director'),'Local director entry must be visible in DEV');
assert.ok(next.includes('<option value="3" selected>3 · Experto</option>'),
 'Director must default to Expert');
assert.ok(next.includes("const difficulty=Number($('[data-director-ai]').value)"),
 'Director must read an independent AI level, not the online level');
assert.ok(next.includes('<option value="2" selected>2 · Competitivo</option>'),
 'Ordinary online lobbies keep their existing level 2 default');
assert.ok(next.includes("fillWithAi:$('[data-fill]').checked,aiDifficulty:Number($('[data-ai]').value)"),
 'Original online difficulty choice must remain unchanged');
assert.ok(css.includes('.cr4-director-entry'),
 'Director-specific difficulty should remain usable in landscape');
assert.ok(next.includes("gameMode:'director'")&&next.includes('directorPreview:true'),
 'Producer mode must launch a separate local race');
assert.ok(next.includes("if(closed||loading||!race4Enabled)return"),
 'Never expose the producer in public/native builds');
console.log('PASS LIVE 4 normal DEV entry: classic 2P fallback, protected 4P start, native/public isolation and responsive layout');
