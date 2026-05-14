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
    return data as import('./types').Group
  } catch { return null }
}

/** Used by the public /join page — reads groups by invite_code without requiring membership */
export async function getGroupPublicInfo(inviteCode: string) {
  try {
    const supabase = await createClient()

    const { data: group, error } = await supabase
      .from('groups')
      .select('id, name, cover_image_url')
      .eq('invite_code', inviteCode)
      .single()

    if (error || !group) return null

    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)

    return {
      id: group.id as string,
      name: group.name as string,
      cover_image_url: group.cover_image_url as string | null,
      member_count: count ?? 0,
    }
  } catch (e) {
    console.error('getGroupPublicInfo exception:', e)
    return null
  }
}

export async function getGroupEventsWithDetails(groupId: string, userId: string): Promise<GroupEventWithDetails[]> {
  try {
    const supabase = await createClient()

    const { data: groupEvents } = await supabase
      .from('group_events')
      .select('id, group_id, event_id, added_by, added_at')
      .eq('group_id', groupId)

    if (!groupEvents || groupEvents.length === 0) return []

    const groupEventIds = groupEvents.map(ge => ge.id)
    const eventIds = groupEvents.map(ge => ge.event_id)

    const [votesRes, eventDetailsRes] = await Promise.all([
      supabase
        .from('group_votes')
        .select('group_event_id, voter_id, direction')
        .in('group_event_id', groupEventIds),
      supabase
        .from('events_with_details')
        .select('id, title, slug, starts_at, cover_image_url, venue_name, venue_city')
        .in('id', eventIds),
    ])

    const eventMap: Record<string, { title: string; slug: string | null; starts_at: string; cover_image_url: string | null; venue_name: string | null; venue_city: string | null }> = {}
    for (const e of eventDetailsRes.data ?? []) eventMap[e.id] = e

    const voteMap: Record<string, { up: number; down: number; myVote: 'up' | 'down' | null }> = {}
    for (const v of votesRes.data ?? []) {
      if (!voteMap[v.group_event_id]) voteMap[v.group_event_id] = { up: 0, down: 0, myVote: null }
      if (v.direction === 'up') voteMap[v.group_event_id].up++
      if (v.direction === 'down') voteMap[v.group_event_id].down++
      if (v.voter_id === userId) voteMap[v.group_event_id].myVote = v.direction as 'up' | 'down'
    }

    return groupEvents.map(ge => {
      const ev = eventMap[ge.event_id]
      const votes = voteMap[ge.id] ?? { up: 0, down: 0, myVote: null }
      return {
        group_event_id: ge.id,
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
      .select('id, group_id, user_id, guest_name, joined_at')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (!members || members.length === 0) return []

    const userIds = members.map(m => m.user_id).filter(Boolean) as string[]
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : { data: [] }

    const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
    for (const p of profiles ?? []) profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }

    return members.map(m => ({
      id: m.id,
      group_id: m.group_id,
      user_id: m.user_id,
      guest_name: m.guest_name,
      joined_at: m.joined_at,
      display_name: m.user_id ? (profileMap[m.user_id]?.display_name ?? null) : m.guest_name,
      avatar_url: m.user_id ? (profileMap[m.user_id]?.avatar_url ?? null) : null,
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

export async function getTrendingEvent() {
  try {
    const supabase = await createClient()
    const { data: stats } = await supabase
      .from('organizer_event_stats')
      .select('event_id, views_total, save_count')
      .order('views_total', { ascending: false })
      .limit(21)
    if (!stats || stats.length === 0) return null
    const rankedIds = stats
      .sort((a, b) => (b.views_total + b.save_count) - (a.views_total + a.save_count))
      .map(s => s.event_id)
    for (const id of rankedIds) {
      const { data } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .gt('starts_at', new Date().toISOString())
        .not('cover_image_url', 'is', null)
        .maybeSingle()
      if (data) return data as EventWithDetails
    }
    return null
  } catch {
    return null
  }
}

export async function getHotEvents(excludeId = '', limit = 10, page = 1) {
  try {
    const supabase = await createClient()
    const offset = (page - 1) * limit
    const { data: stats } = await supabase
      .from('organizer_event_stats')
      .select('event_id, views_total, save_count')
      .order('views_total', { ascending: false })
      .limit(21)
    if (!stats || stats.length === 0) return []
    const rankedIds = stats
      .sort((a, b) => (b.views_total + b.save_count) - (a.views_total + a.save_count))
      .map(s => s.event_id)
      .filter(id => id !== excludeId)
      .slice(offset, offset + limit)
    if (rankedIds.length === 0) return []
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .in('id', rankedIds)
      .eq('status', 'published')
      .gt('starts_at', new Date().toISOString())
      .not('cover_image_url', 'is', null)
    if (!data) return []
    return rankedIds
      .map(id => (data as EventWithDetails[]).find(e => e.id === id))
      .filter((e): e is EventWithDetails => e !== undefined)
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
