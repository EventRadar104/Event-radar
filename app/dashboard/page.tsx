import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrganizerStats } from '@/lib/queries'

export const metadata = {
  title: 'Dashboard — Event Radar',
}

const NAV_ITEMS = [
  { id: 'overview',  icon: '📊', label: 'Dashboard' },
  { id: 'events',    icon: '📅', label: 'My events' },
  { id: 'views',     icon: '👁',  label: 'Views & reach' },
  { id: 'saves',     icon: '🎟',  label: 'Interest & saves' },
  { id: 'profile',   icon: '👤', label: 'Profile' },
  { id: 'settings',  icon: '⚙',  label: 'Settings' },
]

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?redirect=/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Ensure organizer role — upgrade if not set
  if (profile && profile.role === 'attendee') {
    await supabase.from('profiles').update({ role: 'organizer' }).eq('id', user.id)
  }

  const stats = await getOrganizerStats()
  const sp = await searchParams
  const activeTab = sp.tab ?? 'overview'

  const totalViews   = stats.reduce((s, e) => s + Number(e.views_30d), 0)
  const totalSaves   = stats.reduce((s, e) => s + Number(e.save_count), 0)
  const totalAttend  = stats.reduce((s, e) => s + Number(e.rsvp_attending), 0)
  const activeEvents = stats.filter(e => e.status === 'published').length

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'there'

  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - 60px)' }}>

      {/* ── SIDEBAR ────────────────────────── */}
      <div style={{
        width: 230, flexShrink: 0, background: 'var(--white)',
        borderRight: '1px solid var(--border)', padding: '24px 12px',
        display: 'flex', flexDirection: 'column', gap: 2,
        position: 'sticky', top: 60, height: 'calc(100vh - 60px)', overflowY: 'auto',
      }}>
        <div style={{ fontSize:10, fontWeight:600, color:'var(--ink4)', textTransform:'uppercase', letterSpacing:'.08em', padding:'6px 12px 4px', marginTop:12 }}>
          Overview
        </div>
        {NAV_ITEMS.slice(0, 3).map(item => (
          <SidebarLink key={item.id} {...item} active={activeTab === item.id} />
        ))}
        <div style={{ fontSize:10, fontWeight:600, color:'var(--ink4)', textTransform:'uppercase', letterSpacing:'.08em', padding:'6px 12px 4px', marginTop:12 }}>
          Insights
        </div>
        {NAV_ITEMS.slice(3, 5).map(item => (
          <SidebarLink key={item.id} {...item} active={activeTab === item.id} />
        ))}
        <div style={{ fontSize:10, fontWeight:600, color:'var(--ink4)', textTransform:'uppercase', letterSpacing:'.08em', padding:'6px 12px 4px', marginTop:12 }}>
          Account
        </div>
        {NAV_ITEMS.slice(5).map(item => (
          <SidebarLink key={item.id} {...item} active={activeTab === item.id} />
        ))}
        <Link href="/" style={{
          display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
          borderRadius:8, fontSize:14, color:'var(--ink3)', marginTop:'auto', textDecoration:'none',
        }}>
          <span>←</span> Back to site
        </Link>
      </div>

      {/* ── MAIN CONTENT ───────────────────── */}
      <div style={{ flex:1, padding:32, background:'var(--bg)', overflowY:'auto' }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:28, marginBottom:4 }}>Good morning, {displayName}</h2>
              <p style={{ fontSize:14, color:'var(--ink3)' }}>Here's how your events are performing.</p>
            </div>

            {/* Stats grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
              <StatCard label="Views (30d)"     value={totalViews.toLocaleString('nb-NO')}  trend="↑ 14% this week" />
              <StatCard label="Event saves"     value={totalSaves.toLocaleString('nb-NO')}  trend="↑ 8% this week" />
              <StatCard label="Attending"       value={totalAttend.toLocaleString('nb-NO')} trend={`People clicked "I'm attending"`} trendMuted />
              <StatCard label="Active events"   value={String(activeEvents)}                trend={`${stats.length} total`} trendMuted />
            </div>

            <EventTable stats={stats} />
          </>
        )}

        {/* MY EVENTS */}
        {activeTab === 'events' && (
          <>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:28, marginBottom:4 }}>My events</h2>
              <p style={{ fontSize:14, color:'var(--ink3)' }}>Manage all your events.</p>
            </div>
            <EventTable stats={stats} showSaves />
          </>
        )}

        {/* VIEWS & REACH */}
        {activeTab === 'views' && (
          <>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:28, marginBottom:4 }}>Views & reach</h2>
              <p style={{ fontSize:14, color:'var(--ink3)' }}>How people are finding your events.</p>
            </div>
            <InsightCard title="Views by event (last 30 days)">
              {stats.map(e => (
                <BarRow key={e.event_id} label={e.title} value={Number(e.views_30d)} max={Math.max(...stats.map(s => Number(s.views_30d)), 1)} />
              ))}
            </InsightCard>
            <InsightCard title="Traffic sources">
              {stats.length > 0 && (() => {
                const totSearch = stats.reduce((s, e) => s + Number(e.views_from_search), 0)
                const totShare  = stats.reduce((s, e) => s + Number(e.views_from_share), 0)
                const totBrowse = stats.reduce((s, e) => s + Number(e.views_from_browse), 0)
                const totMap    = stats.reduce((s, e) => s + Number(e.views_from_map), 0)
                const total     = totSearch + totShare + totBrowse + totMap || 1
                return <>
                  <BarRow label="Event Radar search" value={Math.round(totSearch / total * 100)} max={100} suffix="%" />
                  <BarRow label="Direct link / share" value={Math.round(totShare  / total * 100)} max={100} suffix="%" />
                  <BarRow label="City browse"         value={Math.round(totBrowse / total * 100)} max={100} suffix="%" />
                  <BarRow label="Map"                 value={Math.round(totMap    / total * 100)} max={100} suffix="%" />
                </>
              })()}
            </InsightCard>
          </>
        )}

        {/* SAVES & INTEREST */}
        {activeTab === 'saves' && (
          <>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:28, marginBottom:4 }}>Interest & saves</h2>
              <p style={{ fontSize:14, color:'var(--ink3)' }}>
                How many people have saved or clicked "I'm attending". Note: actual ticket sales are tracked by your ticketing provider.
              </p>
            </div>
            <InsightCard title="Saves & attending">
              {stats.map(e => <>
                <BarRow key={`${e.event_id}-saves`}   label={`${e.title} — saves`}     value={Number(e.save_count)}    max={Math.max(...stats.map(s => Number(s.save_count)), 1)} />
                <BarRow key={`${e.event_id}-attend`}  label={`${e.title} — attending`} value={Number(e.rsvp_attending)} max={Math.max(...stats.map(s => Number(s.save_count)), 1)} />
              </>)}
            </InsightCard>
            <div style={{ background:'#FEF3C7', border:'1px solid #fcd34d', borderRadius:10, padding:'14px 16px', fontSize:13, color:'#92400E' }}>
              💡 <strong>Tip:</strong> Actual ticket revenue is handled by your ticketing provider. Event Radar shows you interest and engagement.
            </div>
          </>
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:28, marginBottom:4 }}>Your profile</h2>
              <p style={{ fontSize:14, color:'var(--ink3)' }}>How people see you on Event Radar.</p>
            </div>
            <ProfileForm profile={profile} />
          </>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:28, marginBottom:4 }}>Settings</h2>
              <p style={{ fontSize:14, color:'var(--ink3)' }}>Manage your account and preferences.</p>
            </div>
            <SettingsSection title="Notifications">
              <SettingRow label="Event saves"    sub="Get notified when someone saves your event"   defaultOn />
              <SettingRow label="New attendees"  sub="Get notified when someone marks attending"     defaultOn={false} />
              <SettingRow label="Weekly summary" sub="Weekly digest of your event performance"       defaultOn />
            </SettingsSection>
            <SettingsSection title="Account">
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:500 }}>Email</div>
                  <div style={{ fontSize:12, color:'var(--ink3)', marginTop:2 }}>{user.email}</div>
                </div>
              </div>
            </SettingsSection>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function SidebarLink({ id, icon, label, active }: { id: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={`/dashboard?tab=${id}`} style={{
      display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
      borderRadius:8, fontSize:14,
      color: active ? 'var(--ink)' : 'var(--ink2)',
      background: active ? 'var(--stone)' : 'none',
      fontWeight: active ? 500 : 400,
      textDecoration:'none', transition:'all .15s',
    }}>
      <span>{icon}</span> {label}
    </Link>
  )
}

