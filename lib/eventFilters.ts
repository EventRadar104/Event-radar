/**
 * Shared "upcoming or ongoing" filter for direct Supabase-js queries against
 * events_with_details (queries that go through the search_events() RPC get
 * the equivalent logic from the SQL function instead).
 *
 * An event still belongs in default views when its end_time hasn't passed
 * yet, or — for events with no end_time recorded — when its start_time
 * hasn't passed yet. Pass the result to `.or()`.
 */
export function upcomingOrOngoing(from: string = new Date().toISOString()): string {
  return `ends_at.gte.${from},and(ends_at.is.null,starts_at.gte.${from})`
}
