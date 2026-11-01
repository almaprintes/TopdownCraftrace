import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const paths=['src/game/online/feedbackReports.js','src/game/ui/playerFeedback.js',
  'src/game/ui/adminCommunications.js','src/game/ui/adminEmergencyControls.js',
  'src/game/ui/adminPaddockView.js',
  'src/game/scenes/SettingsDomScene.js','src/ui/settingsLegalEnhancer.js'];
for(const path of paths)execFileSync(process.execPath,['--check',new URL('../'+path,import.meta.url).pathname],{stdio:'pipe'});
const sql=read('supabase/migrations/20261101_036_player_feedback_emergency_switch.sql');
assert.match(sql,/enabled boolean not null default false/);
assert.match(sql,/v_control\.enabled/);
assert.match(sql,/daily_global_limit integer not null default 40/);
assert.match(sql,/daily_user_limit integer not null default 2/);
assert.match(sql,/pg_advisory_xact_lock/);
assert.match(sql,/coalesce\(\(select auth\.jwt\(\)\)->'app_metadata'->>'tdr_staff'/);
assert.match(sql,/revoke all on function public\.tdr_set_feedback_enabled\(boolean\) from public,anon/);
assert.match(sql,/grant execute on function public\.tdr_submit_feedback\(text,text,jsonb\) to authenticated/);
assert.doesNotMatch(sql,/grant insert on public\.tdr_feedback_reports to authenticated/i);
const ui=read('src/game/ui/adminEmergencyControls.js');
const announcements=read('src/game/ui/adminCommunications.js');
const scene=read('src/game/scenes/AdminHubScene.js');
const paddock=read('src/game/ui/adminPaddockView.js');
assert.match(ui,/CORTAR INFORMES/);
assert.match(ui,/ABRIR PAUSA TOTAL/);
assert.match(ui,/REANUDAR PROYECTO/);
assert.match(ui,/tdr_set_feedback_enabled/);
assert.match(ui,/result\?\.enabled!==enabled/);
assert.match(ui,/tdr_feedback_admin_status/);
assert.match(ui,/tdr_feedback_reports/);
assert.match(ui,/https:\/\/supabase\.com\/dashboard\/project\/juukbnkjboiazqggqcyv\/settings\/general/);
assert.match(ui,/tdr_staff/);
assert.doesNotMatch(ui,/service_role|serviceRole|sb_secret_|api\.supabase\.com\/v1\/projects/, 'No management tokens / direct management API from the app');
assert.doesNotMatch(announcements,/tdr_set_feedback_enabled|tdr_feedback_reports|ABRIR PAUSA TOTAL|CORTAR INFORMES/,
  'Communications must contain ZERO emergency/feedback controls');
assert.match(paddock,/id:'emergency',color:'#ff4261',run:handlers\.emergency/);
assert.match(paddock,/id:'emergencyProject',color:'#ff2349',run:handlers\.projectEmergency/);
assert.match(paddock,/id:'communications',color:'#40e4c7',run:handlers\.communications/);
assert.match(scene,/mountAdminEmergencyControls\(\{mode\}\)/);
assert.match(scene,/_openEmergencyConsole\('reports'\)/);
assert.match(scene,/_openEmergencyConsole\('project'\)/);
assert.match(ui,/if\(!projectMode\)cards\.append\(reports\)/);
assert.match(ui,/if\(projectMode\)cards\.append\(project\)/);
assert.match(scene,/mountAdminCommunications\(\)/);
assert.match(scene,/this\._emergencyDispose\?\.\(\)/);
assert.match(read('src/game/scenes/SettingsDomScene.js'),/data-feedback-open/);
assert.match(read('src/ui/settingsLegalEnhancer.js'),/closest\?\.\('\[data-feedback-open\]'\)/);
const player=read('src/game/online/feedbackReports.js');
assert.match(player,/includeDiagnostics\?limitedFeedbackDiagnostics\(\):\{\}/);
assert.match(player,/tdr_submit_feedback/);
assert.doesNotMatch(player,/service_role|serviceRole|sb_secret_/);
console.log('TDR feedback emergency switch smoke OK: gated SQL, opt-in client, secured staff controls.');
