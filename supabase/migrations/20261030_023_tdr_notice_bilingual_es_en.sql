-- Applied to Supabase as tdr_notice_bilingual_es_en_20261030.
-- Keep the existing Spanish text columns for legacy clients.
ALTER TABLE public.tdr_public_notices
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tdr_public_notices
  ADD CONSTRAINT tdr_notice_translations_object
  CHECK (jsonb_typeof(translations) = 'object');
ALTER TABLE public.tdr_public_notices
  ADD CONSTRAINT tdr_notice_published_bilingual
  CHECK (
    active = false OR (
      jsonb_typeof(translations -> 'en') = 'object'
      AND char_length(btrim(coalesce(translations #>> '{en,title}', ''))) BETWEEN 1 AND 90
      AND char_length(btrim(coalesce(translations #>> '{en,body}', ''))) BETWEEN 1 AND 600
      AND (kind = 'update' OR action_label IS NULL
        OR char_length(btrim(coalesce(translations #>> '{en,action_label}', ''))) BETWEEN 1 AND 28)
    )
  );
