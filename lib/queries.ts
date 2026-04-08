import { createClient } from '@/lib/supabase/server'
import type {
  EventWithDetails,
  GroupEventRow,
  OrganizerEventStat,
  SearchParams,
  VoteSummary,
} from '@/lib/types'

// ─────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────

export async function searchEvents(params: SearchParams = {}) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('search_events', {
      query_text:   params.q    || null,
      filter_city:  params.city || null,
      filter_slug:  params.cat  || null,
      from_date:    params.from || '2020-01-01T00:00:00Z',
      to_date:      params.to   || null,
      only_free:    params.free === 'true',
      result_limit: 48,
      result_offset: (parseInt(params.page || '1', 10) - 1) * 24,
    })
    if (error) {
      console.error('searchEvents error:', error.message)
      return [] as EventWithDetails[]
    }
    return (data ?? []) as EventWithDetails[]
  } catch (e) {
    console.error('searchEvents exception:', e)
    return [] as EventWithDetails[]
  }
}

export async function getEventBySlug(slug: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
    if (error) return null
    return data as EventWithDetails
  } catch (e) {
    console.error('getEventBySlug exception:', e)
    return null
  }
}

export async function getRsvpCount(eventId: string) {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'attending')
    return count ?? 0
  } catch { return 0 }
}

export async function getUserEventState(eventId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { isFavorite: false, rsvpStatus: null }
    const [fav, rsvp] = await Promise.all([
      supabase.from('favorites').select('event_id').eq('user_id', user.id).eq('event_id', eventId).maybeSingle(),
      supabase.from('rsvps').select('status').eq('user_id', user.id).eq('event_id', eventId).maybeSingle(),
    ])
    return { isFavorite: !!fav.data, rsvpStatus: rsvp.data?.status ?? null }
  } catch { return { isFavorite: false, rsvpStatus: null } }
}

// ─────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────

export async function getGroupByInviteCode(code: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_group_by_invite_code', { p_code: code })
    if (error || !data || data.length === 0) return null
    const first = data[0] as GroupEventRow
    const group = {
      id: first.group_id,
      name: first.group_name,
      scope_city: first.scope_city,
      scope_date: first.scope_date,
      scope_cat: first.scope_cat,
      member_count: first.member_count,
    }
    const groupEvents = (data as GroupEventRow[]).filter(r => r.event_id !== null)
    return { group, groupEvents }
  } catch (e) {
    console.error('getGroupByInviteCode exception:', e)
    return null
  }
}

export async function getGroupVoteSummary(groupId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('group_event_vote_summary')
      .select('*')
      .eq('group_id', groupId)
    if (error) return []
    return (data ?? []) as VoteSummary[]
  } catch { return [] }
}

// ─────────────────────────────────────────
// DASHBOARD / ORGANIZER ANALYTICS
// ─────────────────────────────────────────

export async function getOrganizerStats() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('organizer_event_stats')
      .select('*')
      .eq('organizer_id', user.id)
      .order('starts_at', { ascending: true })
    if (error) {
      console.error('getOrganizerStats error:', error.message)
      return []
    }
    return (data ?? []) as OrganizerEventStat[]
  } catch (e) {
    console.error('getOrganizerStats exception:', e)
    return []
  }
}

// ─────────────────────────────────────────
// SERVER ACTIONS
// ─────────────────────────────────────────

export async function toggleFavorite(eventId: string): Promise<boolean> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: existing } = await supabase
    .from('favorites')
    .select('event_id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()
  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('event_id', eventId)
    return false
  } else {
    await supabase.from('favorites').insert({ user_id: user.id, event_id: eventId })
    return true
  }
}

export async function toggleRsvp(eventId: string): Promise<string | null> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: existing } = await supabase
    .from('rsvps')
    .select('status')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()
  if (existing) {
    await supabase.from('rsvps').delete().eq('user_id', user.id).eq('event_id', eventId)
    return null
  } else {
    await supabase.from('rsvps').upsert({ user_id: user.id, event_id: eventId, status: 'attending' })
    return 'attending'
  }
}

export async function recordView(
  eventId: string,
  sessionId: string,
  referrer = 'direct'
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.rpc('record_event_view', {
      p_event_id: eventId,
      p_user_id: user?.id ?? null,
      p_session_id: sessionId,
      p_referrer: referrer,
    })
  } catch (e) {
    console.error('recordView exception:', e)
  }
export async function getPublishedEventCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
    return count ?? 0
  } catch {
    return 0
  }
}
