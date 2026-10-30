-- Align repository with production schema change applied on 2026-10-30.
-- Historical copies keep NULL: their original creation dates are unknown.
ALTER TABLE public.player_progress ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.player_progress ALTER COLUMN created_at SET DEFAULT now();
COMMENT ON COLUMN public.player_progress.created_at IS 'First cloud save timestamp. NULL for pre-migration copies: historical creation time unknown.';
