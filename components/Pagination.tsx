import Link from 'next/link'

interface Props {
  currentPage: number
  hasMore: boolean
  baseHref: string
}

export function Pagination({ currentPage, hasMore, baseHref }: Props) {
  const sep = baseHref.includes('?') ? '&' : '?'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '32px 0'
    }}>
      {currentPage > 1 && (
        <Link
          href={`${baseHref}${sep}page=${currentPage - 1}`}
          style={{
            padding: '9px 20px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            color: 'var(--ink)',
            background: 'var(--white)',
          }}
        >
          ← Forrige
        </Link>
      )}
      <span style={{ fontSize: 13, color: 'var(--ink3)' }}>
        Side {currentPage}
      </span>
      {hasMore && (
        <Link
          href={`${baseHref}${sep}page=${currentPage + 1}`}
          style={{
            padding: '9px 20px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            color: 'var(--ink)',
            background: 'var(--white)',
          }}
        >
          Neste →
        </Link>
      )}
    </div>
  )
}
