-- Shipaton judge access hardening and supporting index.

create index if not exists shipaton_judge_entitlements_code_id_idx
on private.shipaton_judge_entitlements(code_id);

-- Event-trigger helpers must never be callable through the Data API.
revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;
