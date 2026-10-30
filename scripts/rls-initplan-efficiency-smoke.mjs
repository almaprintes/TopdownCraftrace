import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// This is a zero-network safety test. Live behavioural checks are documented
// separately and use only read-only, rolled-back Supabase queries.
const sql=readFileSync('supabase/migrations/20261030_029_rls_initplan_efficiency.sql','utf8');
const changes=[...sql.matchAll(/^alter policy "([^"]+)" on public\."([^"]+)"/gm)]
  .map(([,policy,table])=>table+'.'+policy).sort();
const expected=[
  'profiles.profiles_insert_own','profiles.profiles_select_own','profiles.profiles_update_own',
  'track_records.track_records_insert_own','track_records.track_records_select_own',
  'track_records.track_records_update_own',
  'tdr_public_notices.tdr_notices_public_read','tdr_public_notices.tdr_notices_staff_delete',
  'tdr_public_notices.tdr_notices_staff_insert','tdr_public_notices.tdr_notices_staff_update'
].sort();
assert.deepEqual(changes,expected,'Touch exactly the ten reviewed RLS policies');
assert.match(sql,/matched<>10/,'Abort atomically if any original policy changed');
assert.match(sql,/p\.permissive='PERMISSIVE'/,'Do not change permissive/restrictive semantics');
assert.match(sql,/p\.roles::text=e\.roles/,'Do not silently change authorized roles');
assert.match(sql,/p\.cmd=e\.cmd/,'Do not silently change applicable SQL operations');
assert.match(sql,/p\.qual is not distinct from e\.qual/,'Verify the original USING clauses');
assert.match(sql,/p\.with_check is not distinct from e\.with_check/,'Verify the original WITH CHECK clauses');
const updated=sql.slice(sql.indexOf('alter policy '));
const statements=updated.split(';').filter(statement=>statement.includes('alter policy'));
assert.equal(statements.length,10);
for(const stmt of statements){
  assert.match(stmt,/\(select auth\.(?:uid|jwt)\(\)\)/,'Auth evaluation must be a statement-initplan');
  assert.doesNotMatch(stmt,/(?<!select )auth\.(?:uid|jwt)\(\)/,'No direct per-row auth calls');
}
const ownership=statements.filter(s=>/public\."(?:profiles|track_records)"/.test(s));
assert.equal(ownership.length,6);
assert.ok(ownership.every(s=>/user_id = \(select auth\.uid\(\)\)/.test(s)));
const notices=statements.filter(s=>s.includes('public."tdr_public_notices"'));
assert.equal(notices.length,4);
assert.ok(notices.every(s=>s.includes("'app_metadata'") && s.includes("'tdr_staff'")));
assert.doesNotMatch(updated,/user_metadata|drop policy|create policy|grant |revoke |alter table|delete from|truncate /i,
  'Migration must not alter table permissions, JWT trust or stored data');
assert.ok(updated.trim().endsWith('commit;'),'All policy changes are atomic');
console.log('PASS: 10 RLS initplans hoisted; policy roles/ops and ownership/staff protections conserved');
