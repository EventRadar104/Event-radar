import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignInForm } from './SignInForm'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ redirect?: string }>
}

export const metadata = {
  title: 'Sign in — Event Radar',
}

export default async function SignInPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sp = await searchParams
  const redirectTo = sp.redirect ?? '/dashboard'

  // Already signed in
  if (user) redirect(redirectTo)

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'var(--white)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--ink3)', marginBottom:32, textDecoration:'none' }}>
          ← Back
        </Link>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:'var(--font-serif)', fontSize:24, marginBottom:40 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 14 14" fill="none" width={18} height={18}>
              <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.2" fillOpacity={0} opacity=".4"/>
              <circle cx="7" cy="7" r="3.5" stroke="white" strokeWidth="1.2" fillOpacity={0} opacity=".7"/>
              <circle cx="7" cy="7" r="1.5" fill="white"/>
            </svg>
          </div>
          Event Radar
        </div>

        <h2 style={{ fontSize:28, marginBottom:10 }}>Welcome back</h2>
        <p style={{ fontSize:14, color:'var(--ink3)', marginBottom:36, lineHeight:1.6 }}>
          Sign in to save events, follow organisers and post your own events across Norway.
        </p>

        <SignInForm redirectTo={redirectTo} />

        <p style={{ fontSize:12, color:'var(--ink4)', lineHeight:1.6, marginTop:20 }}>
          By continuing you agree to Event Radar's{' '}
          <Link href="/terms" style={{ color:'var(--ink3)', textDecoration:'underline' }}>Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" style={{ color:'var(--ink3)', textDecoration:'underline' }}>Privacy Policy</Link>.
          <br /><br />
          No account?{' '}
          <Link href="/sign-up" style={{ color:'var(--ink3)', textDecoration:'underline' }}>Sign up free →</Link>
        </p>
      </div>
    </div>
  )
}
