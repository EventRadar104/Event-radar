'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { acceptAll, declineAll, getConsent, initConsentedScripts } from '@/lib/consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Re-activate scripts for returning visitors who already consented
    initConsentedScripts()
    // Only show banner if user hasn't chosen yet
    if (getConsent() === null) setVisible(true)
  }, [])

  async function saveConsentToSupabase(value: 'accepted' | 'declined') {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ cookie_consent: value }).eq('id', user.id)
    }
  }

  function handleAccept() {
    acceptAll()
    setVisible(false)
    saveConsentToSupabase('accepted')
  }

  function handleDecline() {
    declineAll()
    setVisible(false)
    saveConsentToSupabase('declined')
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 700,
        background: 'var(--white)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,.10)',
        padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <p style={{
          fontSize: 14, color: 'var(--ink2)', lineHeight: 1.55,
          margin: '0 0 14px',
        }}>
          We use cookies to improve your experience and serve relevant ads.{' '}
          <Link
            href="/privacy"
            style={{ color: 'var(--green)', textDecoration: 'underline' }}
          >
            See our Privacy Policy
          </Link>
          .
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleAccept}
            style={{
              flex: 1,
              padding: '11px 0',
              background: 'var(--green)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Accept all
          </button>
          <button
            onClick={handleDecline}
            style={{
              flex: 1,
              padding: '11px 0',
              background: 'none',
              color: 'var(--ink2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
