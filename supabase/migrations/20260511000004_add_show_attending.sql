-- Organisers can opt-in to showing an "I'm attending" RSVP button on their event page.
ALTER TABLE events ADD COLUMN show_attending boolean NOT NULL DEFAULT false;
