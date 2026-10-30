-- Race Control 100k / index maintenance budget, 2026-10-30.
-- Removed a redundant btree on record_ref: the unique index on the
-- same single column supports lookups, ensures UUID uniqueness,
-- and remains unchanged. Reduces per-write index maintenance.
-- No player, ghost, or ranking rows changed.
drop index if exists public.track_records_record_ref_idx;
