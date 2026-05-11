-- Strip leading emoji characters from category names.
-- The frontend now also strips via regex, but cleaning the source is more correct.
-- Requires the pg_trgm or unaccent extension is not needed — regexp_replace is built-in.
UPDATE categories
SET name = trim(regexp_replace(name, '^\W+\s*', '', 'g'))
WHERE name ~ '^\W';
