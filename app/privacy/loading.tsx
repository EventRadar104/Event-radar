export default function Loading() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Title */}
      <div style={{ width: 180, height: 30, borderRadius: 8, background: 'var(--stone)', marginBottom: 12 }} />
      <div style={{ width: 140, height: 13, borderRadius: 6, background: 'var(--stone)', marginBottom: 36 }} />
      {/* Sections */}
      {[1, 2, 3].map(section => (
        <div key={section} style={{ marginBottom: 32 }}>
          <div style={{ width: '40%', height: 18, borderRadius: 6, background: 'var(--stone)', marginBottom: 14 }} />
          {[90, 100, 70, 85].map((w, i) => (
            <div key={i} style={{ width: `${w}%`, height: 14, borderRadius: 6, background: 'var(--stone)', marginBottom: 8 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
