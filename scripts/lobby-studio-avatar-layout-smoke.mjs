// Lobby Studio identity regression smoke: structure, shared account and spacing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const ui=fs.readFileSync('src/game/ui/LobbyDomUi.js','utf8');
const css=fs.readFileSync('src/game/ui/lobby-dom.css','utf8');
const shared=fs.readFileSync('src/game/online/raceControlOnline.js','utf8');
const js=spawnSync(process.execPath,['--check','src/game/ui/LobbyDomUi.js'],{encoding:'utf8'});
assert.equal(js.status,0,'Lobby script syntax: '+js.stderr);
assert.match(ui,/getMyCraftStudioAccount/,'Avatar must use shared account');
assert.match(ui,/data-lobby-avatar-image/);
assert.match(ui,/data-lobby-avatar-fallback/);
assert.match(ui,/studioAvatarRaw\+file/);
assert.match(ui,/studioAvatarBase/);
assert.match(ui,/avatarButton\?\.addEventListener\('click',openStudioAccount\)/);
assert.match(ui,/root\.querySelector\('\.tdr-lobby-right'\)\?\.prepend\(helpButton\)/);
assert.match(ui,/root\.querySelector\('\.tdr-lobby-right'\)\?\.append\(createAppWallet/);
assert.doesNotMatch(ui,/top\.append\(helpButton\)/);
assert.match(shared,/export async function getMyCraftStudioAccount\(\)/);
assert.match(css,/CRAFT STUDIO LOBBY IDENTITY 2026-11-09/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-avatar\{/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-right\{/);
assert.match(css,/@media\(max-height:500px\)/);
assert.match(css,/@media\(max-width:680px\)/);

const match=ui.match(/root\.innerHTML = \`(<header class="tdr-lobby-header">[\s\S]*?<\/header>)/);
assert.ok(match,'Lobby contains a header template');
const header=match[1],stack=[],voids=new Set(['img','input','br','hr','meta','link']);
for(const token of header.matchAll(/<\/?([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/g)){
  const tag=token[1].toLowerCase(),closing=token[0].startsWith('</');
  if(voids.has(tag))continue;
  if(closing)assert.equal(stack.pop(),tag,'Header HTML nesting near '+token[0]);
  else stack.push(tag);
}
assert.deepEqual(stack,[],'Header HTML elements must close correctly');
const childNames=[...header.matchAll(/class="tdr-lobby-(profile|top-actions|right)"/g)].map(m=>m[1]);
assert.deepEqual(childNames,['profile','top-actions','right'],
  'Exactly three non-overlapping layout zones: profile, navigation, help+wallet');
assert.match(header,/class="tdr-lobby-brand"[^>]*><img[^>]*><\/button><button[^>]*class="tdr-lobby-avatar"/,
  'Studio avatar must sit immediately after the game logo');
assert.match(header,/class="tdr-lobby-pilot" data-pilot-header>/);
assert.doesNotMatch(header,/moneda-tdr\.webp/,'Wallet belongs outside the pilot profile');
assert.doesNotMatch(header,/tdr-lobby-help/,'Help belongs outside navigation');
console.log('LOBBY STUDIO AVATAR: valid header, account image, help/wallet geometry and mobile rules.');
