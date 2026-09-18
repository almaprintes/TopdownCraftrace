-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 2: base RLS. Authenticated users can directly access only their own rows.

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "track_records_select_own"
on public.track_records
for select
to authenticated
using (user_id = auth.uid());

create policy "track_records_insert_own"
on public.track_records
for insert
to authenticated
with check (user_id = auth.uid());

create policy "track_records_update_own"
on public.track_records
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
