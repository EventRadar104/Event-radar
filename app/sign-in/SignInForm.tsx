'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
  }

  async function signInWithEmail() {
    if (!email.trim()) { setError('Please enter your email address'); return }
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (err) setError(err.message)
      else setSent(true)
    })
  }

  if (sent) {
    return (
      <div style={{ background:'var(--green-lt)', border:'1px solid var(--green)', borderRadius:12, padding:'24px 20px' }}>
        <div style={{ fontSize:24, marginBottom:10 }}>📬</div>
        <div style={{ fontSize:15, fontWeight:500, color:'var(--green)', marginBottom:6 }}>Check your inbox</div>
        <div style={{ fontSize:14, color:'var(--ink2)' }}>
          We sent a magic link to <strong>{email}</strong>.<br />Click it to sign in — no password needed.
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Google */}
      <button
        onClick={signInWithGoogle}
        disabled={isPending}
        style={{
          width: '100%', background: '#fff', color: 'var(--ink)',
          border: '1.5px solid var(--border)', borderRadius: 12,
          padding: '14px 20px', fontSize: 15, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, cursor: 'pointer', transition: 'border-color .15s', marginBottom: 12,
        }}
        onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--ink)')}
        onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <GoogleLogo />
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
        <div style={{ flex:1, height:1, background:'var(--border)' }} />
        <span style={{ fontSize:12, color:'var(--ink4)' }}>or</span>
        <div style={{ flex:1, height:1, background:'var(--border)' }} />
      </div>

      {/* Magic link */}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email address"
        onKeyDown={e => e.key === 'Enter' && signInWithEmail()}
        style={{
          width: '100%', padding: '13px 16px',
          border: '1.5px solid var(--border)', borderRadius: 12,
          fontSize: 14, outline: 'none', marginBottom: 10,
          transition: 'border-color .15s',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--ink)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />

      {error && <p style={{ fontSize:13, color:'#c0392b', marginBottom:8, textAlign:'left' }}>{error}</p>}

      <button
        onClick={signInWithEmail}
        disabled={isPending}
        style={{
          width: '100%', background: isPending ? 'var(--border)' : 'var(--ink)',
          color: '#fff', border: 'none', borderRadius: 12,
          padding: 14, fontSize: 15, fontWeight: 500,
          cursor: isPending ? 'default' : 'pointer', marginBottom: 20,
          transition: 'opacity .15s',
        }}
      >
        {isPending ? 'Sending…' : 'Send magic link'}
      </button>
    </>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
