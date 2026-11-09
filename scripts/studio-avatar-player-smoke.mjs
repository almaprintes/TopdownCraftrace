// Guard the actual public player selector contract, not just the Admin Hub.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const ui=fs.readFileSync('src/game/social/cloudAccountUi.js','utf8');
const backend=fs.readFileSync('src/game/online/raceControlOnline.js','utf8');
const admin=fs.readFileSync('src/game/ui/adminStudioAvatars.js','utf8');

for(const file of ['src/game/social/cloudAccountUi.js','src/game/online/raceControlOnline.js','src/game/ui/adminStudioAvatars.js']){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(result.status,0,file+': '+result.stderr);
}
assert.match(ui,/ELEGIR AVATAR · CRAFTRACE STUDIO/);
assert.match(ui,/const openFreshAvatarCatalog=async/);
assert.match(ui,/listAvailableStudioAvatars\(\)/);
assert.match(ui,/chooseMyStudioAvatar\(avatar\.id\)/);
assert.match(ui,/setStudioAvatar\(studio,account\.id\)/);
assert.match(backend,/export async function listAvailableStudioAvatars\(\)/);
assert.match(backend,/export async function chooseMyStudioAvatar\(avatarId\)/);
assert.match(backend,/representation:true/);
assert.match(backend,/studio_avatar_catalog\?select/);
assert.match(admin,/studio_avatar_catalog/);
assert.match(admin,/git\/commits/);
assert.match(admin,/git\/refs\/heads\/main/);
assert.match(admin,/pendingRows=rows;/);
console.log('STUDIO AVATARS: Admin publication + live player selection + syntax contract OK.');
