-- Scraped events (source = 'scraped') should never be marked free.
-- Price data from Ticketmaster is unreliable; free events are created
-- manually by organisers only.
UPDATE events
SET    is_free    = false,
       price_from = null,
       price_to   = null
WHERE  source = 'scraped';
