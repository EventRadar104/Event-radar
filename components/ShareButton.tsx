'use client'

export function ShareButton({ icon, label, style: extraStyle }: { icon: string; label: string; style?: React.CSSProperties }) {
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        border: '1px solid var(--border)',
        borderRadius: 20,
        fontSize: 13,
        cursor: 'pointer',
        background: 'none',
        transition: 'all .15s',
        ...extraStyle,
      }}
      onClick={() => {
        if (typeof navigator !== 'undefined' && navigator.share) {
          navigator.share({ title: document.title, url: window.location.href }).catch(() => {})
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href)
        }
      }}
    >
      {icon} {label}
    </button>
  )
}