function StatCard({ label, value, trend, trendMuted }: { label: string; value: string; trend: string; trendMuted?: boolean }) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
      <div style={{ fontSize:12, fontWeight:500, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:28, fontFamily:'var(--font-serif)', marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:12, color: trendMuted ? 'var(--ink3)' : 'var(--green)' }}>{trend}</div>
    </div>
  )
}

function EventTable({ stats, showSaves }: { stats: Awaited<ReturnType<typeof getOrganizerStats>>; showSaves?: boolean }) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border2)' }}>
        <h3 style={{ fontSize:16, fontWeight:500 }}>Your events</h3>
        <Link href="/events/new" style={{ background:'var(--green)', color:'#fff', border:'none', borderRadius:40, padding:'7px 16px', fontSize:13, fontWeight:500, textDecoration:'none' }}>
          + New event
        </Link>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left', padding:'10px 20px', fontSize:11, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em', background:'var(--stone)', borderBottom:'1px solid var(--border)' }}>Event</th>
            <th style={{ textAlign:'left', padding:'10px 20px', fontSize:11, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em', background:'var(--stone)', borderBottom:'1px solid var(--border)' }}>Date</th>
            {showSaves && <th style={{ textAlign:'left', padding:'10px 20px', fontSize:11, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em', background:'var(--stone)', borderBottom:'1px solid var(--border)' }}>Saves</th>}
            <th style={{ textAlign:'left', padding:'10px 20px', fontSize:11, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em', background:'var(--stone)', borderBottom:'1px solid var(--border)' }}>Views</th>
            <th style={{ textAlign:'left', padding:'10px 20px', fontSize:11, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em', background:'var(--stone)', borderBottom:'1px solid var(--border)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {stats.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding:'32px 20px', textAlign:'center', color:'var(--ink3)', fontSize:14 }}>
                No events yet.{' '}
                <Link href="/events/new" style={{ color:'var(--green)', fontWeight:500 }}>Create your first event →</Link>
              </td>
            </tr>
          ) : stats.map(e => (
            <tr key={e.event_id} style={{ cursor:'pointer', transition:'background .1s' }}
            >
              <td style={{ padding:'14px 20px', fontSize:13, color:'var(--ink2)', borderBottom:'1px solid var(--border2)' }}>
                <strong>{e.title}</strong>
              </td>
              <td style={{ padding:'14px 20px', fontSize:13, color:'var(--ink2)', borderBottom:'1px solid var(--border2)' }}>
                {new Date(e.starts_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
              </td>
              {showSaves && (
                <td style={{ padding:'14px 20px', fontSize:13, color:'var(--ink2)', borderBottom:'1px solid var(--border2)' }}>
                  {Number(e.save_count).toLocaleString('nb-NO')}
                </td>
              )}
              <td style={{ padding:'14px 20px', fontSize:13, color:'var(--ink2)', borderBottom:'1px solid var(--border2)' }}>
                {Number(e.views_30d).toLocaleString('nb-NO')}
              </td>
              <td style={{ padding:'14px 20px', fontSize:13, borderBottom:'1px solid var(--border2)' }}>
                <span style={{
                  display:'inline-flex', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500,
                  background: e.status === 'published' ? 'var(--green-lt)' : '#FEF3C7',
                  color:      e.status === 'published' ? 'var(--green)'    : '#92400E',
                }}>
                  {e.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InsightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:20, marginBottom:16 }}>
      <h3 style={{ fontSize:16, fontWeight:500, marginBottom:16 }}>{title}</h3>
      {children}
    </div>
  )
}

function BarRow({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
      <span style={{ fontSize:13, color:'var(--ink2)', width:200, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:8, background:'var(--stone)', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', background:'var(--green)', borderRadius:4, width:`${pct}%`, transition:'width .4s ease' }} />
      </div>
      <span style={{ fontSize:13, fontWeight:500, color:'var(--ink)', width:60, textAlign:'right', flexShrink:0 }}>
        {value.toLocaleString('nb-NO')}{suffix}
      </span>
    </div>
  )
}

function ProfileForm({ profile }: { profile: Record<string, unknown> | null }) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:16, padding:28, marginBottom:20 }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--green-lt)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:600, color:'var(--green)', marginBottom:16 }}>
        {String(profile?.display_name ?? 'U').slice(0, 1).toUpperCase()}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div>
          <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Display name</label>
          <input defaultValue={String(profile?.display_name ?? '')} style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Location</label>
          <input defaultValue={String(profile?.location ?? '')} placeholder="Oslo, Norway" style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
        </div>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Bio</label>
        <textarea defaultValue={String(profile?.bio ?? '')} style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, minHeight:70, resize:'vertical' }} />
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Website</label>
        <input defaultValue={String(profile?.website_url ?? '')} type="url" placeholder="https://yourwebsite.com" style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
      </div>
      <button style={{ padding:'11px 24px', background:'var(--green)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:500, cursor:'pointer' }}>
        Save changes
      </button>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border2)', fontSize:12, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, sub, defaultOn }: { label: string; sub: string; defaultOn: boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border2)' }}>
      <div>
        <div style={{ fontSize:14, fontWeight:500 }}>{label}</div>
        <div style={{ fontSize:12, color:'var(--ink3)', marginTop:2 }}>{sub}</div>
      </div>
      {/* Toggle is client-side only in dashboard — keep simple */}
      <div style={{
        width:42, height:24, borderRadius:12,
        background: defaultOn ? 'var(--green)' : 'var(--border)',
        position:'relative', cursor:'pointer', flexShrink:0,
      }}>
        <div style={{
          position:'absolute', top:3,
          [defaultOn ? 'right' : 'left']: 3,
          width:18, height:18, borderRadius:'50%', background:'#fff',
        }} />
      </div>
    </div>
  )
}
