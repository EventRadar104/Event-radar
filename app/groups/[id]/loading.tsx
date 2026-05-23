export default function Loading() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 60px' }}>
      {/* Back button */}
      <div style={{ width: 60, height: 28, borderRadius: 8, background: 'var(--stone)', marginBottom: 16 }} />
      {/* Group header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--stone)', flexShrink: 0 }} />
        <div>
          <div style={{ width: 160, height: 18, borderRadius: 6, background: 'var(--stone)', marginBottom: 8 }} />
          <div style={{ width: 100, height: 12, borderRadius: 6, background: 'var(--stone)' }} />
        </div>
      </div>
      {/* Event rows */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          display: 'flex', gap: 12, marginBottom: 10,
          padding: '12px 14px', borderRadius: 14,
          border: '1px solid var(--border)', background: 'var(--white)',
        }}>
          <div style={{ width: 60, height: 60, borderRadius: 10, background: 'var(--stone)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <div style={{ width: '70%', height: 14, borderRadius: 6, background: 'var(--stone)' }} />
            <div style={{ width: '45%', height: 12, borderRadius: 6, background: 'var(--stone)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
