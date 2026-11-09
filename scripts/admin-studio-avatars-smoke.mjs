// Offline structural regression check for CraftRace Studio avatar manager.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const admin=file('src/game/ui/adminStudioAvatars.js');
const hub=file('src/game/scenes/AdminHubScene.js');
const paddock=file('src/game/ui/adminPaddockView.js');
const portal=file('studio/assets/account.mjs');
const tdr=file('src/game/online/raceControlOnline.js');
for(const word of ['nextNumber(gitNumbers)','studio_avatar_catalog','/git/blobs','/git/trees','/git/commits','/git/refs/heads/main','DecompressionStream','data-total','data-active','data-next','data-zoom','data-width','data-height','tdr_staff']){
 assert(admin.includes(word),'Missing avatar contract: '+word);
}
assert(hub.includes('mountAdminStudioAvatars'),'Admin Hub must mount avatar editor');
assert(paddock.includes('AVATARES · STUDIO'),'Paddock entry missing');
assert(portal.includes('studio_avatar_catalog'),'Studio portal must read the catalog');
assert(tdr.includes('studio_avatar_catalog'),'CraftRace must read the catalog');
assert(!admin.includes('service_role'),'No service_role credential in browser');
assert(!admin.includes('esm.sh'),'Do not import untrusted ZIP decoders with a GitHub token');
assert(existsSync(new URL('../src/game/ui/adminStudioAvatars.css',import.meta.url)),'Missing avatar CSS');
execFileSync(process.execPath,['--check',new URL('../src/game/ui/adminStudioAvatars.js',import.meta.url).pathname],{stdio:'pipe'});
console.log('CraftRace Studio avatar admin: wiring and syntax OK');
