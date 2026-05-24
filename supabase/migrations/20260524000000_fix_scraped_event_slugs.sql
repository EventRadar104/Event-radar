-- Fix slugs for all scraped events:
--   1. æ→ae, ø→oe, å→aa before stripping non-ASCII
--   2. Ticketmaster ID suffix lowercased
-- Mirrors the corrected makeSlug() in scripts/scrape.mjs.

UPDATE events
SET slug = left(
    regexp_replace(
      regexp_replace(
        trim(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                lower(title),
                'æ', 'ae', 'g'),
              'ø', 'oe', 'g'),
            'å', 'aa', 'g')
        ),
        '[^a-z0-9 -]+', '', 'g'
      ),
      ' +', '-', 'g'
    ),
    50
  )
  || '-' || lower(right(source_id, 8))
WHERE source = 'scraped'
  AND source_id IS NOT NULL;
