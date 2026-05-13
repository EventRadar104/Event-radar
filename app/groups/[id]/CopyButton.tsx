'use client'

import { useState } from 'react'

export function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? 'var(--green)' : 'rgba(255,255,255,.15)',
        border: '1px solid rgba(255,255,255,.2)',
        borderRadius: 8, padding: '6px 14px',
        fontSize: 12, fontWeight: 500,
        color: '#fff', cursor: 'pointer',
        whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'background .2s',
      }}
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
