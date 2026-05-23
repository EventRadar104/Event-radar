function SkeletonCard() {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--white)' }}>
      <div style={{ height: 160, background: 'var(--stone)' }} />
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: '75%', height: 15, borderRadius: 6, background: 'var(--stone)' }} />
        <div style={{ width: '50%', height: 12, borderRadius: 6, background: 'var(--stone)' }} />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px 60px' }}>
      {/* Search bar */}
      <div style={{ height: 44, borderRadius: 24, background: 'var(--stone)', marginBottom: 20 }} />
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[80, 100, 70, 90, 80].map((w, i) => (
          <div key={i} style={{ width: w, height: 32, borderRadius: 20, background: 'var(--stone)' }} />
        ))}
      </div>
      {/* Event grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
