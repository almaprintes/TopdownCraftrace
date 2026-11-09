// Offline structural regression check for CraftRace Studio avatar manager.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const admin=file('src/game/ui/adminStudioAvatars.js');
const zipReader=file('src/game/ui/studioAvatarZip.mjs');
const gitWriter=file('src/game/ui/studioAvatarGitPublish.mjs');
const hub=file('src/game/scenes/AdminHubScene.js');
const paddock=file('src/game/ui/adminPaddockView.js');
const portal=file('studio/assets/account.mjs');
const tdr=file('src/game/online/raceControlOnline.js');
for(const word of ['commitStudioAvatarBatch','studio_avatar_catalog','/git/blobs','getPendingRows','registerPending','readStudioAvatarZip','data-total','data-active','data-next','data-zoom','data-width','data-height','tdr_staff']){
 assert(admin.includes(word),'Missing avatar contract: '+word);
}
assert(gitWriter.includes('isNonFastForward')&&gitWriter.includes('branchContains'),'GitHub writer retries non-fast-forward conflicts without force');
assert(gitWriter.includes("force:false")&&gitWriter.includes('base_tree:base.tree.sha'),'GitHub preserves new main commits');
assert(zipReader.includes("DecompressionStream")&&zipReader.includes("tinyInflate"),'ZIP reader handles Safari without native deflate-raw');
assert(zipReader.includes('if(inner)await visit(data,depth+1)'), 'ZIP reader recognizes nested ZIPs');
assert(!admin.includes('accept="image/png'), 'iOS file input must show all images and ZIPs');
assert(hub.includes('mountAdminStudioAvatars'),'Admin Hub must mount avatar editor');
assert(paddock.includes('AVATARES · STUDIO'),'Paddock entry missing');
assert(portal.includes('studio_avatar_catalog'),'Studio portal must read the catalog');
assert(tdr.includes('studio_avatar_catalog'),'CraftRace must read the catalog');
assert(!admin.includes('service_role'),'No service_role credential in browser');
assert(!admin.includes('esm.sh'),'Do not import untrusted ZIP decoders with a GitHub token');
assert(existsSync(new URL('../src/game/ui/adminStudioAvatars.css',import.meta.url)),'Missing avatar CSS');
execFileSync(process.execPath,['--check',new URL('../src/game/ui/adminStudioAvatars.js',import.meta.url).pathname],{stdio:'pipe'});
console.log('CraftRace Studio avatar admin: wiring and syntax OK');
