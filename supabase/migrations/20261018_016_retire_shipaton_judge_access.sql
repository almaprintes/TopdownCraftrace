-- Retire contest-only authorization. Leave player profiles, wallets and records unchanged.
drop function if exists public.activate_shipaton_judge_access(text);
drop function if exists public.get_my_shipaton_judge_access();
drop table if exists private.shipaton_judge_entitlements;
drop table if exists private.shipaton_judge_codes;
