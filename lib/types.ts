// ─────────────────────────────────────────
// Event Radar — Database types
// Generated from Phase 1 + Phase 2 schema
// ─────────────────────────────────────────

export type UserRole = 'attendee' | 'organizer' | 'admin'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type EventSource = 'manual' | 'scraped'
export type RsvpStatus = 'attending' | 'interested' | 'not_attending'

// ── Raw table rows ────────────────────────

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  website_url: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  created_at: string
}

export interface Venue {
  id: string
  name: string
  address: string | null
  city: string | null
  region: string | null
  country: string
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  website_url: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  organizer_id: string | null
  title: string
  slug: string | null
  description: string | null
  cover_image_url: string | null
  starts_at: string
  ends_at: string | null
  venue_id: string | null
  is_online: boolean
  online_url: string | null
  is_free: boolean
  price_from: number | null
  price_to: number | null
  ticket_url: string | null
  status: EventStatus
  source: EventSource
  source_url: string | null
  language: string
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface Favorite {
  user_id: string
  event_id: string
  created_at: string
}

export interface Rsvp {
  user_id: string
  event_id: string
  status: RsvpStatus
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  invite_code: string
  cover_image_url: string | null
  created_by: string | null
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  joined_at: string
}

export interface GroupEvent {
  group_id: string
  event_id: string
  added_by: string | null
  added_at: string
}

export interface GroupVote {
  group_id: string
  event_id: string
  user_id: string
  vote: 1 | -1
}

export interface GroupWithCounts extends Group {
  member_count: number
  event_count: number
}

export interface GroupMemberWithProfile {
  group_id: string
  user_id: string
  joined_at: string
  display_name: string | null
  avatar_url: string | null
}

export interface GroupEventWithDetails {
  group_id: string
  event_id: string
  added_by: string | null
  added_at: string
  event_title: string
  event_slug: string | null
  event_starts_at: string
  event_cover_image_url: string | null
  venue_name: string | null
  venue_city: string | null
  votes_up: number
  votes_down: number
  net_score: number
  my_vote: 1 | -1 | null
}

// ── View shapes ───────────────────────────

/** Returned by the events_with_details view + search_events() */
export interface EventWithDetails extends Event {
  venue_name: string | null
  venue_city: string | null
  venue_region: string | null
  venue_lat: number | null
  venue_lng: number | null
  organizer_name: string | null
  organizer_avatar: string | null
  category_slugs: string[] | null
  category_names: string[] | null
}

/** Returned by organizer_event_stats */
export interface OrganizerEventStat {
  event_id: string
  title: string
  starts_at: string
  status: EventStatus
  organizer_id: string
  views_30d: number
  views_total: number
  save_count: number
  rsvp_attending: number
  rsvp_interested: number
  views_from_search: number
  views_from_share: number
  views_from_browse: number
  views_from_map: number
}

// ── Search params ─────────────────────────

export interface SearchParams {
  q?: string
  city?: string
  cat?: string
  from?: string
  to?: string
  free?: string
  page?: string
  sort?: string
  weekend?: string
}
