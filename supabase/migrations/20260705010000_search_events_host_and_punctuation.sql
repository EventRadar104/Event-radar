-- Fixes two search regressions found after the upcomingOrOngoing() rollout
-- (20260705000000_search_events_upcoming_or_ongoing.sql). Neither is actually
-- caused by that migration — both are pre-existing gaps that were surfaced
-- while testing it — but they're fixed here since they were reported
-- together. Verified locally against a standalone reproduction of
-- events_with_details before writing this migration; see session notes.
--
-- Symptom 1 — searching a host/venue name (e.g. "Lekter'n" / "Lektern")
-- returns nothing:
--   - organizer_name (the host field for manually-created events) was never
--     part of the search vector at all — only title/venue_name/description
--     were matched (20260514000000_venue_search.sql). Scraped events never
--     set organizer_id (see scripts/scrape.mjs), so for scraped data the
--     "host" is really the venue; for manually-created events it's
--     organizer_name. We now match both.
--   - Plain ILIKE substring matching breaks the moment the query and the
--     stored value disagree on punctuation — most commonly an apostrophe:
--     "Lekter'n" is stored with a typographic apostrophe (’) in some rows
--     and a straight one (') in others, and a user typing "Lektern" omits
--     it entirely. `normalize_search_text()` strips everything but letters
--     and digits on both sides before comparing, so all three spellings
--     match the same row.
--
-- Symptom 2 — clicking a city filter chip returns nothing:
--   - Traced end-to-end (search page -> lib/queries.ts searchEvents() ->
--     this RPC) and confirmed this path never touches the JS
--     upcomingOrOngoing() helper introduced in the last migration, and the
--     COALESCE(ends_at, starts_at) date clause is a strict relaxation of
--     the old starts_at-only clause (can only match more rows, never
--     fewer) — so the city-chip regression is NOT caused by that rollout.
--     Reproduced separately against a standalone copy of this function: the
--     exact-equality city match (`lower(venue_city) = lower(filter_city)`)
--     silently drops rows whose venue_city has incidental whitespace (e.g.
--     "Oslo "), which a straight equality check has no tolerance for.
--     Hardened with trim() on both sides.
--
-- Also adds search_venue_suggestions(), used by app/api/search/suggestions
-- so the suggestions dropdown and search_events() agree on which venues
-- have results — a suggested venue always yields at least one hit.
--
-- Apply via: Supabase SQL editor or `supabase db push`

CREATE OR REPLACE FUNCTION normalize_search_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(COALESCE(input, ''), '[^a-zA-Z0-9]+', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION search_events(
  query_text    text        DEFAULT NULL,
  filter_city   text        DEFAULT NULL,
  filter_slug   text        DEFAULT NULL,
  from_date     timestamptz DEFAULT NULL,
  to_date       timestamptz DEFAULT NULL,
  only_free     boolean     DEFAULT false,
  result_limit  integer     DEFAULT 50,
  result_offset integer     DEFAULT 0
)
RETURNS SETOF events_with_details
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM   events_with_details
  WHERE  status = 'published'
    AND  COALESCE(ends_at, starts_at) >= COALESCE(from_date, now())
    AND  (to_date     IS NULL OR starts_at <= to_date)
    AND  (query_text  IS NULL OR (
           (
             setweight(to_tsvector('simple', COALESCE(title, '')),          'A') ||
             setweight(to_tsvector('simple', COALESCE(venue_name, '')),     'B') ||
             setweight(to_tsvector('simple', COALESCE(organizer_name, '')), 'B') ||
             setweight(to_tsvector('simple', COALESCE(description, '')),    'C')
           ) @@ plainto_tsquery('simple', query_text)
           OR LOWER(venue_name)     ILIKE '%' || LOWER(query_text) || '%'
           OR LOWER(organizer_name) ILIKE '%' || LOWER(query_text) || '%'
           OR (
                normalize_search_text(query_text) <> ''
                AND (
                  normalize_search_text(venue_name)        ILIKE '%' || normalize_search_text(query_text) || '%'
                  OR normalize_search_text(organizer_name) ILIKE '%' || normalize_search_text(query_text) || '%'
                )
              )
         ))
    AND  (filter_city IS NULL OR lower(trim(venue_city)) = lower(trim(filter_city)))
    AND  (filter_slug IS NULL OR filter_slug = ANY(category_slugs))
    AND  (NOT only_free OR is_free = true)
    AND  venue_lat IS NOT NULL
    AND  venue_lng IS NOT NULL
  ORDER BY starts_at ASC
  LIMIT  result_limit
  OFFSET result_offset;
$$;

CREATE OR REPLACE FUNCTION search_venue_suggestions(query_text text, result_limit integer DEFAULT 20)
RETURNS TABLE(venue_name text, venue_city text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (lower(e.venue_name)) e.venue_name, e.venue_city
  FROM   events_with_details e
  WHERE  e.status = 'published'
    AND  COALESCE(e.ends_at, e.starts_at) >= now()
    AND  e.venue_name IS NOT NULL
    AND  (
           LOWER(e.venue_name) ILIKE '%' || LOWER(query_text) || '%'
           OR (
                normalize_search_text(query_text) <> ''
                AND normalize_search_text(e.venue_name) ILIKE '%' || normalize_search_text(query_text) || '%'
              )
         )
  ORDER BY lower(e.venue_name), e.starts_at ASC
  LIMIT result_limit;
$$;
