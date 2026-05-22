-- Add roles array to profiles (supports consumer + publisher simultaneously)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{"consumer"}';

-- Migrate existing organizers to both roles
UPDATE public.profiles
  SET roles = '{"consumer","publisher"}'
  WHERE role = 'organizer';

-- Ensure attendees have consumer role populated
UPDATE public.profiles
  SET roles = '{"consumer"}'
  WHERE (roles IS NULL OR array_length(roles, 1) IS NULL)
    AND role = 'attendee';
