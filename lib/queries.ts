import { createClient } from '@/lib/supabase/server'
import type {
  EventWithDetails,
  GroupEventWithDetails,
  GroupMemberWithProfile,
  GroupWithCounts,
  OrganizerEventStat,
  SearchParams,
} from '@/lib/types'

// ─────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────

export async function searchEvents(params: SearchParams = {}) {
  try {
    const supabase = await createClient()
    const page = parseInt(params.page || '1', 10)
    const { data, error } = await supabase.rpc('search_events', {
      query_text:    params.q    || null,
      filter_city:   params.city || null,
      filter_slug:   params.cat  || null,
      from_date:     params.from || new Date().toISOString(),
      to_date:       params.to   || null,
      only_free:     params.free === 'true',
      result_limit:  50,
      result_offset: (page - 1) * 50,
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

export async function getUserGroups(userId: string): Promise<GroupWithCounts[]> {
  try {
    const supabase = await createClient()

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)

    const groupIds = (memberships ?? []).map(m => m.group_id)
    if (groupIds.length === 0) return []

    const [groupsRes, membersRes, eventsRes] = await Promise.all([
      supabase.from('groups').select('*').in('id', groupIds).order('created_at', { ascending: false }),
      supabase.from('group_members').select('group_id').in('group_id', groupIds),
      supabase.from('group_events').select('group_id').in('group_id', groupIds),
    ])

    const memberCountMap: Record<string, number> = {}
    const eventCountMap: Record<string, number> = {}
    for (const m of membersRes.data ?? []) memberCountMap[m.group_id] = (memberCountMap[m.group_id] ?? 0) + 1
    for (const e of eventsRes.data ?? []) eventCountMap[e.group_id] = (eventCountMap[e.group_id] ?? 0) + 1

    return (groupsRes.data ?? []).map(g => ({
      ...g,
      member_count: memberCountMap[g.id] ?? 0,
      event_count: eventCountMap[g.id] ?? 0,
    })) as GroupWithCounts[]
  } catch (e) {
    console.error('getUserGroups exception:', e)
    return []
  }
}

export async function getGroupById(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  } catch { return null }
}

export async function getGroupPublicInfo(inviteCode: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_group_public_info', { p_invite_code: inviteCode })
    if (error || !data || data.length === 0) return null
    return data[0] as { id: string; name: string; cover_image_url: string | null; member_count: number }
  } catch (e) {
    console.error('getGroupPublicInfo exception:', e)
    return null
  }
}

export async function getGroupEventsWithDetails(groupId: string, userId: string): Promise<GroupEventWithDetails[]> {
  try {
    const supabase = await createClient()

    const [groupEventsRes, votesRes] = await Promise.all([
      supabase.from('group_events').select('group_id, event_id, added_by, added_at').eq('group_id', groupId),
      supabase.from('group_votes').select('event_id, user_id, vote').eq('group_id', groupId),
    ])

    const groupEvents = groupEventsRes.data ?? []
    const eventIds = groupEvents.map(ge => ge.event_id)
    if (eventIds.length === 0) return []

    const { data: eventDetails } = await supabase
      .from('events_with_details')
      .select('id, title, slug, starts_at, cover_image_url, venue_name, venue_city')
      .in('id', eventIds)

    const eventMap: Record<string, typeof eventDetails extends (infer T)[] | null ? T : never> = {}
    for (const e of eventDetails ?? []) eventMap[e.id] = e

    const voteMap: Record<string, { up: number; down: number; myVote: 1 | -1 | null }> = {}
    for (const v of votesRes.data ?? []) {
      if (!voteMap[v.event_id]) voteMap[v.event_id] = { up: 0, down: 0, myVote: null }
      if (v.vote === 1) voteMap[v.event_id].up++
      if (v.vote === -1) voteMap[v.event_id].down++
      if (v.user_id === userId) voteMap[v.event_id].myVote = v.vote as 1 | -1
    }

    return groupEvents.map(ge => {
      const ev = eventMap[ge.event_id]
      const votes = voteMap[ge.event_id] ?? { up: 0, down: 0, myVote: null }
      return {
        group_id: ge.group_id,
        event_id: ge.event_id,
        added_by: ge.added_by,
        added_at: ge.added_at,
        event_title: ev?.title ?? '',
        event_slug: ev?.slug ?? null,
        event_starts_at: ev?.starts_at ?? '',
        event_cover_image_url: ev?.cover_image_url ?? null,
        venue_name: ev?.venue_name ?? null,
        venue_city: ev?.venue_city ?? null,
        votes_up: votes.up,
        votes_down: votes.down,
        net_score: votes.up - votes.down,
        my_vote: votes.myVote,
      }
    }).sort((a, b) => b.net_score - a.net_score)
  } catch (e) {
    console.error('getGroupEventsWithDetails exception:', e)
    return []
  }
}

export async function getGroupMembersWithProfiles(groupId: string): Promise<GroupMemberWithProfile[]> {
  try {
    const supabase = await createClient()
    const { data: members } = await supabase
      .from('group_members')
      .select('group_id, user_id, joined_at')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (!members || members.length === 0) return []

    const userIds = members.map(m => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
    for (const p of profiles ?? []) profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }

    return members.map(m => ({
      ...m,
      display_name: profileMap[m.user_id]?.display_name ?? null,
      avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
    }))
  } catch (e) {
    console.error('getGroupMembersWithProfiles exception:', e)
    return []
  }
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

// ─────────────────────────────────────────
// HOMEPAGE SECTIONS
// ─────────────────────────────────────────

export async function getFeaturedEvent() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .gt('starts_at', new Date().toISOString())
      .not('cover_image_url', 'is', null)
      .order('price_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data as EventWithDetails | null
  } catch {
    return null
  }
}

export async function getHotEvents(limit = 10, page = 1) {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1)
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}

export async function getWeekendEvents(limit = 10, page = 1) {
  const now = new Date()
  const day = now.getDay()
  const daysToSat = day === 6 ? 0 : 6 - day
  const sat = new Date(now)
  sat.setDate(now.getDate() + daysToSat)
  sat.setHours(0, 0, 0, 0)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  sun.setHours(23, 59, 59, 999)
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .gte('starts_at', sat.toISOString())
      .lte('starts_at', sun.toISOString())
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1)
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}

export async function getFreeEvents(limit = 10) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .eq('is_free', true)
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(limit)
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}
export async function getEventsByIds(ids: string[]): Promise<EventWithDetails[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .in('id', ids)
      .eq('status', 'published')
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}

export async function getDiscoverEvents(limit = 50, offset = 0) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1)
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}
