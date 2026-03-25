'use client'

import { useState } from 'react'

export function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = `https://${url}`
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={copy}
      style={{
        background: 'rgba(255,255,255,.15)',
        color: '#fff', border: 'none',
        borderRadius: 6, padding: '5px 12px',
        fontSize: 12, cursor: 'pointer', flexShrink: 0,
        transition: 'background .15s',
      }}
    >
      {copied ? '✓ Copied!' : 'Copy link'}
    </button>
  )
}
