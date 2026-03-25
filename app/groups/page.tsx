import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateGroupForm } from './CreateGroupForm'
import Link from 'next/link'

export const metadata = {
  title: 'Group Planner — Event Radar',
  description: 'Create a group, add events, and let everyone vote. No account needed for friends.',
}

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load the user's existing groups if logged in
  let myGroups: { id: string; name: string; invite_code: string; created_at: string }[] = []
  if (user) {
    const { data } = await supabase
      .from('groups')
      .select('id, name, invite_code, created_at')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    myGroups = data ?? []
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 100px' }}>

      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:8 }}>
        <h1 style={{ fontSize: 32 }}>Group planner</h1>
      </div>
      <p style={{ fontSize:14, color:'var(--ink3)', marginBottom:32 }}>
        Create a group, set a scope, add events and let everyone vote — no account needed for friends.
      </p>

      {/* Existing groups */}
      {myGroups.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
            Your groups
          </div>
          {myGroups.map(g => (
            <Link
              key={g.id}
              href={`/groups/${g.invite_code}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 16, background: 'var(--white)',
                border: '1px solid var(--border)', borderRadius: 12,
                marginBottom: 10, textDecoration: 'none', color: 'inherit',
                transition: 'border-color .15s',
              }}
            >
              <div style={{ width:40, height:40, borderRadius:10, background:'var(--green-lt)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                👥
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>{g.name}</div>
                <div style={{ fontSize:12, color:'var(--ink3)' }}>
                  eventrada.no/groups/{g.invite_code}
                </div>
              </div>
              <div style={{ fontSize:12, color:'var(--ink3)' }}>→</div>
            </Link>
          ))}
        </div>
      )}

      {/* Create new group form (client component — handles server action) */}
      <CreateGroupForm userId={user?.id ?? null} />

      <div style={{ textAlign:'center', padding:'16px 0', color:'var(--ink3)', fontSize:13 }}>
        Got a group link?{' '}
        <span style={{ color:'var(--ink)', fontWeight:500 }}>
          Just open it in your browser to join.
        </span>
      </div>
    </div>
  )
}
