// DEV 1.2.295: truthful cloud backup and authenticated creator badge.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261019_017_authoritative_pilot_badge.sql');
const online=read('src/game/online/raceControlOnline.js');
const account=read('src/game/social/cloudAccountUi.js');
const lobby=read('src/game/ui/LobbyDomUi.js');
const settings=read('src/game/scenes/SettingsDomScene.js');
assert.match(sql,/where p\.user_id = auth\.uid\(\)/,'badge bound to authenticated UUID');
assert.match(sql,/r\.display_name collate "C" = p\.nick collate "C"/,'exact nick match');
assert.match(sql,/r\.badge = 'CREADOR'/);
assert.match(sql,/revoke all on function public\.get_my_pilot_badge\(\) from public, anon, authenticated/);
assert.match(sql,/grant execute on function public\.get_my_pilot_badge\(\) to authenticated/);
assert.match(online,/getMyRaceControlBadge/);
assert.match(online,/\/rest\/v1\/rpc\/get_my_pilot_badge/);
assert.match(online,/badge==='CREADOR'\?'CREADOR':null/,'only valid creator badges');
assert.match(account,/creatorBadge\.hidden=\(await getMyRaceControlBadge\(\)\)!=='CREADOR'/);
assert.match(lobby,/creatorBadge\.hidden=\(await getMyRaceControlBadge\(\)\)!=='CREADOR'/);
const lobbyCss=read('src/game/ui/lobby-dom.css');
assert.match(lobby,/identityRow\.append\(accountButton,creatorBadge\)/,
 'badge must share the ID row instead of creating a fourth header row');
assert.doesNotMatch(lobby,/accountButton\?\.after\(creatorBadge\)/,
 'regression: fourth row clips the badge on iPhone');
assert.match(lobbyCss,/\.tdr-lobby-identity-row\{\s*display:flex;align-items:center/,
 'ID and creator badge share one flex row');
assert.match(lobbyCss,/\.tdr-lobby-identity-row \[data-cloud-account\]\{[\s\S]*?text-overflow:ellipsis/,
 'long ID stays bounded without pushing the badge outside the header');
assert.match(lobby,/display:grid;gap:2px;padding:3px 8px/,
 'three rows still fit the short landscape header');
assert.match(account,/Partida guardada en la nube/);
assert.match(account,/GUARDAR COPIA/);
assert.match(account,/ACTUALIZAR COPIA/);
assert.match(account,/DESCARGAR COPIA/);
assert.match(account,/Una copia en la nube NO basta para entrar/);
assert.match(account,/El sistema sin correo TDR ID todavía no está listo/);
assert.doesNotMatch(account,/Vincula tu correo antes de desinstalar/);
assert.doesNotMatch(account,/show\('protect'/,'no email by default');
assert.match(account,/data-action="legacy-access"/,'old recovery retained in advanced');
assert.match(account,/data-action="export-local"/,'downloadable local copy');
assert.match(account,/data-action="restore"/,'manual restore retained');
assert.match(settings,/AJUSTES GUARDADOS/,'do not confuse game settings with cloud save');
for(const file of ['src/game/social/cloudAccountUi.js','src/game/online/raceControlOnline.js','src/game/ui/LobbyDomUi.js','src/game/scenes/SettingsDomScene.js'])
  execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
console.log('[ACCOUNT UX] truthful backup, single primary, creator badge authenticated, legacy access retained OK');
