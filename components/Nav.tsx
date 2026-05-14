import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NavSearch } from './NavSearch'
import { NavPillLink } from './NavPillLink'

export async function Nav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      background: 'rgba(250,250,248,.94)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-serif)', fontSize:20, flexShrink:0, textDecoration:'none', color:'var(--ink)' }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <RadarIcon />
        </div>
        Event Radar
      </Link>

      {/* Search — hidden on mobile */}
      <div className="nav-hide-mobile" style={{ display:'flex', flex:1 }}>
        <NavSearch />
      </div>

      {/* Right side */}
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
        {/* Secondary links — hidden on mobile */}
        <div className="nav-hide-mobile" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <NavPillLink href="/trip">Plan a trip</NavPillLink>
          {user && <NavPillLink href="/saved"><span>♡</span> Saved</NavPillLink>}
          {user && <NavPillLink href="/groups">Groups</NavPillLink>}
        </div>

        {/* Post event — always visible */}
        <Link href="/events/new" style={{ background:'var(--ink)', color:'#fff', border:'none', borderRadius:40, padding:'8px 14px', fontSize:13, fontWeight:500, whiteSpace:'nowrap', textDecoration:'none' }}>
          + Post event
        </Link>

        {/* Avatar / Sign in — always visible */}
        {user ? (
          <Link href="/dashboard" style={{ width:32, height:32, borderRadius:'50%', background:'var(--green-lt)', border:'1.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--green)', textDecoration:'none', flexShrink:0 }}>
            <svg viewBox="0 0 16 16" fill="none" width={16} height={16}><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        ) : (
          <Link href="/sign-in" style={{ fontSize:14, color:'var(--ink2)', padding:'6px 10px', borderRadius:8, whiteSpace:'nowrap', textDecoration:'none' }}>
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}

function RadarIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" width={14} height={14}>
      <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.2" fillOpacity="0" opacity=".4"/>
      <circle cx="7" cy="7" r="3.5" stroke="white" strokeWidth="1.2" fillOpacity="0" opacity=".7"/>
      <circle cx="7" cy="7" r="1.5" fill="white"/>
    </svg>
  )
}
