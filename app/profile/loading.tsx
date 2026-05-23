export default function Loading() {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 40px' }}>
      {/* Profile card */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '24px 20px', marginBottom: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--stone)' }} />
        <div style={{ width: 140, height: 16, borderRadius: 6, background: 'var(--stone)' }} />
        <div style={{ width: 190, height: 13, borderRadius: 6, background: 'var(--stone)' }} />
      </div>
      {/* Role toggle placeholder */}
      <div style={{
        height: 44, borderRadius: 12, background: 'var(--stone)', marginBottom: 20,
      }} />
      {/* Content rows */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {[60, 80, 50].map((w, i) => (
          <div key={i} style={{ width: `${w}%`, height: 14, borderRadius: 6, background: 'var(--stone)' }} />
        ))}
      </div>
    </div>
  )
}
