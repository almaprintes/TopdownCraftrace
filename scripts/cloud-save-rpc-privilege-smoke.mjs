// Fully synthetic contract for the production cloud-save privilege hardening.
// PostgreSQL instance lives exclusively in GitHub Actions; not Supabase or Mac.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const orig=readFileSync('supabase/migrations/20261030_032_skip_identical_cloud_progress_writes.sql','utf8');
const update=readFileSync('supabase/migrations/20261031_035_cloud_save_rpc_only_permissions.sql','utf8');
const original=orig.match(/CREATE OR REPLACE FUNCTION public\.save_my_player_progress\([\s\S]*?end \$function\$\s*;/i)?.[0];
assert.ok(original,'Cannot locate real save RPC from migration 032');
assert.match(update,/alter function public\.save_my_player_progress\(jsonb,bigint\) security definer/i);
assert.match(update,/revoke insert,update,delete on table public\.player_progress from public,anon,authenticated/i);
assert.match(update,/grant execute on function public\.save_my_player_progress\(jsonb,bigint\) to authenticated/i);
assert.match(update,/md5\(pg_get_functiondef\(v_function\)\)/);
assert.doesNotMatch(update,/delete from|drop table|truncate table|update public\.player_progress/i);

const sql=[
 'CREATE ROLE anon NOLOGIN;',
 'CREATE ROLE authenticated NOLOGIN;',
 'CREATE SCHEMA auth;',
 'GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $uid$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $uid$;",
 "CREATE TABLE public.player_progress(user_id uuid PRIMARY KEY,schema_version integer NOT NULL DEFAULT 2,progress jsonb NOT NULL DEFAULT '{}'::jsonb,revision bigint NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz DEFAULT now());",
 'ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;',
 'CREATE POLICY own_select ON public.player_progress FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);',
 'CREATE POLICY own_insert ON public.player_progress FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);',
 'CREATE POLICY own_update ON public.player_progress FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);',
 'GRANT SELECT,INSERT,UPDATE ON TABLE public.player_progress TO authenticated;',
 original,
 'REVOKE ALL ON FUNCTION public.save_my_player_progress(jsonb,bigint) FROM public,anon;',
 'GRANT EXECUTE ON FUNCTION public.save_my_player_progress(jsonb,bigint) TO authenticated;',
 'ALTER FUNCTION public.save_my_player_progress(jsonb,bigint) SECURITY DEFINER;',
 'REVOKE INSERT,UPDATE,DELETE ON TABLE public.player_progress FROM public,anon,authenticated;',
 'REVOKE ALL ON FUNCTION public.save_my_player_progress(jsonb,bigint) FROM public,anon;',
 'GRANT EXECUTE ON FUNCTION public.save_my_player_progress(jsonb,bigint) TO authenticated;',
 'SET ROLE authenticated;',
 "SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);",
 'DO $checks$ DECLARE s boolean; r bigint; '+ 
   'd jsonb:=\\x27{"format":2,"data":{"coins":100},"createdAt":"2026-10-31T00:00:00Z"}\\x27::jsonb; '+
   'd2 jsonb:=\\x27{"format":2,"data":{"coins":101}}\\x27::jsonb; BEGIN '+
   "IF has_table_privilege('authenticated','public.player_progress','INSERT') OR has_table_privilege('authenticated','public.player_progress','UPDATE') THEN RAISE EXCEPTION 'direct write allowed'; END IF; "+
   "IF NOT has_table_privilege('authenticated','public.player_progress','SELECT') THEN RAISE EXCEPTION 'own read denied'; END IF; "+
   'SELECT saved,current_revision INTO s,r FROM public.save_my_player_progress(d,0); '+
   "IF s IS DISTINCT FROM true OR r<>1 THEN RAISE EXCEPTION 'insert failed'; END IF; "+
   'SELECT saved,current_revision INTO s,r FROM public.save_my_player_progress(d,1); '+
   "IF s IS DISTINCT FROM true OR r<>1 THEN RAISE EXCEPTION 'no-op failed'; END IF; "+
   'SELECT saved,current_revision INTO s,r FROM public.save_my_player_progress(d2,0); '+
   "IF s IS DISTINCT FROM false OR r<>1 THEN RAISE EXCEPTION 'CAS bypassed'; END IF; "+
   'SELECT saved,current_revision INTO s,r FROM public.save_my_player_progress(d2,1); '+
   "IF s IS DISTINCT FROM true OR r<>2 THEN RAISE EXCEPTION 'update failed'; END IF; "+
   "IF (SELECT progress->'data'->>'coins' FROM public.player_progress WHERE user_id=auth.uid()) IS DISTINCT FROM '101' THEN RAISE EXCEPTION 'wrong data'; END IF; "+
   "RAISE NOTICE 'PASS: cloud save insert/no-op/CAS/update; direct writes blocked'; END; $checks$;",
 "SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);",
 "DO $isolation$ BEGIN IF (SELECT count(*) FROM public.player_progress)<>0 THEN RAISE EXCEPTION 'cross-player access'; END IF; RAISE NOTICE 'PASS: second player cannot read private cloud save'; END; $isolation$;",
 'RESET ROLE;'
].join('\n').replace(/\\x27/g,"'");
const runner=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1','-q'],{
 input:sql,encoding:'utf8',env:process.env,maxBuffer:1024*1024,timeout:100000
});
if(runner.error)throw runner.error;
if(runner.status!==0){console.error(runner.stderr);throw Error('PostgreSQL cloud-save regression failed');}
const lines=(runner.stderr||'').split('\n').filter(x=>x.includes('PASS:'));
assert.equal(lines.length,2,'Both simulated users must be tested');
console.log(lines.join('\n'));
console.log('No real users, no Supabase connection, no personal data.');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
 '\n## Cloud-save RPC isolated audit\n- Synthetic users: RPC save, no-op, conflict, update, cross-account isolation\n- Direct table writes blocked; own read preserved. No production data.\n');
