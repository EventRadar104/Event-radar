-- Bug fix: search_events() was filtering on starts_at alone, so once an event's
-- start time passed it dropped out of results even if it was still ongoing
-- (ends_at in the future), AND — more importantly for the reported bug — the
-- home feed / map / search paths that call this function only ever tightened
-- the lower bound to "now", but events whose window had already fully closed
-- before `from_date` could still slip through call sites that pass an
-- explicit (non-default) from_date. Replacing the check with
-- COALESCE(ends_at, starts_at) >= COALESCE(from_date, now()) means an event
-- must not yet have ended (falling back to its start time when it has no
-- recorded end time) to appear in default/browse results.
--
-- This migration carries forward the venue-name matching from
-- 20260514000000_venue_search.sql and the coordinates requirement from
-- 20260511000000_search_events_require_coordinates.sql unchanged — only the
-- date filter changes.
--
-- Apply via: Supabase SQL editor or `supabase db push`

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
             setweight(to_tsvector('simple', COALESCE(title, '')),       'A') ||
             setweight(to_tsvector('simple', COALESCE(venue_name, '')),  'B') ||
             setweight(to_tsvector('simple', COALESCE(description, '')), 'C')
           ) @@ plainto_tsquery('simple', query_text)
           OR LOWER(venue_name) ILIKE '%' || LOWER(query_text) || '%'
         ))
    AND  (filter_city IS NULL OR lower(venue_city) = lower(filter_city))
    AND  (filter_slug IS NULL OR filter_slug = ANY(category_slugs))
    AND  (NOT only_free OR is_free = true)
    AND  venue_lat IS NOT NULL
    AND  venue_lng IS NOT NULL
  ORDER BY starts_at ASC
  LIMIT  result_limit
  OFFSET result_offset;
$$;
